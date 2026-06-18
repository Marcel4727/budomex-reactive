package com.pbs.BudomexWebApp.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pbs.BudomexWebApp.security.JwtUtils;
import com.pbs.BudomexWebApp.service.RealtimeNotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Reaktywny WebSocket handler — zastępuje STOMP/SimpMessagingTemplate
 * (Spring MVC + @EnableWebSocketMessageBroker) z wersji servletowej.
 *
 * Frontend łączy się na:
 *   ws://host/ws/orders               (panel managera/pracownika; wymaga ?token=JWT)
 *   ws://host/ws/inventory             (panel magazynu; wymaga ?token=JWT)
 *   ws://host/ws/track/{acceptanceToken} (publiczne śledzenie zamówienia, bez auth)
 *
 * Protokół jest świadomie minimalny (brak STOMP): serwer wysyła do klienta
 * tylko JSON {"type": "...", "ts": 12345} przy każdej zmianie danych —
 * sam fakt nadejścia wiadomości jest sygnałem "odśwież dane przez REST",
 * a nie nośnikiem właściwej treści. Klient nie musi wysyłać SUBSCRIBE —
 * sama ścieżka URL determinuje, na jaki topic handler subskrybuje.
 *
 * Autoryzacja: ponieważ WebSocketHandler nie przechodzi przez ten sam
 * WebFilter co normalne żądania HTTP (handshake WS ma inny cykl życia),
 * token JWT jest czytany ręcznie z parametru zapytania i walidowany tutaj
 * (zamiast przez JwtAuthenticationFilter + ReactiveSecurityContextHolder).
 */
@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler implements WebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificationWebSocketHandler.class);

    private final RealtimeNotificationService realtime;
    private final JwtUtils jwtUtils;
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        String path = session.getHandshakeInfo().getUri().getPath();
        String topic = resolveTopic(path);

        if (topic == null) {
            log.warn("Nieznana ścieżka WebSocket: {}", path);
            return session.close();
        }

        boolean requiresAuth = topic.equals("/topic/orders") || topic.equals("/topic/inventory");
        if (requiresAuth && !isAuthorized(session)) {
            log.warn("Odmowa połączenia WebSocket na {} - brak/nieprawidłowy token", topic);
            return session.close();
        }

        // Heartbeat, żeby pośredniczące proxy/load balancery nie zamykały bezczynnego połączenia.
        Flux<WebSocketMessage> heartbeat = Flux.interval(Duration.ofSeconds(25))
                .map(tick -> session.textMessage("{\"type\":\"PING\"}"));

        Flux<WebSocketMessage> events = realtime.stream(topic)
                .map(event -> {
                    try {
                        return session.textMessage(objectMapper.writeValueAsString(
                                Map.of("type", event.type(), "ts", event.ts())));
                    } catch (Exception e) {
                        log.error("Nie udało się zserializować zdarzenia WS", e);
                        return session.textMessage("{\"type\":\"ERROR\"}");
                    }
                });

        Flux<WebSocketMessage> outbound = Flux.merge(events, heartbeat);

        // Odbieramy (i ignorujemy) wiadomości od klienta - protokół jest jednostronny
        // (serwer -> klient), ale musimy konsumować input strumień, by sesja żyła.
        Mono<Void> input = session.receive().then();

        return Mono.zip(session.send(outbound).then(Mono.empty()), input)
                .then()
                .doOnSubscribe(s -> log.info("WebSocket połączony: {}", topic))
                .doFinally(signal -> log.info("WebSocket zamknięty: {} ({})", topic, signal));
    }

    /** Mapuje ścieżkę URL na nazwę topicu używaną przez RealtimeNotificationService. */
    private String resolveTopic(String path) {
        if (path.equals("/ws/orders")) return "/topic/orders";
        if (path.equals("/ws/inventory")) return "/topic/inventory";
        if (path.startsWith("/ws/track/")) {
            String acceptanceToken = path.substring("/ws/track/".length());
            return "/topic/track/" + acceptanceToken;
        }
        return null;
    }

    private boolean isAuthorized(WebSocketSession session) {
        ServerHttpRequest request = null;
        try {
            String query = session.getHandshakeInfo().getUri().getQuery();
            Map<String, String> params = UriComponentsBuilder.newInstance()
                    .query(query)
                    .build()
                    .getQueryParams()
                    .toSingleValueMap();
            String token = params.get("token");
            return token != null && jwtUtils.validateJwtToken(token);
        } catch (Exception e) {
            log.warn("Błąd podczas walidacji tokenu WebSocket: {}", e.getMessage());
            return false;
        }
    }
}