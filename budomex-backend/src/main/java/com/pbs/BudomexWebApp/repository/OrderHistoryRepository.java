package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.OrderHistory;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface OrderHistoryRepository extends R2dbcRepository<OrderHistory, Long> {

    Flux<OrderHistory> findByOrderIdOrderByChangedAtDesc(Long orderId);
}
