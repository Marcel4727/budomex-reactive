package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.ProductionTask;
import com.pbs.BudomexWebApp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/order/accept")
@RequiredArgsConstructor
public class CustomerAcceptanceController {

    private final OrderService orderService;

    @GetMapping("/{token}")
    public Mono<ResponseEntity<Map<String, Object>>> getOrderDetailsForAcceptance(@PathVariable String token) {
        return orderService.getOrderByToken(token)
                .map(order -> {
                    Map<String, Object> response = new HashMap<>();

                    Map<String, Object> orderData = new HashMap<>();
                    orderData.put("id", order.getId());
                    orderData.put("productType", order.getProductType().name());
                    orderData.put("productSpecifications", order.getProductSpecifications());
                    orderData.put("quantity", order.getQuantity());
                    orderData.put("price", order.getPrice());
                    orderData.put("estimatedDeliveryDate",
                            order.getEstimatedDeliveryDate() != null ? order.getEstimatedDeliveryDate().toString() : null);
                    orderData.put("customerAcceptanceDeadline",
                            order.getCustomerAcceptanceDeadline() != null ? order.getCustomerAcceptanceDeadline().toString() : null);

                    response.put("order", orderData);

                    if (order.getCustomerAccepted() != null) {
                        response.put("alreadyResponded", true);
                        response.put("accepted", order.getCustomerAccepted());
                    } else if (order.getCustomerAcceptanceDeadline() != null
                            && LocalDateTime.now().isAfter(order.getCustomerAcceptanceDeadline())) {
                        response.put("expired", true);
                    }

                    return ResponseEntity.ok(response);
                })
                .defaultIfEmpty(ResponseEntity.badRequest()
                        .body(Map.of("error", "Nieprawidłowy link. Zamówienie nie zostało znalezione.")));
    }

    @PostMapping("/{token}/confirm")
    public Mono<ResponseEntity<Map<String, Object>>> acceptOrder(@PathVariable String token) {
        return orderService.customerAccept(token)
                .map(order -> ResponseEntity.ok(Map.<String, Object>of(
                        "success", true,
                        "accepted", true,
                        "message", "Oferta została zaakceptowana. Zamówienie w realizacji."
                )))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest()
                        .body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/{token}/reject")
    public Mono<ResponseEntity<Map<String, Object>>> rejectOrder(@PathVariable String token) {
        return orderService.customerReject(token)
                .map(order -> ResponseEntity.ok(Map.<String, Object>of(
                        "success", true,
                        "accepted", false,
                        "message", "Oferta została odrzucona. Zamówienie anulowane."
                )))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest()
                        .body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/{token}/track")
    public Mono<ResponseEntity<Map<String, Object>>> trackOrder(@PathVariable String token) {
        return orderService.getOrderByToken(token)
                .flatMap(order -> {
                    if (order.getCustomerAccepted() == null || !order.getCustomerAccepted()) {
                        return Mono.just(ResponseEntity.badRequest()
                                .body(Map.<String, Object>of("error", "Zamówienie nie zostało zaakceptowane.")));
                    }
                    return orderService.getProductionTasks(order.getId())
                            .collectList()
                            .map(tasks -> ResponseEntity.ok(buildTrackingResponse(order, tasks)));
                })
                .defaultIfEmpty(ResponseEntity.badRequest()
                        .body(Map.of("error", "Nieprawidłowy link. Zamówienie nie zostało znalezione.")));
    }

    private Map<String, Object> buildTrackingResponse(Order order, List<ProductionTask> tasks) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", order.getId());
        response.put("productType", order.getProductType().name());
        response.put("productSpecifications", order.getProductSpecifications());
        response.put("quantity", order.getQuantity());
        response.put("status", order.getStatus().name());
        response.put("completionPercentage", order.getCompletionPercentage());
        response.put("estimatedDeliveryDate",
                order.getEstimatedDeliveryDate() != null ? order.getEstimatedDeliveryDate().toString() : null);
        response.put("installationDate",
                order.getInstallationDate() != null ? order.getInstallationDate().toString() : null);

        long completedTasks = tasks.stream().filter(t -> Boolean.TRUE.equals(t.getCompleted())).count();
        response.put("totalTasks", tasks.size());
        response.put("completedTasks", completedTasks);

        return response;
    }
}
