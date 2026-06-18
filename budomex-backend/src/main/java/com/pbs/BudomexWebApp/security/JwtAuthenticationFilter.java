package com.pbs.BudomexWebApp.security;

import com.pbs.BudomexWebApp.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Reaktywny filtr JWT (zastępuje OncePerRequestFilter).
 *
 * Wzorowany na przykładzie referencyjnym ze Spring Security
 * (zob. dokumentacja "Custom WebFilter for Authentication" / przykłady
 * autorów frameworku): najpierw budujemy {@link Mono} z gotowym
 * {@code Authentication} (lub puste, jeśli auth się nie powiedzie/nie ma
 * tokenu), a {@code chain.filter(exchange)} wołamy w TYLKO JEDNYM miejscu,
 * na samym końcu łańcucha operatorów - niezależnie od tego, czy
 * uwierzytelnienie się powiodło.
 *
 * Wcześniejsza wersja (dwa niezależne wywołania chain.filter — jedno w
 * onErrorResume, jedno w switchIfEmpty) prowadziła w praktyce do
 * sporadycznego podwójnego przetworzenia tego samego żądania i błędu
 * "UnsupportedOperationException: ServerHttpResponse already committed",
 * bo Reactor mógł zasubskrybować chain.filter(exchange) więcej niż raz dla
 * tego samego exchange.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter implements WebFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String jwt = parseJwt(exchange);

        Mono<Authentication> authenticationMono;
        if (jwt == null || !jwtUtils.validateJwtToken(jwt)) {
            authenticationMono = Mono.empty();
        } else {
            String username = jwtUtils.getUserNameFromJwtToken(jwt);
            authenticationMono = userDetailsService.findByUsername(username)
                    .map(userDetails -> (Authentication) new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()))
                    .onErrorResume(e -> {
                        log.warn("Nie udało się ustawić uwierzytelnienia z JWT: {}", e.getMessage());
                        return Mono.empty();
                    });
        }

        // Jedyne, pojedyncze wywołanie chain.filter(exchange) w całej metodzie.
        // Gdy authenticationMono jest puste (brak/nieprawidłowy token, błąd
        // wyszukania użytkownika), request przechodzi dalej bez ustawionego
        // SecurityContext - decyzję o autoryzacji podejmie wtedy
        // SecurityWebFilterChain (np. zwróci 401 dla chronionych ścieżek).
        return authenticationMono
                .flatMap(authentication -> {
                    SecurityContextImpl securityContext = new SecurityContextImpl(authentication);
                    return chain.filter(exchange)
                            .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(Mono.just(securityContext)));
                })
                .switchIfEmpty(Mono.defer(() -> chain.filter(exchange)));
    }

    private String parseJwt(ServerWebExchange exchange) {
        String headerAuth = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}