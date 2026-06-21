package com.pbs.BudomexWebApp.service;

import com.pbs.BudomexWebApp.entity.*;
import com.pbs.BudomexWebApp.repository.OrderAssignedWorkerRepository;
import com.pbs.BudomexWebApp.repository.OrderHistoryRepository;
import com.pbs.BudomexWebApp.repository.OrderRepository;
import com.pbs.BudomexWebApp.repository.ProductionTaskRepository;
import com.pbs.BudomexWebApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private final OrderRepository orderRepository;
    private final ProductionTaskRepository productionTaskRepository;
    private final OrderHistoryRepository orderHistoryRepository;
    private final OrderAssignedWorkerRepository orderAssignedWorkerRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final InventoryService inventoryService;
    private final RealtimeNotificationService realtime;

    /** Rozgłasza zmianę zamówienia: panele wewnętrzne + publiczne śledzenie. */
    private Mono<Void> broadcast(Order order) {
        Mono<Void> ordersNotif = realtime.notifyOrders();
        if (order != null) {
            return ordersNotif.then(realtime.notifyTracking(order.getAcceptanceToken()));
        }
        return ordersNotif;
    }

    /** Przelicza completion_percentage zamówienia na podstawie zadań produkcyjnych. */
    private Mono<Order> recalculateCompletion(Order order) {
        return Mono.zip(
                productionTaskRepository.countByOrderId(order.getId()),
                productionTaskRepository.countByOrderIdAndCompletedTrue(order.getId())
        ).map(tuple -> {
            long total = tuple.getT1();
            long completed = tuple.getT2();
            int pct = total == 0 ? 0 : (int) Math.round((completed * 100.0) / total);
            order.setCompletionPercentage(pct);
            return order;
        });
    }

    // ========== Tworzenie i odczyt zamówień ==========

    @Transactional
    public Mono<Order> createOrder(String customerName, String customerEmail, String customerPhone,
                                    String customerAddress, String productType, String productSpecifications,
                                    Integer quantity, LocalDate estimatedDeliveryDate) {
        log.info("Tworzenie zamówienia: klient={}, email={}, produkt={}", customerName, customerEmail, productType);
        Order order = Order.builder()
                .customerName(customerName)
                .customerEmail(customerEmail)
                .customerPhone(customerPhone)
                .customerAddress(customerAddress)
                .productType(ProductType.valueOf(productType))
                .productSpecifications(productSpecifications)
                .quantity(quantity != null ? quantity : 1)
                .estimatedDeliveryDate(estimatedDeliveryDate)
                .status(OrderStatus.OCZEKUJACE)
                .build();

        return orderRepository.save(order)
                .doOnNext(saved -> log.info("Zamówienie zapisane z ID: {}", saved.getId()))
                .flatMap(saved -> broadcast(saved).thenReturn(saved));
    }

    public Flux<Order> getActiveOrders() {
        return orderRepository.findByArchivedFalseOrderBySubmissionDateDesc();
    }

    public Flux<Order> getArchivedOrders() {
        return orderRepository.findByArchivedTrueOrderBySubmissionDateDesc();
    }

    public Flux<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Mono<Order> getOrderById(Long id) {
        return orderRepository.findById(id);
    }

    public Mono<Order> getOrderByToken(String token) {
        return orderRepository.findByAcceptanceToken(token);
    }

    public Mono<Long> countByStatus(OrderStatus status) {
        return orderRepository.countByStatus(status);
    }

    /** Zadania produkcyjne danego zamówienia (zastępuje order.getProductionTasks()). */
    public Flux<ProductionTask> getProductionTasks(Long orderId) {
        return productionTaskRepository.findByOrderIdOrderBySequenceNumberAsc(orderId);
    }

    /** Zbiorczo zadania produkcyjne wielu zamówień naraz (unika N+1, np. w statystykach pracownika). */
    public Flux<ProductionTask> getProductionTasksForOrders(List<Long> orderIds) {
        return Flux.fromIterable(orderIds)
                .flatMap(productionTaskRepository::findByOrderIdOrderBySequenceNumberAsc);
    }

    /** Historia statusów danego zamówienia (zastępuje order.getHistory()). */
    public Flux<OrderHistory> getOrderHistory(Long orderId) {
        return orderHistoryRepository.findByOrderIdOrderByChangedAtDesc(orderId);
    }

    /** Pracownicy przypisani do zamówienia (zastępuje order.getAssignedWorkers()). */
    public Flux<User> getAssignedWorkers(Long orderId) {
        return orderAssignedWorkerRepository.findByOrderId(orderId)
                .flatMap(link -> userRepository.findById(link.getUserId()));
    }

    /**
     * Zbiorczo zwraca wszystkie wpisy przypisań (orderId -> userId) dla podanej listy zamówień.
     * Używane np. przez panel HR/Worker, żeby policzyć obciążenie/dostęp bez zapytania N+1.
     */
    public Flux<OrderAssignedWorker> getAssignedWorkerLinksForOrders(List<Long> orderIds) {
        return Flux.fromIterable(orderIds)
                .flatMap(orderAssignedWorkerRepository::findByOrderId);
    }

    /**
     * Zbiorczo pobiera przypisanych pracowników dla wielu zamówień naraz,
     * pogrupowanych po orderId. Używane przy renderowaniu list zamówień (Manager),
     * żeby uniknąć zapytania N+1 per zamówienie.
     */
    public Mono<Map<Long, List<User>>> getAssignedWorkersGroupedByOrder(List<Long> orderIds) {
        return getAssignedWorkerLinksForOrders(orderIds)
                .collectList()
                .flatMap(links -> {
                    List<Long> userIds = links.stream().map(OrderAssignedWorker::getUserId).distinct().toList();
                    return userRepository.findAllById(userIds)
                            .collectMap(User::getId)
                            .map(usersById -> {
                                Map<Long, List<User>> result = new java.util.HashMap<>();
                                for (OrderAssignedWorker link : links) {
                                    User u = usersById.get(link.getUserId());
                                    if (u != null) {
                                        result.computeIfAbsent(link.getOrderId(), k -> new ArrayList<>()).add(u);
                                    }
                                }
                                return result;
                            });
                });
    }

    // ========== Akcje managera (wycena / odrzucenie) ==========

    @Transactional
    public Mono<Order> approveOrder(Long orderId, BigDecimal price, LocalDate estimatedDeliveryDate, String managerNotes) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.OCZEKUJACE) {
                        return Mono.error(new IllegalStateException("Zamówienie nie jest w statusie OCZEKUJACE"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA);
                    order.setPrice(price);
                    order.setEstimatedDeliveryDate(estimatedDeliveryDate);
                    order.setManagerNotes(managerNotes);
                    order.setAcceptanceToken(UUID.randomUUID().toString());
                    order.setCustomerAcceptanceDeadline(LocalDateTime.now().plusHours(48));

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA, null,
                            "Zamówienie zatwierdzone przez mistrza. Cena: " + price + " PLN");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> emailService.sendApprovalEmail(saved).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    @Transactional
    public Mono<Order> rejectOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.OCZEKUJACE) {
                        return Mono.error(new IllegalStateException("Zamówienie nie jest w statusie OCZEKUJACE"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.ANULOWANE);
                    order.setArchived(true);

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.ANULOWANE, null,
                            "Zamówienie odrzucone przez mistrza");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> emailService.sendRejectionEmail(saved).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    // ========== Decyzja klienta ==========

    @Transactional
    public Mono<Order> customerAccept(String token) {
        return orderRepository.findByAcceptanceToken(token)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Nieprawidłowy token akceptacji")))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA) {
                        return Mono.error(new IllegalStateException("Zamówienie nie czeka na akceptację klienta"));
                    }
                    if (order.getCustomerAcceptanceDeadline() != null
                            && LocalDateTime.now().isAfter(order.getCustomerAcceptanceDeadline())) {
                        return Mono.error(new IllegalStateException("Termin akceptacji minął"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.W_REALIZACJI);
                    order.setCustomerAccepted(true);
                    order.setCustomerResponseDate(LocalDateTime.now());
                    order.setProductionStartDate(LocalDateTime.now());

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.W_REALIZACJI, null,
                            "Klient zaakceptował ofertę");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> emailService.sendCustomerAcceptanceConfirmation(saved).thenReturn(saved))
                            .flatMap(saved -> inventoryService.reserveForOrder(saved)
                                    .onErrorResume(e -> {
                                        log.warn("Nie udało się zarezerwować materiałów dla zamówienia #{}: {}",
                                                saved.getId(), e.getMessage());
                                        return Mono.empty();
                                    })
                                    .then(broadcast(saved))
                                    .then(realtime.notifyInventory())
                                    .thenReturn(saved));
                });
    }

    @Transactional
    public Mono<Order> customerReject(String token) {
        return orderRepository.findByAcceptanceToken(token)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Nieprawidłowy token akceptacji")))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA) {
                        return Mono.error(new IllegalStateException("Zamówienie nie czeka na akceptację klienta"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.ANULOWANE);
                    order.setArchived(true);
                    order.setCustomerAccepted(false);
                    order.setCustomerResponseDate(LocalDateTime.now());

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.ANULOWANE, null,
                            "Klient odrzucił ofertę");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    // ========== Scheduler ==========

    @Transactional
    public Mono<Void> sendDeadlineReminders() {
        // Wysyłaj przypomnienia 24h przed deadline (gdy 24h <= pozostało < 48h)
        LocalDateTime in24hours = LocalDateTime.now().plusHours(24);
        return orderRepository
                .findByStatusAndReminderSentFalseAndCustomerAcceptanceDeadlineBefore(
                        OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA, in24hours)
                .filter(order -> order.getCustomerAcceptanceDeadline() != null
                        && order.getCustomerAcceptanceDeadline().isAfter(LocalDateTime.now()))
                .flatMap(order -> emailService.sendDeadlineReminderEmail(order)
                        .then(Mono.defer(() -> {
                            order.setReminderSent(true);
                            return orderRepository.save(order);
                        }))
                        .doOnNext(saved -> log.info(
                                "Wysłano przypomnienie o terminie do klienta zamówienia #{}", saved.getId())))
                .then();
    }

    @Transactional
    public Mono<Void> cancelExpiredOrders() {
        return orderRepository.findByStatusAndCustomerAcceptanceDeadlineBefore(
                        OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA, LocalDateTime.now())
                .flatMap(order -> {
                    order.setStatus(OrderStatus.ANULOWANE);
                    order.setArchived(true);
                    order.setCustomerAccepted(false);

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA, OrderStatus.ANULOWANE, null,
                            "Automatyczne anulowanie - klient nie odpowiedział w ciągu 48 godzin");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                })
                .then();
    }

    // ========== Przypisywanie pracowników ==========

    /**
     * Ustawia (zastępuje) zbiór pracowników przypisanych do zamówienia.
     * Tylko przypisani pracownicy widzą i mogą edytować to zamówienie.
     */
    @Transactional
    public Mono<Order> assignWorkers(Long orderId, List<Long> workerIds) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    List<Long> ids = workerIds != null ? workerIds : List.of();

                    return Flux.fromIterable(ids)
                            .flatMap(workerId -> userRepository.findById(workerId)
                                    .switchIfEmpty(Mono.error(new IllegalArgumentException(
                                            "Pracownik nie znaleziony: " + workerId)))
                                    .flatMap(worker -> {
                                        if (worker.getRole() != UserRole.WORKER) {
                                            return Mono.<User>error(new IllegalArgumentException(
                                                    "Użytkownik " + worker.getUsername() + " nie jest pracownikiem produkcji"));
                                        }
                                        return Mono.just(worker);
                                    }))
                            .collectList()
                            .flatMap(workers -> orderAssignedWorkerRepository.deleteByOrderId(orderId)
                                    .thenMany(Flux.fromIterable(workers)
                                            .flatMap(w -> orderAssignedWorkerRepository.save(
                                                    OrderAssignedWorker.builder().orderId(orderId).userId(w.getId()).build())))
                                    .then(Mono.just(order)))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    private Mono<Boolean> isWorkerAssigned(Long orderId, User worker) {
        if (worker == null) {
            return Mono.just(false);
        }
        return orderAssignedWorkerRepository.existsByOrderIdAndUserId(orderId, worker.getId());
    }

    // ========== Panel pracownika ==========

    public Flux<Order> getOrdersInProduction() {
        return orderRepository.findByStatusOrderBySubmissionDateDesc(OrderStatus.W_REALIZACJI);
    }

    @Transactional
    public Mono<Order> completeTask(Long taskId, User worker) {
        return productionTaskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zadanie nie znalezione: " + taskId)))
                .flatMap(task -> orderRepository.findById(task.getOrderId())
                        .switchIfEmpty(Mono.error(new IllegalArgumentException(
                                "Zamówienie nie znalezione: " + task.getOrderId())))
                        .flatMap(order -> isWorkerAssigned(order.getId(), worker)
                                .flatMap(assigned -> {
                                    if (!assigned) {
                                        return Mono.error(new IllegalStateException("Nie jesteś przypisany do tego zamówienia"));
                                    }
                                    if (order.getStatus() != OrderStatus.W_REALIZACJI) {
                                        return Mono.error(new IllegalStateException("Zamówienie nie jest w realizacji"));
                                    }

                                    task.markAsCompleted(worker.getId());
                                    return productionTaskRepository.save(task)
                                            .then(recalculateCompletion(order))
                                            .flatMap(o -> finalizeIfComplete(o, worker))
                                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                                })));
    }

    /** Jeśli produkcja jest ukończona w 100%, przełącza status na ZREALIZOWANE i zapisuje wpis historii. */
    private Mono<Order> finalizeIfComplete(Order order, User worker) {
        if (order.getCompletionPercentage() != null && order.getCompletionPercentage() == 100
                && order.getStatus() == OrderStatus.W_REALIZACJI) {
            OrderStatus previousStatus = order.getStatus();
            order.setStatus(OrderStatus.ZREALIZOWANE);
            order.setProductionEndDate(LocalDateTime.now());

            OrderHistory historyEntry = OrderHistory.createEntry(
                    order.getId(), previousStatus, OrderStatus.ZREALIZOWANE,
                    worker != null ? worker.getId() : null,
                    "Produkcja zakończona - 100% zadań ukończonych");

            return orderRepository.save(order)
                    .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved));
        }
        return orderRepository.save(order);
    }

    @Transactional
    public Mono<Order> revertTask(Long taskId, User worker) {
        return productionTaskRepository.findById(taskId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zadanie nie znalezione: " + taskId)))
                .flatMap(task -> orderRepository.findById(task.getOrderId())
                        .switchIfEmpty(Mono.error(new IllegalArgumentException(
                                "Zamówienie nie znalezione: " + task.getOrderId())))
                        .flatMap(order -> isWorkerAssigned(order.getId(), worker)
                                .flatMap(assigned -> {
                                    if (!assigned) {
                                        return Mono.error(new IllegalStateException("Nie jesteś przypisany do tego zamówienia"));
                                    }
                                    if (order.getStatus() != OrderStatus.W_REALIZACJI && order.getStatus() != OrderStatus.ZREALIZOWANE) {
                                        return Mono.error(new IllegalStateException("Zamówienie nie jest w realizacji ani zrealizowane"));
                                    }

                                    task.markAsIncomplete();

                                    return productionTaskRepository.save(task)
                                            .then(Mono.defer(() -> {
                                                if (order.getStatus() == OrderStatus.ZREALIZOWANE) {
                                                    OrderStatus previousStatus = order.getStatus();
                                                    order.setStatus(OrderStatus.W_REALIZACJI);
                                                    order.setProductionEndDate(null);

                                                    OrderHistory historyEntry = OrderHistory.createEntry(
                                                            order.getId(), previousStatus, OrderStatus.W_REALIZACJI, null,
                                                            "Zadanie cofnięte - produkcja wznowiona");

                                                    return orderHistoryRepository.save(historyEntry).then(Mono.empty());
                                                }
                                                return Mono.empty();
                                            }))
                                            .then(recalculateCompletion(order))
                                            .flatMap(orderRepository::save)
                                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                                })));
    }

    @Transactional
    public Mono<Void> deleteOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.ANULOWANE) {
                        return Mono.error(new IllegalStateException("Tylko anulowane zamówienia mogą być usunięte"));
                    }
                    log.info("Usuwanie anulowanego zamówienia #{}", orderId);
                    return orderRepository.delete(order).then(broadcast(order));
                });
    }

    @Transactional
    public Mono<Order> assignProductionTasks(Long orderId, List<String> taskDescriptions) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.W_REALIZACJI) {
                        return Mono.error(new IllegalStateException("Zadania można przypisać tylko do zamówień w realizacji"));
                    }
                    if (taskDescriptions == null || taskDescriptions.isEmpty()) {
                        return Mono.error(new IllegalArgumentException("Lista zadań nie może być pusta"));
                    }

                    return productionTaskRepository.findByOrderIdOrderBySequenceNumberAsc(orderId)
                            .collectList()
                            .flatMap(existingTasks -> {
                                // Usuwamy nieukończone zadania, zachowujemy ukończone
                                List<ProductionTask> toDelete = new ArrayList<>();
                                List<ProductionTask> remaining = new ArrayList<>();
                                for (ProductionTask t : existingTasks) {
                                    if (Boolean.TRUE.equals(t.getCompleted())) {
                                        remaining.add(t);
                                    } else {
                                        toDelete.add(t);
                                    }
                                }

                                int nextSequence = remaining.stream()
                                        .mapToInt(ProductionTask::getSequenceNumber)
                                        .max()
                                        .orElse(-1) + 1;

                                Set<String> existingDescriptions = new HashSet<>();
                                for (ProductionTask t : remaining) {
                                    existingDescriptions.add(t.getDescription());
                                }

                                List<ProductionTask> newTasks = new ArrayList<>();
                                int seq = nextSequence;
                                for (String description : taskDescriptions) {
                                    if (description == null || description.trim().isEmpty()) continue;
                                    String trimmed = description.trim();
                                    if (existingDescriptions.contains(trimmed)) continue;

                                    newTasks.add(ProductionTask.builder()
                                            .orderId(orderId)
                                            .description(trimmed)
                                            .sequenceNumber(seq++)
                                            .completed(false)
                                            .build());
                                    existingDescriptions.add(trimmed);
                                }

                                Mono<Void> deleteMono = Flux.fromIterable(toDelete)
                                        .flatMap(t -> productionTaskRepository.deleteById(t.getId()))
                                        .then();
                                Mono<Void> insertMono = Flux.fromIterable(newTasks)
                                        .flatMap(productionTaskRepository::save)
                                        .then();

                                return deleteMono.then(insertMono)
                                        .then(recalculateCompletion(order))
                                        .flatMap(orderRepository::save)
                                        .doOnNext(saved -> log.info("Przypisano zadania do zamówienia #{}", orderId))
                                        .flatMap(saved -> broadcast(saved).thenReturn(saved));
                            });
                });
    }

    // ========== Montaż ==========

    @Transactional
    public Mono<Order> scheduleInstallation(Long orderId, LocalDateTime installationDate) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.ZREALIZOWANE) {
                        return Mono.error(new IllegalStateException("Montaż można zaplanować tylko dla zrealizowanych zamówień"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.MONTAZ);
                    order.setInstallationDate(installationDate);

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.MONTAZ, null,
                            "Zaplanowano montaż na: " + installationDate);

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    @Transactional
    public Mono<Order> completeInstallation(Long orderId) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.MONTAZ) {
                        return Mono.error(new IllegalStateException("Zamówienie nie jest w statusie MONTAZ"));
                    }

                    OrderStatus previousStatus = order.getStatus();
                    order.setStatus(OrderStatus.KONIEC);
                    order.setArchived(true);

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), previousStatus, OrderStatus.KONIEC, null,
                            "Montaż zakończony sukcesem");

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    @Transactional
    public Mono<Order> rescheduleInstallation(Long orderId, LocalDateTime newDate) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    if (order.getStatus() != OrderStatus.MONTAZ) {
                        return Mono.error(new IllegalStateException("Zamówienie nie jest w statusie MONTAZ"));
                    }

                    LocalDateTime oldDate = order.getInstallationDate();
                    order.setInstallationDate(newDate);

                    OrderHistory historyEntry = OrderHistory.createEntry(
                            order.getId(), OrderStatus.MONTAZ, OrderStatus.MONTAZ, null,
                            "Zmieniono datę montażu z " + oldDate + " na " + newDate);

                    return orderRepository.save(order)
                            .flatMap(saved -> orderHistoryRepository.save(historyEntry).thenReturn(saved))
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    @Transactional
    public Mono<Order> updateProductionNotes(Long orderId, String notes) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Zamówienie nie znalezione: " + orderId)))
                .flatMap(order -> {
                    order.setProductionNotes(notes);
                    return orderRepository.save(order)
                            .flatMap(saved -> broadcast(saved).thenReturn(saved));
                });
    }

    public Flux<Order> getCompletedOrders() {
        return orderRepository.findByStatusOrderBySubmissionDateDesc(OrderStatus.ZREALIZOWANE);
    }

    public Flux<Order> getInstallationReminders() {
        // Zwraca zamówienia MONTAZ, dla ktorych data montazu + nastepny dzien 8:00 juz minely
        LocalDateTime cutoff = LocalDate.now().atTime(8, 0);
        return orderRepository.findByStatusAndInstallationDateBefore(OrderStatus.MONTAZ, cutoff);
    }
}
