package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.OrderStatus;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

@Repository
public interface OrderRepository extends R2dbcRepository<Order, Long> {

    Flux<Order> findByArchivedFalseOrderBySubmissionDateDesc();

    Flux<Order> findByArchivedTrueOrderBySubmissionDateDesc();

    Flux<Order> findByStatusOrderBySubmissionDateDesc(OrderStatus status);

    Mono<Order> findByAcceptanceToken(String acceptanceToken);

    Flux<Order> findByStatusAndCustomerAcceptanceDeadlineBefore(OrderStatus status, LocalDateTime deadline);

    Mono<Long> countByStatus(OrderStatus status);

    Flux<Order> findByStatusAndInstallationDateBefore(OrderStatus status, LocalDateTime date);

    Flux<Order> findByStatusAndReminderSentFalseAndCustomerAcceptanceDeadlineBefore(OrderStatus status, LocalDateTime deadline);
}
