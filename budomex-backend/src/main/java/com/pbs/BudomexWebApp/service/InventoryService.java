package com.pbs.BudomexWebApp.service;

import com.pbs.BudomexWebApp.entity.InventoryItem;
import com.pbs.BudomexWebApp.entity.Order;
import com.pbs.BudomexWebApp.entity.ProductType;
import com.pbs.BudomexWebApp.repository.InventoryItemRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);
    private final InventoryItemRepository repository;
    private final RealtimeNotificationService realtime;

    public Flux<InventoryItem> getAllItems() {
        return repository.findAllByOrderByCategoryAscNameAsc();
    }

    public Flux<InventoryItem> getItemsByCategory(ProductType category) {
        return repository.findByCategoryOrderByNameAsc(category);
    }

    public Flux<InventoryItem> getLowStockItems() {
        return getAllItems().filter(InventoryItem::isLowStock);
    }

    @Transactional
    public Mono<InventoryItem> createItem(String name, ProductType category, String unit,
                                           Integer currentQuantity, Integer minimumThreshold) {
        InventoryItem item = InventoryItem.builder()
                .name(name)
                .category(category)
                .unit(unit != null ? unit : "szt.")
                .currentQuantity(currentQuantity != null ? currentQuantity : 0)
                .minimumThreshold(minimumThreshold != null ? minimumThreshold : 10)
                .build();
        return repository.save(item)
                .flatMap(saved -> realtime.notifyInventory().thenReturn(saved));
    }

    @Transactional
    public Mono<InventoryItem> updateItem(Long id, String name, Integer currentQuantity, Integer minimumThreshold) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Pozycja nie znaleziona: " + id)))
                .flatMap(item -> {
                    if (name != null) item.setName(name);
                    if (currentQuantity != null) item.setCurrentQuantity(currentQuantity);
                    if (minimumThreshold != null) item.setMinimumThreshold(minimumThreshold);
                    return repository.save(item);
                })
                .flatMap(saved -> realtime.notifyInventory().thenReturn(saved));
    }

    @Transactional
    public Mono<InventoryItem> adjustStock(Long id, Integer delta) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Pozycja nie znaleziona: " + id)))
                .flatMap(item -> {
                    int newQuantity = item.getCurrentQuantity() + delta;
                    if (newQuantity < 0) {
                        return Mono.error(new IllegalStateException("Stan magazynowy nie może być ujemny"));
                    }
                    item.setCurrentQuantity(newQuantity);
                    return repository.save(item);
                })
                .flatMap(saved -> realtime.notifyInventory().thenReturn(saved));
    }

    @Transactional
    public Mono<Void> deleteItem(Long id) {
        return repository.deleteById(id)
                .then(realtime.notifyInventory());
    }

    /**
     * Automatyczna rezerwacja materiałów po akceptacji zamówienia przez klienta.
     * Rezerwuje pierwszą dostępną pozycję magazynową pasującą do typu produktu.
     */
    @Transactional
    public Mono<Void> reserveForOrder(Order order) {
        return repository.findByCategoryOrderByNameAsc(order.getProductType())
                .next() // pierwsza pozycja (lub Mono.empty jeśli brak)
                .switchIfEmpty(Mono.<InventoryItem>fromRunnable(() ->
                        log.warn("Brak pozycji magazynowych dla typu {}, rezerwacja pominięta dla zamówienia #{}",
                                order.getProductType(), order.getId())))
                .flatMap(item -> {
                    int needed = order.getQuantity() != null ? order.getQuantity() : 1;
                    item.setReservedQuantity(item.getReservedQuantity() + needed);
                    return repository.save(item)
                            .doOnNext(saved -> log.info("Zarezerwowano {} {} pozycji '{}' dla zamówienia #{}",
                                    needed, saved.getUnit(), saved.getName(), order.getId()));
                })
                .then();
    }
}
