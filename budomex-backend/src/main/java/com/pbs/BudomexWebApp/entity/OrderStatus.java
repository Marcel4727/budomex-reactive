package com.pbs.BudomexWebApp.entity;

/**
 * Status zamówienia w systemie.
 */
public enum OrderStatus {
    OCZEKUJACE,           // Nowa wycena czeka na zatwierdzenie Mistrza
    ZAAKCEPTOWANE_PRZEZ_MISTRZA,  // Mistrz zatwierdził, email wysłany do klienta (48h na odpowiedź)
    W_REALIZACJI,         // Klient zaakceptował, produkcja w toku
    ZREALIZOWANE,         // Produkcja zakończona, gotowe do montażu
    MONTAZ,               // Montaż zaplanowany, oczekiwanie na wykonanie
    ANULOWANE,            // Odrzucone lub brak odpowiedzi klienta
    KONIEC                // Montaż wykonany, zamówienie w archiwum
}
