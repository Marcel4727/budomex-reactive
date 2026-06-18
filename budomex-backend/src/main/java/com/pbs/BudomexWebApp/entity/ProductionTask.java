package com.pbs.BudomexWebApp.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Table("production_tasks")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductionTask {

    @Id
    private Long id;

    // FK -> orders.id (zastepuje relacje @ManyToOne Order)
    @Column("order_id")
    private Long orderId;

    // Opis zadania
    @Column("description")
    private String description;

    // Kategoria/typ zadania
    @Column("category")
    private String category;

    // Numer kolejnosci (do sortowania)
    @Column("sequence_number")
    @Builder.Default
    private Integer sequenceNumber = 0;

    // Czy zadanie jest ukonczone
    @Column("completed")
    @Builder.Default
    private Boolean completed = false;

    // Data ukonczenia zadania
    @Column("completed_at")
    private LocalDateTime completedAt;

    // FK -> users.id (pracownik, ktory ukonczyl zadanie)
    @Column("completed_by_id")
    private Long completedById;

    // Notatki do zadania
    @Column("notes")
    private String notes;

    @Column("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column("updated_at")
    private LocalDateTime updatedAt;

    // Metoda pomocnicza do oznaczania zadania jako ukonczone
    public void markAsCompleted(Long workerId) {
        this.completed = true;
        this.completedAt = LocalDateTime.now();
        this.completedById = workerId;
        this.updatedAt = LocalDateTime.now();
    }

    // Metoda pomocnicza do cofania ukonczenia
    public void markAsIncomplete() {
        this.completed = false;
        this.completedAt = null;
        this.completedById = null;
        this.updatedAt = LocalDateTime.now();
    }
}
