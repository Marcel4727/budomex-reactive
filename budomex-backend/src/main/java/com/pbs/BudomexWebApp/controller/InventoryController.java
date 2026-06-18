package com.pbs.BudomexWebApp.controller;

import com.pbs.BudomexWebApp.entity.InventoryItem;
import com.pbs.BudomexWebApp.entity.ProductType;
import com.pbs.BudomexWebApp.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public Mono<ResponseEntity<Map<String, Object>>> getAllItems() {
        return inventoryService.getAllItems()
                .collectList()
                .map(items -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("items", items.stream().map(this::toDto).collect(Collectors.toList()));
                    response.put("lowStockCount", items.stream().filter(InventoryItem::isLowStock).count());
                    return ResponseEntity.ok(response);
                });
    }

    @GetMapping("/low-stock")
    public Mono<ResponseEntity<List<Map<String, Object>>>> getLowStockItems() {
        return inventoryService.getLowStockItems()
                .map(this::toDto)
                .collectList()
                .map(ResponseEntity::ok);
    }

    @PostMapping
    public Mono<ResponseEntity<Map<String, Object>>> createItem(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        ProductType category = ProductType.valueOf((String) payload.get("category"));
        String unit = (String) payload.get("unit");
        Integer currentQuantity = payload.get("currentQuantity") != null ?
                Integer.parseInt(payload.get("currentQuantity").toString()) : 0;
        Integer minimumThreshold = payload.get("minimumThreshold") != null ?
                Integer.parseInt(payload.get("minimumThreshold").toString()) : 10;

        return inventoryService.createItem(name, category, unit, currentQuantity, minimumThreshold)
                .map(item -> ResponseEntity.ok(toDto(item)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PutMapping("/{id}")
    public Mono<ResponseEntity<Map<String, Object>>> updateItem(@PathVariable Long id,
                                                                  @RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("name");
        Integer currentQuantity = payload.get("currentQuantity") != null ?
                Integer.parseInt(payload.get("currentQuantity").toString()) : null;
        Integer minimumThreshold = payload.get("minimumThreshold") != null ?
                Integer.parseInt(payload.get("minimumThreshold").toString()) : null;

        return inventoryService.updateItem(id, name, currentQuantity, minimumThreshold)
                .map(item -> ResponseEntity.ok(toDto(item)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @PostMapping("/{id}/adjust")
    public Mono<ResponseEntity<Map<String, Object>>> adjustStock(@PathVariable Long id,
                                                                   @RequestBody Map<String, Integer> payload) {
        Integer delta = payload.get("delta");
        return inventoryService.adjustStock(id, delta)
                .map(item -> ResponseEntity.ok(toDto(item)))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    @DeleteMapping("/{id}")
    public Mono<ResponseEntity<Map<String, String>>> deleteItem(@PathVariable Long id) {
        return inventoryService.deleteItem(id)
                .then(Mono.just(ResponseEntity.ok(Map.of("message", "Pozycja usunięta"))))
                .onErrorResume(e -> Mono.just(ResponseEntity.badRequest().body(Map.of("error", e.getMessage()))));
    }

    private Map<String, Object> toDto(InventoryItem item) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", item.getId());
        data.put("name", item.getName());
        data.put("category", item.getCategory().name());
        data.put("unit", item.getUnit());
        data.put("currentQuantity", item.getCurrentQuantity());
        data.put("reservedQuantity", item.getReservedQuantity());
        data.put("availableQuantity", item.getAvailableQuantity());
        data.put("minimumThreshold", item.getMinimumThreshold());
        data.put("lowStock", item.isLowStock());
        return data;
    }
}
