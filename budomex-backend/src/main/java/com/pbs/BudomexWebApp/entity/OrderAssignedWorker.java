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

/**
 * Tabela laczaca zamowienia z przypisanymi pracownikami produkcji.
 * Zastepuje relacje @ManyToMany Order.assignedWorkers z wersji JPA -
 * R2DBC nie wspiera relacji wiele-do-wielu, wiec laczenie jest realizowane
 * recznie w {@code OrderService} (zapis/odczyt wierszy tej tabeli).
 */
@Table("order_assigned_workers")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderAssignedWorker {

    @Id
    private Long id;

    @Column("order_id")
    private Long orderId;

    @Column("user_id")
    private Long userId;
}
