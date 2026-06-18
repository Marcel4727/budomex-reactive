package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.OrderAssignedWorker;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Zastepuje relacje @ManyToMany Order.assignedWorkers z wersji JPA.
 * Kazdy wiersz to przypisanie jednego pracownika do jednego zamowienia.
 */
@Repository
public interface OrderAssignedWorkerRepository extends R2dbcRepository<OrderAssignedWorker, Long> {

    Flux<OrderAssignedWorker> findByOrderId(Long orderId);

    Flux<OrderAssignedWorker> findByUserId(Long userId);

    Mono<Boolean> existsByOrderIdAndUserId(Long orderId, Long userId);

    Mono<Void> deleteByOrderId(Long orderId);

    Mono<Void> deleteByOrderIdAndUserId(Long orderId, Long userId);
}
