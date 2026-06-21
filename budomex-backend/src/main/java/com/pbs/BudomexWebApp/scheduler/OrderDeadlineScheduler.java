package com.pbs.BudomexWebApp.scheduler;

import com.pbs.BudomexWebApp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderDeadlineScheduler {

    private static final Logger log = LoggerFactory.getLogger(OrderDeadlineScheduler.class);

    private final OrderService orderService;

    @Scheduled(fixedRate = 900000) // co 15 minut
    public void cancelExpiredOrders() {
        log.debug("Sprawdzanie zamówień z przekroczonym terminem akceptacji...");
        // Mono jest "cold" - bez subscribe() łańcuch w ogóle by się nie wykonał.
        orderService.cancelExpiredOrders()
                .doOnError(e -> log.error("Błąd podczas anulowania wygasłych zamówień", e))
                .subscribe();
    }

    @Scheduled(fixedRate = 1800000) // co 30 minut
    public void sendDeadlineReminders() {
        log.debug("Sprawdzanie zamówień wymagających przypomnienia o terminie...");
        orderService.sendDeadlineReminders()
                .doOnError(e -> log.error("Błąd podczas wysyłania przypomnień o terminie", e))
                .subscribe();
    }
}
