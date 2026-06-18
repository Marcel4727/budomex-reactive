package com.pbs.BudomexWebApp;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testy integracyjne (JUnit 5 + Spring MockMvc): pełny kontekst aplikacji,
 * baza H2, łańcuch Spring Security. Sprawdzają logowanie, walidację serwerową
 * i ochronę endpointów.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("POST /api/auth/login — poprawne dane zwracają token i imię i nazwisko")
    void login_validReturnsTokenAndFullName() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"manager\",\"password\":\"manager123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.fullName").value("Jan Mistrz"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_MANAGER"));
    }

    @Test
    @DisplayName("POST /api/auth/login — błędne hasło zwraca 4xx")
    void login_wrongPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"manager\",\"password\":\"zle\"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("POST /api/auth/login — puste pola → 400 z komunikatem walidacji")
    void login_blankFailsValidation() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/customer/quote — niepoprawne dane → 400 (walidacja serwerowa)")
    void quote_invalidFailsValidation() throws Exception {
        mockMvc.perform(post("/api/customer/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"\",\"customerEmail\":\"zlyemail\",\"productType\":\"OKNO\",\"productSpecifications\":\"s\",\"quantity\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/customer/quote — poprawne dane → 200 i numer zamówienia")
    void quote_validCreatesOrder() throws Exception {
        mockMvc.perform(post("/api/customer/quote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerName\":\"Anna Test\",\"customerEmail\":\"anna@test.pl\",\"customerPhone\":\"500600700\",\"customerAddress\":\"ul. Testowa 1\",\"productType\":\"OKNO\",\"productSpecifications\":\"biale 120x150\",\"quantity\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/manager/orders bez tokenu → odmowa dostępu")
    void managerEndpoint_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/manager/orders"))
                .andExpect(status().is4xxClientError());
    }
}
