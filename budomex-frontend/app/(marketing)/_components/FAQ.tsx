"use client";

import { useState, type ReactNode } from "react";
import Icon from "./Icon";

type FaqItem = {
  q: string;
  a: ReactNode;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Jak długo trwa wycena?",
    a: (
      <>
        Maksymalnie <strong>48&nbsp;godzin roboczych</strong> od momentu, gdy
        dostaniemy twoje zapytanie. W praktyce w 2025 średnia to 31&nbsp;godzin.
        Jeśli pomiar nie jest konieczny - często odpowiadamy tego samego dnia.
      </>
    ),
  },
  {
    q: "Czy robicie pomiar przed wyceną?",
    a: (
      <>
        Tak, jeśli to konieczne - i jest <strong>za darmo</strong> w promieniu
        40&nbsp;km od Bydgoszczy. Pomiar wykonuje technik z naszego zespołu, nie
        podwykonawca. Termin pomiaru uzgadniamy w ciągu jednej rozmowy.
      </>
    ),
  },
  {
    q: "Jakie są warunki gwarancji?",
    a: (
      <>
        <strong>7&nbsp;lat na montaż</strong> i{" "}
        <strong>10&nbsp;lat na profile PCV</strong> (producenta). Gwarancja
        obejmuje pełną naprawę lub wymianę - z naszym dojazdem. Warunki zapisane
        w protokole odbioru, który dostajesz w dniu montażu.
      </>
    ),
  },
  {
    q: "W jakim regionie działacie?",
    a: (
      <>
        <strong>Bydgoszcz</strong> i okolice do ok. 60&nbsp;km: Osielsko, Solec
        Kujawski, Białe Błota, Koronowo, Nakło, Inowrocław, Toruń. Dla większych
        zamówień - także dalej, do uzgodnienia indywidualnie.
      </>
    ),
  },
  {
    q: "Jakie sposoby płatności akceptujecie?",
    a: (
      <>
        Przelew bankowy w dwóch ratach: <strong>30% zaliczki</strong> po
        akceptacji wyceny, <strong>70% po montażu</strong> i podpisaniu
        protokołu. Możliwa płatność ratalna 0% przez Santander Consumer Bank
        (do 36&nbsp;rat, dla zamówień powyżej 5&nbsp;000&nbsp;zł).
      </>
    ),
  },
  {
    q: "Co jeśli termin się przesunie?",
    a: (
      <>
        Uprzedzamy z wyprzedzeniem minimum <strong>7&nbsp;dni</strong>. Każde
        przesunięcie pojawia się w panelu śledzenia z powodem (np. &bdquo;czekamy
        na profil aluminiowy, dostawa 8.06&rdquo;). Jeśli przesunięcie wynika
        z naszej winy i przekracza 14&nbsp;dni - rabat 2% od wartości zamówienia.
      </>
    ),
  },
  {
    q: "Jak działa śledzenie zamówienia?",
    a: (
      <>
        Po akceptacji wyceny dostajesz <strong>własny link</strong>, który
        otwierasz w przeglądarce - bez logowania i bez aplikacji. Widzisz
        aktualny status, postęp produkcji w procentach, imię montażysty,
        zaplanowaną datę i godziny montażu oraz każdą zmianę wraz z powodem.
        Dane aktualizują się automatycznie.
      </>
    ),
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section className="section paper-2" id="faq">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Najczęstsze pytania</div>
          <h2>Siedem rzeczy, o&nbsp;które pytają najczęściej.</h2>
          <p className="sub">
            Nie ma tu twojego pytania? Zadzwoń lub napisz - odpowiadamy
            w&nbsp;ciągu jednego dnia roboczego.
          </p>
        </div>
        <div className="faq-wrap">
          <aside className="faq-aside">
            <div className="eyebrow">Wolisz porozmawiać?</div>
            <h3>Złap nas pod telefonem</h3>
            <p>
              W godzinach pracy odbiera Marek lub Ewa - nie infolinia, nie bot.
              Najczęściej da się ustalić wycenę w&nbsp;ciągu jednej rozmowy.
            </p>
            <a href="tel:+48528501200" className="phone-line">
              <Icon name="phone" size={16} />
              +48 52 850 12 00
            </a>
            <div className="faq-meta">
              pon-pt 8:00-17:00 · sob 9:00-13:00
            </div>
          </aside>

          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div className={`faq-item ${isOpen ? "open" : ""}`} key={i}>
                  <h3 className="faq-q-h">
                    <button
                      type="button"
                      className="faq-q"
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                    >
                      <span>{item.q}</span>
                      <span className="chevron">
                        <Icon name="chevron-down" size={16} />
                      </span>
                    </button>
                  </h3>
                  <div
                    className="faq-a"
                    id={`faq-a-${i}`}
                    role="region"
                    aria-hidden={!isOpen}
                  >
                    <div className="faq-a-inner">{item.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
