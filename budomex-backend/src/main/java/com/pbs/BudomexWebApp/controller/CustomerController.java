package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.dto.QuoteRequest;
import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CustomerController {

    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
    private final OrderService orderService;

    @PostMapping("/quote")
    public Mono<ResponseEntity<Map<String, String>>> submitQuote(@Valid @RequestBody Mono<QuoteRequest> requestMono) {
        return requestMono.flatMap(request -> {
            String estDateStr = request.estimatedDeliveryDate();
            LocalDate estimatedDeliveryDate = (estDateStr != null && !estDateStr.trim().isEmpty())
                    ? LocalDate.parse(estDateStr) : null;

            log.info("Otrzymano zapytanie ofertowe od: {} ({})",
                    request.customerName(), request.customerEmail());

            return orderService.createOrder(
                            request.customerName(), request.customerEmail(), request.customerPhone(),
                            request.customerAddress(), request.productType(), request.productSpecifications(),
                            request.quantity(), estimatedDeliveryDate)
                    .doOnNext(order -> log.info("Zamówienie zapisane pomyślnie z ID: {}", order.getId()))
                    .map((Order order) -> ResponseEntity.ok(Map.of(
                            "message", "Zapytanie ofertowe zostało wysłane pomyślnie",
                            "orderId", String.valueOf(order.getId())
                    )));
        }).onErrorResume(e -> {
            log.error("BŁĄD przy zapisywaniu zamówienia: ", e);
            return Mono.just(ResponseEntity.badRequest()
                    .body(Map.of("error", "Nie udało się zapisać zapytania ofertowego: " + e.getMessage())));
        });
    }
}
