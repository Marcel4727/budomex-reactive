package com.pbs.BudomexWebApp.service;

import com.pbs.BudomexWebApp.entity.ProductType;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class ProductionTaskTemplateService {

    private static final Map<ProductType, List<String>> TEMPLATES = Map.of(
            ProductType.OKNO, List.of(
                    "Zamówienie profili i szyb",
                    "Cięcie profili PCV/aluminium",
                    "Zgrzewanie/łączenie ram",
                    "Montaż szyb zespolonych",
                    "Montaż okuć i zawiasów",
                    "Montaż uszczelek",
                    "Montaż parapetu wewnętrznego",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.BRAMA, List.of(
                    "Zamówienie materiałów i segmentów",
                    "Przygotowanie profili i segmentów",
                    "Montaż segmentów bramy",
                    "Instalacja prowadnic",
                    "Montaż napędu i automatyki",
                    "Regulacja i testowanie mechanizmu",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.DRZWI, List.of(
                    "Przygotowanie ramy i ościeżnicy",
                    "Przygotowanie skrzydła drzwiowego",
                    "Montaż wypełnienia/panelu",
                    "Instalacja zamka i klamki",
                    "Montaż zawiasów i okuć",
                    "Montaż uszczelek i progów",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.ROLETA_ZEWNETRZNA, List.of(
                    "Zamówienie materiałów",
                    "Przygotowanie pancerza rolety",
                    "Montaż skrzynki i prowadnic",
                    "Instalacja mechanizmu nawijającego",
                    "Montaż silnika/napędu",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.ROLETA_WEWNETRZNA, List.of(
                    "Zamówienie materiałów",
                    "Przygotowanie lameli/tkaniny",
                    "Montaż mechanizmu i kasety",
                    "Instalacja prowadnic/łańcuszka",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.PARAPET, List.of(
                    "Zamówienie materiału (konglomerat/kamień/PCV)",
                    "Cięcie i formatowanie na wymiar",
                    "Obróbka krawędzi i zaślepki",
                    "Polerowanie/wykończenie powierzchni",
                    "Kontrola jakości i pakowanie"
            ),
            ProductType.INNE, List.of(
                    "Zamówienie materiałów",
                    "Przygotowanie elementów",
                    "Montaż i składanie",
                    "Wykończenie i regulacja",
                    "Kontrola jakości i pakowanie"
            )
    );

    public List<String> getTemplateTasksForProductType(ProductType type) {
        return TEMPLATES.getOrDefault(type, TEMPLATES.get(ProductType.INNE));
    }
}
