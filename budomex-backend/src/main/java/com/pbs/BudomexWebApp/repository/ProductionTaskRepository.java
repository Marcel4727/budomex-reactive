package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.ProductionTask;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface ProductionTaskRepository extends R2dbcRepository<ProductionTask, Long> {

    Flux<ProductionTask> findByOrderIdOrderBySequenceNumberAsc(Long orderId);

    Mono<Long> countByOrderId(Long orderId);

    Mono<Long> countByOrderIdAndCompletedTrue(Long orderId);

    Mono<Void> deleteByOrderId(Long orderId);
}
