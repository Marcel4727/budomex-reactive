package com.pbs.BudomexWebApp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Walidowane wejście publicznego formularza wyceny.
 * Walidacja serwerowa wymagana przez specyfikację.
 */
public record QuoteRequest(
        @NotBlank(message = "Imię i nazwisko jest wymagane")
        String customerName,

        @NotBlank(message = "Email jest wymagany")
        @Email(message = "Nieprawidłowy adres email")
        String customerEmail,

        String customerPhone,

        String customerAddress,

        @NotBlank(message = "Typ produktu jest wymagany")
        String productType,

        @NotBlank(message = "Specyfikacja jest wymagana")
        String productSpecifications,

        @NotNull(message = "Ilość jest wymagana")
        @Min(value = 1, message = "Ilość musi być co najmniej 1")
        Integer quantity,

        String estimatedDeliveryDate
) {}
