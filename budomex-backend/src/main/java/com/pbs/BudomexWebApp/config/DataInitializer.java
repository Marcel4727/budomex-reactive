package com.pbs.BudomexWebApp.config;

import com.pbs.BudomexWebApp.entity.InventoryItem;
import com.pbs.BudomexWebApp.entity.ProductType;
import com.pbs.BudomexWebApp.entity.User;
import com.pbs.BudomexWebApp.entity.UserRole;
import com.pbs.BudomexWebApp.repository.InventoryItemRepository;
import com.pbs.BudomexWebApp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

/**
 * Tworzy domyślne konta testowe i przykładowe pozycje magazynowe przy starcie aplikacji.
 *
 * Wersja w pełni nieblokująca: zamiast {@code ApplicationRunner} + {@code Mono.block()}
 * (które wstrzymywałoby wątek startowy aplikacji do zakończenia operacji na bazie),
 * używamy {@code @EventListener(ApplicationReadyEvent.class)} i wołamy
 * {@code .subscribe()} — to uruchamia łańcuch reaktywny "w tle", na wątkach
 * Reactora (event loop), bez blokowania niczego. Spring kontynuuje start
 * aplikacji (i Netty zaczyna przyjmować ruch) bez czekania na ten Mono.
 *
 * Kompromis: istnieje teoretyczne, mikroskopijne okno czasowe między
 * startem serwera a zakończeniem zapisu danych startowych, w którym bardzo
 * wczesny request mógłby nie zastać jeszcze np. konta "manager" w bazie.
 * W praktyce (dane startowe, lokalny H2/Postgres) ten zapis trwa
 * single-digit milisekund, więc ryzyko jest czysto teoretyczne — ale
 * warto o nim wiedzieć, gdyby ktoś pytał o ten wzorzec.
 *
 * Usunięto fixEnumCheckConstraints() z wersji JPA — był potrzebny tylko jako
 * obejście automatycznego DDL Hibernate (ddl-auto), które generowało CHECK
 * constrainty na starych wartościach enuma. Nasz schema.sql (R2DBC, ręczny)
 * mapuje enumy na zwykłe VARCHAR bez CHECK, więc problem nie istnieje.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final InventoryItemRepository inventoryRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        createUserIfNotExists("manager", "manager@budomex.pl", "manager123", UserRole.MANAGER, "Jan", "Mistrz")
                .then(createUserIfNotExists("worker", "worker@budomex.pl", "worker123", UserRole.WORKER, "Piotr", "Mongol"))
                .then(createUserIfNotExists("worker2", "worker2@budomex.pl", "worker123", UserRole.WORKER, "Adam", "Nowak"))
                .then(createUserIfNotExists("worker3", "worker3@budomex.pl", "worker123", UserRole.WORKER, "Tomasz", "Kowalski"))
                .then(initializeInventoryIfEmpty())
                .doOnError(e -> log.error("Błąd podczas inicjalizacji danych startowych", e))
                .subscribe();
    }

    private Mono<Void> initializeInventoryIfEmpty() {
        return inventoryRepository.count()
                .filter(count -> count == 0)
                .flatMap(count -> {
                    log.info("Inicjalizacja przykładowych pozycji magazynowych...");
                    return Mono.when(
                            createItem("Profil PCV biały", ProductType.OKNO, "mb", 250, 50),
                            createItem("Szyba zespolona 4-16-4", ProductType.OKNO, "m²", 80, 30),
                            createItem("Okucie obwiedniowe", ProductType.OKNO, "kpl.", 45, 20),
                            createItem("Brama segmentowa - panel", ProductType.BRAMA, "szt.", 12, 5),
                            createItem("Napęd elektryczny", ProductType.BRAMA, "szt.", 8, 3),
                            createItem("Skrzydło drzwi antywłamaniowych", ProductType.DRZWI, "szt.", 15, 5),
                            createItem("Zamek wielopunktowy", ProductType.DRZWI, "szt.", 22, 10),
                            createItem("Pancerz rolety aluminiowy", ProductType.ROLETA_ZEWNETRZNA, "m²", 60, 20),
                            createItem("Silnik rolety", ProductType.ROLETA_ZEWNETRZNA, "szt.", 30, 10),
                            createItem("Tkanina rolety wewnętrznej", ProductType.ROLETA_WEWNETRZNA, "m²", 100, 30),
                            createItem("Parapet konglomeratowy biały", ProductType.PARAPET, "mb", 40, 15),
                            createItem("Parapet drewniany dębowy", ProductType.PARAPET, "mb", 8, 10),
                            createItem("Moskitiera", ProductType.INNE, "szt.", 25, 10)
                    );
                })
                .then();
    }

    private Mono<InventoryItem> createItem(String name, ProductType category, String unit, Integer qty, Integer threshold) {
        InventoryItem item = InventoryItem.builder()
                .name(name)
                .category(category)
                .unit(unit)
                .currentQuantity(qty)
                .minimumThreshold(threshold)
                .build();
        return inventoryRepository.save(item);
    }

    private Mono<Void> createUserIfNotExists(String username, String email, String password,
                                             UserRole role, String firstName, String lastName) {
        return userRepository.existsByUsername(username)
                .filter(exists -> !exists)
                .flatMap(notExists -> {
                    User user = User.builder()
                            .username(username)
                            .email(email)
                            .password(passwordEncoder.encode(password))
                            .role(role)
                            .firstName(firstName)
                            .lastName(lastName)
                            .build();
                    return userRepository.save(user)
                            .doOnNext(saved -> log.info("Utworzono domyślne konto: {} ({})", username, role));
                })
                .then();
    }
}