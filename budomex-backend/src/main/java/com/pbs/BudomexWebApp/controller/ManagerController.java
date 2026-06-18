package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.entity.InventoryItem;
import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.OrderHistory;
import com.pbs.BudomexWebApp.entity.OrderStatus;
import com.pbs.BudomexWebApp.entity.ProductionTask;
import com.pbs.BudomexWebApp.entity.User;
import com.pbs.BudomexWebApp.service.InventoryService;
import com.pbs.BudomexWebApp.service.OrderService;
import com.pbs.BudomexWebApp.service.ProductionTaskTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final OrderService orderService;
    private final ProductionTaskTemplateService taskTemplateService;
    private final InventoryService inventoryService;

    @GetMapping("/orders")
    public Mono<ResponseEntity<Map<String, Object>>> getActiveOrders() {
        return orderService.getActiveOrders()
                .collectList()
                .flatMap(orders -> {
                    List<Long> orderIds = orders.stream().map(Order::getId).toList();

                    return Mono.zip(
                            orderService.getAssignedWorkersGroupedByOrder(orderIds),
                            orderService.countByStatus(OrderStatus.OCZEKUJACE),
                            orderService.countByStatus(OrderStatus.W_REALIZACJI),
                            orderService.countByStatus(OrderStatus.ZREALIZOWANE),
                            orderService.countByStatus(OrderStatus.MONTAZ),
                            inventoryService.getLowStockItems().collectList()
                    ).map(tuple -> {
                        Map<Long, List<User>> workersByOrder = tuple.getT1();

                        Map<String, Object> response = new HashMap<>();
                        response.put("orders", orders.stream()
                                .map(o -> mapOrderToDto(o, workersByOrder.getOrDefault(o.getId(), List.of())))
                                .collect(Collectors.toList()));
                        response.put("countOczekujace", tuple.getT2());
                        response.put("countWRealizacji", tuple.getT3());
                        response.put("countZrealizowane", tuple.getT4());
                        response.put("countMontaz", tuple.getT5());

                        LocalDate today = LocalDate.now();
                        long countOverdue = orders.stream()
                                .filter(o -> o.getStatus() == OrderStatus.W_REALIZACJI
                                        || o.getStatus() == OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA)
                                .filter(o -> o.getEstimatedDeliveryDate() != null
                                        && o.getEstimatedDeliveryDate().isBefore(today))
                                .count();
                        response.put("countOverdue", countOverdue);

                        BigDecimal totalValue = orders.stream()
                                .filter(o -> o.getPrice() != null)
                                .map(Order::getPrice)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        response.put("totalValue", totalValue);

                        List<InventoryItem> lowStock = tuple.getT6();
                        response.put("lowStockCount", lowStock.size());

                        return ResponseEntity.ok(response);
                    });
                });
    }

    @GetMapping("/archive")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getArchivedOrders() {
        return orderService.getArchivedOrders()
                .collectList()
                .flatMap(orders -> {
                    List<Long> orderIds = orders.stream().map(Order::getId).toList();
                    return orderService.getAssignedWorkersGroupedByOrder(orderIds)
                            .map(workersByOrder -> ResponseEntity.ok(orders.stream()
                                    .map(o -> mapOrderToDto(o, workersByOrder.getOrDefault(o.getId(), List.of())))
                                    .collect(Collectors.toList())));
                });
    }

    @GetMapping("/order/{id}")
    public Mono<ResponseEntity<Map<String, Object>>> getOrderDetails(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .flatMap(order -> Mono.zip(
                        orderService.getProductionTasks(id).collectList(),
                        orderService.getOrderHistory(id).collectList(),
                        orderService.getAssignedWorkers(id).collectList()
                ).map(tuple -> {
                    List<ProductionTask> tasks = tuple.getT1();
                    List<OrderHistory> history = tuple.getT2();
                    List<User> workers = tuple.getT3();

                    Map<String, Object> data = mapOrderToDto(order, workers);
                    data.put("productionTasks", tasks.stream().map(task -> {
                        Map<String, Object> t = new HashMap<>();
                        t.put("id", task.getId());
                        t.put("description", task.getDescription());
                        t.put("completed", task.getCompleted());
                        t.put("sequenceNumber", task.getSequenceNumber());
                        return t;
                    }).collect(Collectors.toList()));

                    data.put("history", history.stream().map(h -> {
                        Map<String, Object> historyEntry = new HashMap<>();
                        historyEntry.put("id", h.getId());
                        historyEntry.put("previousStatus", h.getPreviousStatus() != null ? h.getPreviousStatus().name() : null);
                        historyEntry.put("newStatus", h.getNewStatus().name());
                        historyEntry.put("changedAt", h.getChangedAt().toString());
                        historyEntry.put("notes", h.getNotes());
                        return historyEntry;
                    }).collect(Collectors.toList()));

                    return ResponseEntity.ok(data);
                }))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/order/{id}/approve")
    public Mono<ResponseEntity<Map<String, String>>> approveOrder(@PathVariable Long id,
                                                                    @RequestBody Map<String, Object> payload) {
        BigDecimal price = new BigDecimal(payload.get("price").toString());
        LocalDate estimatedDeliveryDate = LocalDate.parse(payload.get("estimatedDeliveryDate").toString());
        String managerNotes = payload.get("managerNotes") != null ? payload.get("managerNotes").toString() : null;

        return orderService.approveOrder(id, price, estimatedDeliveryDate, managerNotes)
                .map(order -> ResponseEntity.ok(Map.of(
                        "message", "Zamówienie zatwierdzone. Email wysłany do klienta.",
                        "acceptanceToken", order.getAcceptanceToken()
                )))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/order/{id}/reject")
    public Mono<ResponseEntity<Map<String, String>>> rejectOrder(@PathVariable Long id) {
        return orderService.rejectOrder(id)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Zamówienie odrzucone.")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/order/{id}/delete")
    public Mono<ResponseEntity<Map<String, String>>> deleteOrder(@PathVariable Long id) {
        return orderService.deleteOrder(id)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Zamówienie usunięte.")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/order/{id}/task-templates")
    public Mono<ResponseEntity<Map<String, Object>>> getTaskTemplates(@PathVariable Long id) {
        return orderService.getOrderById(id)
                .flatMap(order -> orderService.getProductionTasks(id)
                        .collectList()
                        .map(tasks -> {
                            Map<String, Object> data = new HashMap<>();
                            data.put("templates", taskTemplateService.getTemplateTasksForProductType(order.getProductType()));
                            data.put("existingTasks", tasks.stream().map(task -> {
                                Map<String, Object> t = new HashMap<>();
                                t.put("id", task.getId());
                                t.put("description", task.getDescription());
                                t.put("completed", task.getCompleted());
                                return t;
                            }).collect(Collectors.toList()));
                            return ResponseEntity.ok(data);
                        }))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping("/order/{id}/tasks")
    public Mono<ResponseEntity<Map<String, String>>> assignTasks(@PathVariable Long id,
                                                                   @RequestBody Map<String, List<String>> body) {
        List<String> tasks = body.get("tasks");
        return orderService.assignProductionTasks(id, tasks)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Zadania przypisane pomyślnie.")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/order/{id}/workers")
    public Mono<ResponseEntity<Map<String, String>>> assignWorkers(@PathVariable Long id,
                                                                     @RequestBody Map<String, List<Object>> body) {
        List<Object> raw = body.get("workerIds");
        List<Long> workerIds = raw == null ? List.of()
                : raw.stream().map(o -> Long.valueOf(o.toString())).collect(Collectors.toList());

        return orderService.assignWorkers(id, workerIds)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Przypisano pracowników do zamówienia.")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/stats")
    public Mono<ResponseEntity<Map<String, Object>>> getStats() {
        return Mono.zip(
                orderService.countByStatus(OrderStatus.OCZEKUJACE),
                orderService.countByStatus(OrderStatus.W_REALIZACJI),
                orderService.countByStatus(OrderStatus.ZREALIZOWANE),
                orderService.countByStatus(OrderStatus.MONTAZ),
                orderService.getActiveOrders().collectList()
        ).map(tuple -> {
            Map<String, Object> stats = new HashMap<>();
            stats.put("countOczekujace", tuple.getT1());
            stats.put("countWRealizacji", tuple.getT2());
            stats.put("countZrealizowane", tuple.getT3());
            stats.put("countMontaz", tuple.getT4());

            List<Order> active = tuple.getT5();
            BigDecimal totalValue = active.stream()
                    .filter(o -> o.getPrice() != null)
                    .map(Order::getPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            stats.put("totalValue", totalValue);

            return ResponseEntity.ok(stats);
        });
    }

    @PostMapping("/order/{id}/schedule-installation")
    public Mono<ResponseEntity<Map<String, String>>> scheduleInstallation(@PathVariable Long id,
                                                                            @RequestBody Map<String, String> payload) {
        LocalDateTime installationDate = LocalDateTime.parse(payload.get("installationDate"));
        return orderService.scheduleInstallation(id, installationDate)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Montaż zaplanowany na " + installationDate)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/order/{id}/complete-installation")
    public Mono<ResponseEntity<Map<String, String>>> completeInstallation(@PathVariable Long id) {
        return orderService.completeInstallation(id)
                .thenReturn(ResponseEntity.ok(Map.of(
                        "message", "Montaż zakończony sukcesem. Zamówienie przeniesione do archiwum.")))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/order/{id}/reschedule-installation")
    public Mono<ResponseEntity<Map<String, String>>> rescheduleInstallation(@PathVariable Long id,
                                                                             @RequestBody Map<String, String> payload) {
        LocalDateTime installationDate = LocalDateTime.parse(payload.get("installationDate"));
        return orderService.rescheduleInstallation(id, installationDate)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Nowa data montażu: " + installationDate)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @GetMapping("/installation-reminders")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getInstallationReminders() {
        return orderService.getInstallationReminders()
                .map(order -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("id", order.getId());
                    data.put("customerName", order.getCustomerName());
                    data.put("installationDate", order.getInstallationDate().toString());
                    data.put("productType", order.getProductType().name());
                    data.put("customerAddress", order.getCustomerAddress());
                    return data;
                })
                .collectList()
                .map(ResponseEntity::ok);
    }

    @GetMapping("/monthly-stats")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getMonthlyStats() {
        String[] monthNames = {"Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"};
        int currentYear = java.time.Year.now().getValue();

        return orderService.getAllOrders()
                .filter(o -> o.getStatus() != OrderStatus.ANULOWANE)
                .filter(o -> o.getSubmissionDate().getYear() == currentYear)
                .collectList()
                .map(allOrders -> {
                    Map<Integer, Long> monthCounts = allOrders.stream()
                            .collect(Collectors.groupingBy(
                                    o -> o.getSubmissionDate().getMonthValue(),
                                    Collectors.counting()
                            ));

                    List<Map<String, Object>> result = new ArrayList<>();
                    for (int month = 1; month <= 12; month++) {
                        Map<String, Object> entry = new HashMap<>();
                        entry.put("name", monthNames[month - 1]);
                        entry.put("zamowienia", monthCounts.getOrDefault(month, 0L));
                        result.add(entry);
                    }

                    return ResponseEntity.ok(result);
                });
    }

    private Map<String, Object> mapOrderToDto(Order order, List<User> assignedWorkers) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", order.getId());
        data.put("customerName", order.getCustomerName());
        data.put("customerEmail", order.getCustomerEmail());
        data.put("customerPhone", order.getCustomerPhone());
        data.put("customerAddress", order.getCustomerAddress());
        data.put("productType", order.getProductType().name());
        data.put("productSpecifications", order.getProductSpecifications());
        data.put("quantity", order.getQuantity());
        data.put("status", order.getStatus().name());
        data.put("submissionDate", order.getSubmissionDate().toString());
        data.put("price", order.getPrice());
        data.put("estimatedDeliveryDate",
                order.getEstimatedDeliveryDate() != null ? order.getEstimatedDeliveryDate().toString() : null);
        data.put("managerNotes", order.getManagerNotes());
        data.put("completionPercentage", order.getCompletionPercentage());
        data.put("installationDate",
                order.getInstallationDate() != null ? order.getInstallationDate().toString() : null);
        data.put("productionNotes", order.getProductionNotes());
        data.put("assignedWorkers", assignedWorkers.stream()
                .map(w -> {
                    Map<String, Object> worker = new HashMap<>();
                    worker.put("id", w.getId());
                    worker.put("name", w.getFirstName() + " " + w.getLastName());
                    return worker;
                })
                .collect(Collectors.toList()));
        return data;
    }
}
