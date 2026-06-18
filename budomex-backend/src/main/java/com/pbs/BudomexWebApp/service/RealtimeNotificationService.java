package com.pbs.BudomexWebApp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

/**
 * Wysyła powiadomienia real-time o zmianach danych.
 *
 * Wersja reaktywna: zamiast STOMP/SimpMessagingTemplate (Spring MVC) używamy
 * {@link Sinks.Many} jako wewnętrznej "magistrali" zdarzeń. Kontrolery
 * WebFlux (patrz {@code NotificationController} z Fazy 6) wystawiają
 * {@link #stream(String)} jako Flux po natywnym WebSocket/SSE, do którego
 * subskrybuje się frontend.
 *
 * Treść komunikatu jest celowo minimalna ("coś się zmieniło") — frontend po
 * jego odebraniu wykonuje zwykły refetch przez istniejące REST API. Dzięki temu
 * nie duplikujemy logiki/DTO, a polling pozostaje jako fallback.
 *
 * UWAGA dot. transakcji: w wersji JPA powiadomienie czekało na afterCommit
 * (TransactionSynchronizationManager, oparty na ThreadLocal). W R2DBC
 * transakcje są powiązane z Reactor Context, nie z wątkiem, więc
 * dla prostoty wysyłamy powiadomienie od razu po wykonaniu operacji
 * (best-effort, "eventual" odświeżenie UI) — to zwykły sygnał "coś się
 * zmieniło", nie nośnik danych, więc brak ścisłej zgodności z commitem
 * nie powoduje błędów logicznych.
 */
@Service
public class RealtimeNotificationService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeNotificationService.class);

    private final Sinks.Many<TopicEvent> sink = Sinks.many().multicast().onBackpressureBuffer();

    /** Zmiana w zamówieniach — panele managera, pracownika i HR. */
    public Mono<Void> notifyOrders() {
        return emit("/topic/orders", "ORDERS_CHANGED");
    }

    /** Zmiana stanu magazynu — panel magazynu. */
    public Mono<Void> notifyInventory() {
        return emit("/topic/inventory", "INVENTORY_CHANGED");
    }

    /** Zmiana konkretnego zamówienia — publiczna strona śledzenia po tokenie. */
    public Mono<Void> notifyTracking(String acceptanceToken) {
        if (acceptanceToken == null || acceptanceToken.isBlank()) {
            return Mono.empty();
        }
        return emit("/topic/track/" + acceptanceToken, "ORDER_UPDATED");
    }

    /**
     * Strumień zdarzeń dla danego topicu (lub jego podscieżek), do podłączenia
     * pod reaktywny WebSocket/SSE endpoint.
     */
    public Flux<TopicEvent> stream(String topicPrefix) {
        return sink.asFlux().filter(event -> event.topic().equals(topicPrefix) || event.topic().startsWith(topicPrefix + "/"));
    }

    private Mono<Void> emit(String topic, String type) {
        return Mono.fromRunnable(() -> {
            Sinks.EmitResult result = sink.tryEmitNext(new TopicEvent(topic, type, System.currentTimeMillis()));
            if (result.isFailure()) {
                log.warn("Nie udało się wyemitować powiadomienia na {}: {}", topic, result);
            }
        });
    }

    public record TopicEvent(String topic, String type, long ts) {}
}
