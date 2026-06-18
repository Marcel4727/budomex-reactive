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

@Table("order_history")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderHistory {

    @Id
    private Long id;

    // FK -> orders.id (zastepuje relacje @ManyToOne Order)
    @Column("order_id")
    private Long orderId;

    // Poprzedni status
    @Column("previous_status")
    private OrderStatus previousStatus;

    // Nowy status
    @Column("new_status")
    private OrderStatus newStatus;

    // FK -> users.id (uzytkownik, ktory dokonal zmiany)
    @Column("changed_by_id")
    private Long changedById;

    // Notatki do zmiany
    @Column("notes")
    private String notes;

    // Data zmiany
    @Column("changed_at")
    @Builder.Default
    private LocalDateTime changedAt = LocalDateTime.now();

    // Metoda fabryczna do tworzenia wpisu historii
    public static OrderHistory createEntry(Long orderId, OrderStatus previousStatus,
                                            OrderStatus newStatus, Long changedById, String notes) {
        return OrderHistory.builder()
                .orderId(orderId)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .changedById(changedById)
                .notes(notes)
                .build();
    }
}
