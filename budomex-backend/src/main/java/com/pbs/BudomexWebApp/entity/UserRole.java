package com.pbs.BudomexWebApp.entity;

/**
 * Role użytkowników w systemie.
 */
public enum UserRole {
    CUSTOMER,   // Klient - dostęp do formularza wyceny
    MANAGER,    // Mistrz - zarządzanie zamówieniami
    WORKER      // Pracownik produkcji (Mongol) - realizacja zamówień
}
