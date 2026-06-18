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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Encja zamowienia - wersja "plaska" dla R2DBC.
 *
 * UWAGA: R2DBC nie wspiera relacji (@OneToMany, @ManyToMany, cascade) tak jak JPA.
 * Powiazane dane sa teraz w osobnych tabelach/repozytoriach i doczytywane
 * reaktywnie w warstwie serwisow:
 *  - {@link ProductionTask} (order_id)         -> ProductionTaskRepository
 *  - {@link OrderHistory} (order_id)           -> OrderHistoryRepository
 *  - {@link OrderAssignedWorker} (order_id)    -> OrderAssignedWorkerRepository (zastepuje assignedWorkers)
 *  - approvedByManager                          -> approvedByManagerId (FK do users)
 */
@Table("orders")
@Getter
@Setter
@EqualsAndHashCode(of = "id")
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    private Long id;

    // Dane klienta
    @Column("customer_name")
    private String customerName;

    @Column("customer_email")
    private String customerEmail;

    @Column("customer_phone")
    private String customerPhone;

    @Column("customer_address")
    private String customerAddress;

    // Typ produktu
    @Column("product_type")
    private ProductType productType;

    // Specyfikacja produktu (JSON lub tekst z parametrami)
    @Column("product_specifications")
    private String productSpecifications;

    // Ilosc
    @Column("quantity")
    @Builder.Default
    private Integer quantity = 1;

    // Status zamowienia
    @Column("status")
    @Builder.Default
    private OrderStatus status = OrderStatus.OCZEKUJACE;

    // Cena (ustalona przez Mistrza)
    @Column("price")
    private BigDecimal price;

    // Data zlozenia zamowienia
    @Column("submission_date")
    @Builder.Default
    private LocalDateTime submissionDate = LocalDateTime.now();

    // Szacowana data dostawy (ustalona przez Mistrza)
    @Column("estimated_delivery_date")
    private LocalDate estimatedDeliveryDate;

    // Deadline na akceptacje przez klienta (48h od zatwierdzenia przez Mistrza)
    @Column("customer_acceptance_deadline")
    private LocalDateTime customerAcceptanceDeadline;

    // Czy klient zaakceptowal oferte
    @Column("customer_accepted")
    private Boolean customerAccepted;

    // Data akceptacji/odrzucenia przez klienta
    @Column("customer_response_date")
    private LocalDateTime customerResponseDate;

    // Data rozpoczecia produkcji
    @Column("production_start_date")
    private LocalDateTime productionStartDate;

    // Data zakonczenia produkcji
    @Column("production_end_date")
    private LocalDateTime productionEndDate;

    // Data i godzina montazu
    @Column("installation_date")
    private LocalDateTime installationDate;

    // Notatki Mistrza
    @Column("manager_notes")
    private String managerNotes;

    // Notatki produkcyjne
    @Column("production_notes")
    private String productionNotes;

    // Token do akceptacji zamowienia przez klienta (link w emailu)
    @Column("acceptance_token")
    private String acceptanceToken;

    // Czy wyslano przypomnienie o zblizajacym sie deadline (24h przed)
    @Column("reminder_sent")
    @Builder.Default
    private Boolean reminderSent = false;

    // Czy zamowienie jest zarchiwizowane
    @Column("archived")
    @Builder.Default
    private Boolean archived = false;

    // Procent ukonczenia produkcji (0-100)
    @Column("completion_percentage")
    @Builder.Default
    private Integer completionPercentage = 0;

    // Mistrz, ktory zatwierdzil zamowienie (FK -> users.id)
    @Column("approved_by_manager_id")
    private Long approvedByManagerId;

    @Column("created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column("updated_at")
    private LocalDateTime updatedAt;
}
