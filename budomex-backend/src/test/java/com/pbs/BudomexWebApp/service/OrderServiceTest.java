package com.pbs.BudomexWebApp.service;

import com.pbs.BudomexWebApp.entity.*;
import com.pbs.BudomexWebApp.repository.OrderRepository;
import com.pbs.BudomexWebApp.repository.ProductionTaskRepository;
import com.pbs.BudomexWebApp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Testy jednostkowe logiki biznesowej OrderService (JUnit 5 + Mockito).
 * Wszystkie zależności zamockowane — testujemy wyłącznie regułę biznesową.
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ProductionTaskRepository productionTaskRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;
    @Mock private InventoryService inventoryService;
    @Mock private RealtimeNotificationService realtime;

    @InjectMocks private OrderService orderService;

    private Order pendingOrder;

    @BeforeEach
    void setUp() {
        pendingOrder = Order.builder()
                .id(1L)
                .customerName("Jan Kowalski")
                .customerEmail("jan@test.pl")
                .productType(ProductType.OKNO)
                .productSpecifications("biale 100x100")
                .quantity(2)
                .status(OrderStatus.OCZEKUJACE)
                .build();
    }

    @Test
    @DisplayName("approveOrder: ustawia status, cenę, token i deadline 48h oraz wysyła email")
    void approveOrder_setsFieldsAndSendsEmail() {
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        Order result = orderService.approveOrder(1L, new BigDecimal("1500"),
                LocalDate.now().plusDays(14), "uwagi");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA);
        assertThat(result.getPrice()).isEqualByComparingTo("1500");
        assertThat(result.getAcceptanceToken()).isNotBlank();
        assertThat(result.getCustomerAcceptanceDeadline())
                .isCloseTo(LocalDateTime.now().plusHours(48),
                        within(2, java.time.temporal.ChronoUnit.MINUTES));
        verify(emailService).sendApprovalEmail(result);
    }

    @Test
    @DisplayName("approveOrder: rzuca wyjątek gdy zamówienie nie jest OCZEKUJACE")
    void approveOrder_rejectsWrongStatus() {
        pendingOrder.setStatus(OrderStatus.W_REALIZACJI);
        when(orderRepository.findById(1L)).thenReturn(Optional.of(pendingOrder));

        assertThatThrownBy(() -> orderService.approveOrder(1L, BigDecimal.TEN, LocalDate.now(), null))
                .isInstanceOf(IllegalStateException.class);
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("customerAccept: poprawny token → W_REALIZACJI + rezerwacja magazynu")
    void customerAccept_movesToProductionAndReservesStock() {
        pendingOrder.setStatus(OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA);
        pendingOrder.setAcceptanceToken("tok-123");
        pendingOrder.setCustomerAcceptanceDeadline(LocalDateTime.now().plusHours(10));
        when(orderRepository.findByAcceptanceToken("tok-123")).thenReturn(Optional.of(pendingOrder));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        Order result = orderService.customerAccept("tok-123");

        assertThat(result.getStatus()).isEqualTo(OrderStatus.W_REALIZACJI);
        assertThat(result.getCustomerAccepted()).isTrue();
        verify(inventoryService).reserveForOrder(result);
        verify(emailService).sendCustomerAcceptanceConfirmation(result);
    }

    @Test
    @DisplayName("customerAccept: nieprawidłowy token rzuca wyjątek")
    void customerAccept_invalidToken() {
        when(orderRepository.findByAcceptanceToken("zly")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.customerAccept("zly"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("completeTask: pracownik NIE przypisany do zamówienia dostaje odmowę (RBAC)")
    void completeTask_deniesUnassignedWorker() {
        User assigned = User.builder().id(10L).username("w1").role(UserRole.WORKER).build();
        User intruder = User.builder().id(20L).username("w2").role(UserRole.WORKER).build();
        Order order = Order.builder().id(1L).status(OrderStatus.W_REALIZACJI).build();
        order.getAssignedWorkers().add(assigned);
        ProductionTask task = ProductionTask.builder().id(5L).description("krok").order(order).build();
        when(productionTaskRepository.findById(5L)).thenReturn(Optional.of(task));

        assertThatThrownBy(() -> orderService.completeTask(5L, intruder))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Nie jesteś przypisany");
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("completeTask: ostatnie zadanie ukończone → status ZREALIZOWANE, 100%")
    void completeTask_lastTaskCompletesOrder() {
        User worker = User.builder().id(10L).username("w1").role(UserRole.WORKER).build();
        Order order = Order.builder().id(1L).status(OrderStatus.W_REALIZACJI).build();
        order.getAssignedWorkers().add(worker);
        ProductionTask task = ProductionTask.builder().id(5L).description("krok").completed(false).order(order).build();
        order.getProductionTasks().add(task);
        when(productionTaskRepository.findById(5L)).thenReturn(Optional.of(task));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        Order result = orderService.completeTask(5L, worker);

        assertThat(task.getCompleted()).isTrue();
        assertThat(result.getCompletionPercentage()).isEqualTo(100);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.ZREALIZOWANE);
    }

    @Test
    @DisplayName("assignWorkers: odrzuca użytkownika który nie jest pracownikiem")
    void assignWorkers_rejectsNonWorker() {
        Order order = Order.builder().id(1L).status(OrderStatus.W_REALIZACJI).build();
        User manager = User.builder().id(30L).username("mgr").role(UserRole.MANAGER).build();
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(userRepository.findById(30L)).thenReturn(Optional.of(manager));

        assertThatThrownBy(() -> orderService.assignWorkers(1L, List.of(30L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nie jest pracownikiem");
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("assignWorkers: poprawnie ustawia zbiór przypisanych pracowników")
    void assignWorkers_setsWorkers() {
        Order order = Order.builder().id(1L).status(OrderStatus.W_REALIZACJI).build();
        User w1 = User.builder().id(10L).username("w1").role(UserRole.WORKER).build();
        User w2 = User.builder().id(11L).username("w2").role(UserRole.WORKER).build();
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(userRepository.findById(10L)).thenReturn(Optional.of(w1));
        when(userRepository.findById(11L)).thenReturn(Optional.of(w2));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        Order result = orderService.assignWorkers(1L, List.of(10L, 11L));

        assertThat(result.getAssignedWorkers()).extracting(User::getId)
                .containsExactlyInAnyOrder(10L, 11L);
    }

    @Test
    @DisplayName("cancelExpiredOrders: przeterminowane oferty → ANULOWANE i zarchiwizowane")
    void cancelExpiredOrders_cancelsAndArchives() {
        Order expired = Order.builder()
                .id(2L)
                .status(OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA)
                .customerAcceptanceDeadline(LocalDateTime.now().minusHours(1))
                .build();
        when(orderRepository.findByStatusAndCustomerAcceptanceDeadlineBefore(
                eq(OrderStatus.ZAAKCEPTOWANE_PRZEZ_MISTRZA), any(LocalDateTime.class)))
                .thenReturn(List.of(expired));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        orderService.cancelExpiredOrders();

        assertThat(expired.getStatus()).isEqualTo(OrderStatus.ANULOWANE);
        assertThat(expired.getArchived()).isTrue();
        verify(orderRepository).save(expired);
    }
}
