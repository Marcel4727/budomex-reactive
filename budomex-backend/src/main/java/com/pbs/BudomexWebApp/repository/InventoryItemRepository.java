package com.pbs.BudomexWebApp.repository;

import com.pbs.BudomexWebApp.entity.InventoryItem;
import com.pbs.BudomexWebApp.entity.ProductType;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface InventoryItemRepository extends R2dbcRepository<InventoryItem, Long> {

    Flux<InventoryItem> findByCategoryOrderByNameAsc(ProductType category);

    Flux<InventoryItem> findAllByOrderByCategoryAscNameAsc();
}
