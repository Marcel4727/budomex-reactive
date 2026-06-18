package com.pbs.BudomexWebApp.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.Map;

/**
 * Rejestruje {@link NotificationWebSocketHandler} pod ścieżkami /ws/**.
 *
 * Zastępuje {@code @EnableWebSocketMessageBroker} + {@code StompEndpointRegistry}
 * z wersji servletowej (Spring MVC). WebFlux nie ma adnotacji do tego celu —
 * routing WebSocket konfiguruje się jako zwykły {@link HandlerMapping}, tak
 * jak każdy inny handler HTTP, tylko z najwyższym priorytetem (order = -1),
 * żeby uprzedzić zwykłe kontrolery REST.
 *
 * UWAGA: bean ObjectMapper jest zdefiniowany w osobnej klasie (JacksonConfig),
 * NIE tutaj — gdyby był tutaj, powstałby cykl: ta klasa potrzebuje
 * NotificationWebSocketHandler (przez konstruktor), a ten handler potrzebuje
 * ObjectMapper, który byłby zdefiniowany w tej samej klasie. Spring nie może
 * rozwiązać takiego cyklu przy tworzeniu beanów.
 */
@Configuration
@RequiredArgsConstructor
public class WebSocketRouterConfig {

    private final NotificationWebSocketHandler notificationWebSocketHandler;

    @Bean
    public HandlerMapping webSocketHandlerMapping() {
        Map<String, WebSocketHandler> map = Map.of(
                "/ws/orders", notificationWebSocketHandler,
                "/ws/inventory", notificationWebSocketHandler,
                "/ws/track/**", notificationWebSocketHandler
        );

        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(map);
        mapping.setOrder(-1);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter webSocketHandlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}