package com.pbs.BudomexWebApp.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Table("inventory_items")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItem {

    @Id
    private Long id;

    @Column("name")
    private String name;

    @Column("category")
    private ProductType category;

    @Column("unit")
    @Builder.Default
    private String unit = "szt.";

    @Column("current_quantity")
    @Builder.Default
    private Integer currentQuantity = 0;

    @Column("reserved_quantity")
    @Builder.Default
    private Integer reservedQuantity = 0;

    @Column("minimum_threshold")
    @Builder.Default
    private Integer minimumThreshold = 10;

    @Column("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column("updated_at")
    private LocalDateTime updatedAt;

    @Transient
    public Integer getAvailableQuantity() {
        return currentQuantity - reservedQuantity;
    }

    @Transient
    public boolean isLowStock() {
        return getAvailableQuantity() < minimumThreshold;
    }
}
