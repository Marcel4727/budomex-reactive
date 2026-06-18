package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.ProductionTask;
import com.pbs.BudomexWebApp.entity.User;
import com.pbs.BudomexWebApp.repository.UserRepository;
import com.pbs.BudomexWebApp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Panel pracownika.
 *
 * UWAGA dot. Authentication: w wersji servletowej kontrolery przyjmowały
 * Authentication jako parametr metody (wstrzykiwany z ThreadLocal). W WebFlux
 * SecurityContext nie jest powiązany z wątkiem, lecz z Reactor Context, więc
 * pobieramy go reaktywnie przez ReactiveSecurityContextHolder.getContext()
 * i budujemy resztę logiki jako dalszy ciąg łańcucha (flatMap).
 */
@RestController
@RequestMapping("/api/worker")
@RequiredArgsConstructor
public class WorkerController {

    private static final Logger log = LoggerFactory.getLogger(WorkerController.class);
    private final OrderService orderService;
    private final UserRepository userRepository;

    /** Pomocnicze: odczytuje zalogowanego pracownika z reaktywnego SecurityContext. */
    private Mono<User> currentWorker() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(userRepository::findByUsername);
    }

    @GetMapping("/orders")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getWorkerOrders() {
        return currentWorker()
                .flatMap(worker -> orderService.getOrdersInProduction()
                        .collectList()
                        .flatMap(allOrders -> {
                            List<Long> allOrderIds = allOrders.stream().map(Order::getId).toList();
                            return orderService.getAssignedWorkerLinksForOrders(allOrderIds)
                                    .filter(link -> link.getUserId().equals(worker.getId()))
                                    .map(link -> link.getOrderId())
                                    .collectList()
                                    .map(assignedOrderIds -> {
                                        List<Order> orders = allOrders.stream()
                                                .filter(o -> assignedOrderIds.contains(o.getId()))
                                                .collect(Collectors.toList());

                                        log.info("Panel pracownika {} - liczba zamówień: {}/{}",
                                                worker.getUsername(), orders.size(), allOrders.size());

                                        List<Map<String, Object>> result = orders.stream().map(order -> {
                                            Map<String, Object> data = new HashMap<>();
                                            data.put("id", order.getId());
                                            data.put("customerName", order.getCustomerName());
                                            data.put("productType", order.getProductType().name());
                                            data.put("completionPercentage", order.getCompletionPercentage());
                                            data.put("estimatedDeliveryDate",
                                                    order.getEstimatedDeliveryDate() != null
                                                            ? order.getEstimatedDeliveryDate().toString() : null);
                                            data.put("assignedToMe", true);
                                            return data;
                                        }).collect(Collectors.toList());

                                        return ResponseEntity.ok(result);
                                    });
                        }))
                .defaultIfEmpty(ResponseEntity.ok(List.of()));
    }

    @PostMapping("/task/{taskId}/complete")
    public Mono<ResponseEntity<Map<String, Object>>> completeTask(@PathVariable Long taskId) {
        return currentWorker()
                .switchIfEmpty(Mono.error(new IllegalStateException("Nie znaleziono użytkownika")))
                .flatMap(worker -> orderService.completeTask(taskId, worker))
                .map(order -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "Zadanie oznaczone jako ukończone");
                    response.put("completionPercentage", order.getCompletionPercentage());
                    response.put("orderStatus", order.getStatus().name());
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/task/{taskId}/revert")
    public Mono<ResponseEntity<Map<String, Object>>> revertTask(@PathVariable Long taskId) {
        return currentWorker()
                .switchIfEmpty(Mono.error(new IllegalStateException("Nie znaleziono użytkownika")))
                .flatMap(worker -> orderService.revertTask(taskId, worker))
                .map(order -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("message", "Zadanie cofnięte");
                    response.put("completionPercentage", order.getCompletionPercentage());
                    response.put("orderStatus", order.getStatus().name());
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/order/{id}")
    public Mono<ResponseEntity<Map<String, Object>>> getOrderDetails(@PathVariable Long id) {
        return currentWorker()
                .flatMap(worker -> orderService.getOrderById(id)
                        .flatMap(order -> orderService.getAssignedWorkers(id)
                                .map(User::getId)
                                .collectList()
                                .flatMap(assignedIds -> {
                                    if (!assignedIds.contains(worker.getId())) {
                                        return Mono.just(ResponseEntity.status(403)
                                                .body(Map.<String, Object>of("error", "Brak dostępu do tego zamówienia")));
                                    }
                                    return orderService.getProductionTasks(id)
                                            .collectList()
                                            .map(tasks -> ResponseEntity.ok(buildOrderDetails(order, tasks)));
                                })))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildOrderDetails(Order order, List<ProductionTask> tasks) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", order.getId());
        // Brak pełnych danych klienta/finansów - dostosowano do specyfikacji
        data.put("customerName", order.getCustomerName());
        data.put("customerAddress", order.getCustomerAddress());
        data.put("productType", order.getProductType().name());
        data.put("productSpecifications", order.getProductSpecifications());
        data.put("quantity", order.getQuantity());
        data.put("status", order.getStatus().name());
        data.put("completionPercentage", order.getCompletionPercentage());
        data.put("estimatedDeliveryDate",
                order.getEstimatedDeliveryDate() != null ? order.getEstimatedDeliveryDate().toString() : null);
        data.put("productionNotes", order.getProductionNotes());
        data.put("tasks", tasks.stream().map(task -> {
            Map<String, Object> t = new HashMap<>();
            t.put("id", task.getId());
            t.put("description", task.getDescription());
            t.put("completed", task.getCompleted());
            t.put("sequenceNumber", task.getSequenceNumber());
            t.put("category", task.getCategory());
            return t;
        }).collect(Collectors.toList()));
        return data;
    }

    @GetMapping("/stats")
    public Mono<ResponseEntity<Map<String, Long>>> getStats() {
        return orderService.getOrdersInProduction()
                .collectList()
                .flatMap(orders -> {
                    List<Long> orderIds = orders.stream().map(Order::getId).toList();
                    return orderService.getProductionTasksForOrders(orderIds)
                            .collectList()
                            .map(tasks -> {
                                long completedTasks = tasks.stream()
                                        .filter(t -> Boolean.TRUE.equals(t.getCompleted()))
                                        .count();
                                long totalTasks = tasks.size();

                                Map<String, Long> stats = new HashMap<>();
                                stats.put("activeOrders", (long) orders.size());
                                stats.put("totalTasks", totalTasks - completedTasks); // backlog
                                stats.put("completedTasks", completedTasks);
                                return ResponseEntity.ok(stats);
                            });
                });
    }

    @PostMapping("/order/{id}/notes")
    public Mono<ResponseEntity<Map<String, String>>> updateProductionNotes(@PathVariable Long id,
                                                                            @RequestBody Map<String, String> payload) {
        String notes = payload.get("notes");
        return orderService.updateProductionNotes(id, notes)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Notatki zapisane")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/history")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getCompletedHistory() {
        return orderService.getCompletedOrders()
                .collectList()
                .flatMap(completed -> {
                    List<Long> orderIds = completed.stream().map(Order::getId).toList();
                    return orderService.getProductionTasksForOrders(orderIds)
                            .collectList()
                            .map(allTasks -> {
                                Map<Long, Long> taskCountByOrder = allTasks.stream()
                                        .collect(Collectors.groupingBy(ProductionTask::getOrderId, Collectors.counting()));

                                List<Map<String, Object>> result = completed.stream().map(order -> {
                                    Map<String, Object> data = new HashMap<>();
                                    data.put("id", order.getId());
                                    data.put("customerName", order.getCustomerName());
                                    data.put("productType", order.getProductType().name());
                                    data.put("quantity", order.getQuantity());
                                    data.put("status", order.getStatus().name());
                                    data.put("productionEndDate",
                                            order.getProductionEndDate() != null ? order.getProductionEndDate().toString() : null);
                                    data.put("totalTasks", taskCountByOrder.getOrDefault(order.getId(), 0L));
                                    return data;
                                }).collect(Collectors.toList());

                                return ResponseEntity.ok(result);
                            });
                });
    }
}
