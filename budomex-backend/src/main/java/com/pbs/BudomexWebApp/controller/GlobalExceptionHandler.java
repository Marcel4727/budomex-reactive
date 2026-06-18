package com.pbs.BudomexWebApp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Zamienia błędy na czytelną odpowiedź 400 w formacie {"error": "..."} —
 * spójnym z resztą API i obsługiwanym już przez frontend.
 *
 * W wersji reaktywnej kontrolery NIE łapią wyjątków lokalnie przez try/catch
 * (błąd biznesowy z serwisu leci przez Mono.error/Flux.error) — dlatego ten
 * handler dodatkowo łapie IllegalArgumentException/IllegalStateException,
 * które wcześniej każdy kontroler obsługiwał osobno.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Nieprawidłowe dane wejściowe";
        }
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleBusinessError(RuntimeException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}
