package com.pbs.BudomexWebApp.service;

import com.pbs.BudomexWebApp.entity.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Wysyłka powiadomień e-mail.
 *
 * Metody zwracają {@link Mono}{@code <Void>}, żeby wpinały się w łańcuch
 * reaktywny przez {@code flatMap}/{@code then} (a nie jako side-effect w
 * {@code doOnNext}). Obecna implementacja tylko loguje treść, więc samo
 * logowanie jest synchroniczne — ale całość jest celowo opakowana w
 * {@code Mono.fromRunnable(...).subscribeOn(Schedulers.boundedElastic())},
 * dzięki czemu po podmianie na prawdziwe (blokujące) SMTP I/O nie zablokuje
 * to event-loopu Nettiego, a callsite nie będzie wymagał zmian.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public Mono<Void> sendApprovalEmail(Order order) {
        return send(() -> {
            String acceptUrl = frontendUrl + "/order/accept/" + order.getAcceptanceToken();
            String rejectUrl = frontendUrl + "/order/accept/" + order.getAcceptanceToken();

            log.info("========== EMAIL DO KLIENTA ==========");
            log.info("Do: {}", order.getCustomerEmail());
            log.info("Temat: BUDOMEX - Twoja oferta jest gotowa");
            log.info("---");
            log.info("Szanowny/a {},", order.getCustomerName());
            log.info("");
            log.info("Twoje zapytanie ofertowe zostało rozpatrzone.");
            log.info("Typ produktu: {}", order.getProductType());
            log.info("Specyfikacja: {}", order.getProductSpecifications());
            log.info("Ilość: {}", order.getQuantity());
            log.info("Cena: {} PLN", order.getPrice());
            log.info("Szacowana data realizacji: {}", order.getEstimatedDeliveryDate());
            if (order.getManagerNotes() != null && !order.getManagerNotes().isBlank()) {
                log.info("Uwagi: {}", order.getManagerNotes());
            }
            log.info("");
            log.info("Masz 48 godzin na podjęcie decyzji (do {}).", order.getCustomerAcceptanceDeadline());
            log.info("");
            log.info("Aby ZAAKCEPTOWAĆ ofertę, kliknij: {}", acceptUrl);
            log.info("Aby ODRZUCIĆ ofertę, kliknij: {}", rejectUrl);
            log.info("========================================");
        });
    }

    public Mono<Void> sendRejectionEmail(Order order) {
        return send(() -> {
            log.info("========== EMAIL DO KLIENTA ==========");
            log.info("Do: {}", order.getCustomerEmail());
            log.info("Temat: BUDOMEX - Informacja o zapytaniu ofertowym");
            log.info("---");
            log.info("Szanowny/a {},", order.getCustomerName());
            log.info("");
            log.info("Niestety, nie jesteśmy w stanie zrealizować Twojego zapytania ofertowego.");
            log.info("Przepraszamy za niedogodności.");
            log.info("========================================");
        });
    }

    public Mono<Void> sendDeadlineReminderEmail(Order order) {
        return send(() -> {
            String acceptUrl = frontendUrl + "/order/accept/" + order.getAcceptanceToken();
            long hoursLeft = java.time.Duration.between(
                    java.time.LocalDateTime.now(),
                    order.getCustomerAcceptanceDeadline()
            ).toHours();

            log.info("========== EMAIL PRZYPOMNIENIE ==========");
            log.info("Do: {}", order.getCustomerEmail());
            log.info("Temat: BUDOMEX - PRZYPOMNIENIE: Twoja oferta wygasa za {} godzin", hoursLeft);
            log.info("---");
            log.info("Szanowny/a {},", order.getCustomerName());
            log.info("");
            log.info("Przypominamy o oczekującej ofercie BUDOMEX.");
            log.info("Typ produktu: {}", order.getProductType());
            log.info("Cena: {} PLN", order.getPrice());
            log.info("");
            log.info("UWAGA: Pozostało Ci tylko {} godzin na podjęcie decyzji!", hoursLeft);
            log.info("Termin akceptacji: {}", order.getCustomerAcceptanceDeadline());
            log.info("");
            log.info("Aby zaakceptować ofertę, kliknij: {}", acceptUrl);
            log.info("========================================");
        });
    }

    public Mono<Void> sendCustomerAcceptanceConfirmation(Order order) {
        return send(() -> {
            log.info("========== EMAIL POTWIERDZENIE ==========");
            log.info("Do: {}", order.getCustomerEmail());
            log.info("Temat: BUDOMEX - Potwierdzenie przyjęcia zamówienia");
            log.info("---");
            log.info("Szanowny/a {},", order.getCustomerName());
            log.info("");
            log.info("Dziękujemy za akceptację oferty!");
            log.info("Numer zamówienia: BDX-{}", String.format("%06d", order.getId()));
            log.info("Typ produktu: {}", order.getProductType());
            log.info("Ilość: {} szt.", order.getQuantity());
            log.info("Cena: {} PLN", order.getPrice());
            log.info("Szacowana data realizacji: {}", order.getEstimatedDeliveryDate());
            log.info("");
            log.info("Możesz śledzić postęp swojego zamówienia pod adresem:");
            log.info("{}/order/track/{}", frontendUrl, order.getAcceptanceToken());
            log.info("========================================");
        });
    }

    /**
     * Opakowuje (potencjalnie blokujące) wysłanie maila tak, by:
     *  - wykonało się na puli {@code boundedElastic} (nie na event-loopie),
     *  - błąd wysyłki nie przerywał głównego przepływu biznesowego (zamówienie
     *    i tak zostało już zapisane) — logujemy go i kontynuujemy.
     */
    private Mono<Void> send(Runnable emailBody) {
        return Mono.fromRunnable(emailBody)
                .subscribeOn(Schedulers.boundedElastic())
                .onErrorResume(e -> {
                    log.warn("Nie udało się wysłać e-maila: {}", e.getMessage());
                    return Mono.empty();
                })
                .then();
    }
}
