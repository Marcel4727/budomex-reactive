package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.OrderAssignedWorker;
import com.pbs.BudomexWebApp.entity.OrderStatus;
import com.pbs.BudomexWebApp.entity.User;
import com.pbs.BudomexWebApp.entity.UserRole;
import com.pbs.BudomexWebApp.repository.OrderRepository;
import com.pbs.BudomexWebApp.repository.UserRepository;
import com.pbs.BudomexWebApp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager/hr")
@RequiredArgsConstructor
public class HRController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    @GetMapping("/workers")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getAllWorkers() {
        return Mono.zip(
                userRepository.findByRole(UserRole.WORKER).collectList(),
                orderRepository.findByStatusOrderBySubmissionDateDesc(OrderStatus.W_REALIZACJI).collectList()
        ).flatMap(tuple -> {
            List<User> workers = tuple.getT1();
            List<Order> activeOrders = tuple.getT2();
            List<Long> orderIds = activeOrders.stream().map(Order::getId).toList();

            return orderService.getAssignedWorkerLinksForOrders(orderIds)
                    .collectList()
                    .map(links -> {
                        // workerId -> liczba aktywnych zamówień
                        Map<Long, Long> countsByWorker = links.stream()
                                .collect(Collectors.groupingBy(OrderAssignedWorker::getUserId, Collectors.counting()));

                        List<Map<String, Object>> result = workers.stream().map(worker -> {
                            Map<String, Object> data = new HashMap<>();
                            data.put("id", worker.getId());
                            data.put("username", worker.getUsername());
                            data.put("firstName", worker.getFirstName());
                            data.put("lastName", worker.getLastName());
                            data.put("email", worker.getEmail());

                            long assignedOrders = countsByWorker.getOrDefault(worker.getId(), 0L);
                            data.put("assignedOrders", assignedOrders);

                            String workload;
                            if (assignedOrders == 0) workload = "free";
                            else if (assignedOrders <= 2) workload = "low";
                            else if (assignedOrders <= 4) workload = "medium";
                            else workload = "high";
                            data.put("workload", workload);

                            return data;
                        }).collect(Collectors.toList());

                        return ResponseEntity.ok(result);
                    });
        });
    }

    @GetMapping("/availability")
    public Mono<ResponseEntity<Map<String, Object>>> getAvailabilityCalendar() {
        return Mono.zip(
                userRepository.findByRole(UserRole.WORKER).collectList(),
                orderRepository.findByStatusOrderBySubmissionDateDesc(OrderStatus.W_REALIZACJI).collectList()
        ).flatMap(tuple -> {
            List<User> workers = tuple.getT1();
            List<Order> activeOrders = tuple.getT2();
            List<Long> orderIds = activeOrders.stream().map(Order::getId).toList();
            Map<Long, Order> ordersById = activeOrders.stream()
                    .collect(Collectors.toMap(Order::getId, o -> o));

            return orderService.getAssignedWorkerLinksForOrders(orderIds)
                    .collectList()
                    .map(links -> {
                        // workerId -> lista orderId
                        Map<Long, List<Long>> orderIdsByWorker = links.stream()
                                .collect(Collectors.groupingBy(OrderAssignedWorker::getUserId,
                                        Collectors.mapping(OrderAssignedWorker::getOrderId, Collectors.toList())));

                        Map<String, Object> result = new HashMap<>();
                        result.put("totalWorkers", workers.size());
                        result.put("ordersInProduction", activeOrders.size());

                        List<Map<String, Object>> workersData = workers.stream().map(w -> {
                            Map<String, Object> wd = new HashMap<>();
                            wd.put("id", w.getId());
                            wd.put("name", w.getFirstName() + " " + w.getLastName());

                            List<Long> assignedOrderIds = orderIdsByWorker.getOrDefault(w.getId(), List.of());
                            List<Map<String, Object>> orders = assignedOrderIds.stream()
                                    .map(ordersById::get)
                                    .filter(java.util.Objects::nonNull)
                                    .map(o -> {
                                        Map<String, Object> od = new HashMap<>();
                                        od.put("orderId", o.getId());
                                        od.put("productType", o.getProductType().name());
                                        od.put("estimatedDeliveryDate",
                                                o.getEstimatedDeliveryDate() != null ? o.getEstimatedDeliveryDate().toString() : null);
                                        od.put("completionPercentage", o.getCompletionPercentage());
                                        return od;
                                    })
                                    .collect(Collectors.toList());
                            wd.put("assignedOrders", orders);
                            return wd;
                        }).collect(Collectors.toList());
                        result.put("workers", workersData);

                        return ResponseEntity.ok(result);
                    });
        });
    }

    @PostMapping("/order/{orderId}/assign/{workerId}")
    public Mono<ResponseEntity<Map<String, String>>> assignWorkerToOrder(@PathVariable Long orderId,
                                                                           @PathVariable Long workerId) {
        return Mono.zip(
                        orderRepository.findById(orderId)
                                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione"))),
                        userRepository.findById(workerId)
                                .switchIfEmpty(Mono.error(new IllegalArgumentException("Pracownik nie znaleziony")))
                )
                .flatMap(tuple -> {
                    User worker = tuple.getT2();
                    if (worker.getRole() != UserRole.WORKER) {
                        return Mono.error(new IllegalArgumentException("Użytkownik nie jest pracownikiem produkcji"));
                    }

                    return orderService.getAssignedWorkers(orderId)
                            .map(User::getId)
                            .collectList()
                            .flatMap(currentIds -> {
                                List<Long> ids = new ArrayList<>(currentIds);
                                if (!ids.contains(workerId)) {
                                    ids.add(workerId);
                                }
                                return orderService.assignWorkers(orderId, ids)
                                        .thenReturn(ResponseEntity.ok(Map.of(
                                                "message", "Pracownik " + worker.getFirstName() + " " + worker.getLastName()
                                                        + " został przypisany do zamówienia #" + orderId
                                        )));
                            });
                })
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @DeleteMapping("/order/{orderId}/unassign")
    public Mono<ResponseEntity<Map<String, String>>> unassignWorker(@PathVariable Long orderId) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione")))
                .flatMap(order -> orderService.assignWorkers(orderId, List.of()))
                .thenReturn(ResponseEntity.ok(Map.of("message", "Przypisanie pracowników usunięte")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }
}
