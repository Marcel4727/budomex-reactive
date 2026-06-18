package com.pbs.BudomexWebApp.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jawna definicja {@link ObjectMapper} jako bean Springa.
 *
 * Nie polegamy na auto-konfiguracji Spring Boot Jackson
 * (spring-boot-starter-json), bo w tym projekcie jackson-databind jest
 * dociągany ręcznie w build.gradle (a nie przez pełny starter web/webflux
 * w sposób, który gwarantowałby auto-konfigurację), więc bean mógłby nie
 * zostać zarejestrowany automatycznie.
 *
 * Wydzielone do osobnej klasy (nie wewnątrz WebSocketRouterConfig), żeby
 * uniknąć cyklu zależności: WebSocketRouterConfig wstrzykuje
 * NotificationWebSocketHandler, a ten z kolei wstrzykuje ObjectMapper -
 * gdyby ObjectMapper był zdefiniowany w WebSocketRouterConfig, Spring nie
 * mógłby rozwiązać takiego cyklu przy tworzeniu beanów.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}