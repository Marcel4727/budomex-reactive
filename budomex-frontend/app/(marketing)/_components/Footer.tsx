"use client";

import Logo from "./Logo";

const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand-row">
              <Logo />
            </div>
            <p className="desc">
              Rodzinna firma stolarki otworowej z&nbsp;Bydgoszczy. Robimy okna,
              drzwi, bramy, rolety i&nbsp;parapety. Wyceniamy w&nbsp;48&nbsp;godzin,
              montujemy w&nbsp;umówionym terminie.
            </p>
          </div>

          <div>
            <h5>Oferta</h5>
            <a href="#oferta" onClick={scrollTo("#oferta")}>
              Okna
            </a>
            <a href="#oferta" onClick={scrollTo("#oferta")}>
              Drzwi
            </a>
            <a href="#oferta" onClick={scrollTo("#oferta")}>
              Bramy
            </a>
            <a href="#oferta" onClick={scrollTo("#oferta")}>
              Rolety
            </a>
            <a href="#oferta" onClick={scrollTo("#oferta")}>
              Parapety
            </a>
          </div>

          <div>
            <h5>Firma</h5>
            <div className="meta-block">
              <div>Budomex Sp. z&nbsp;o.o.</div>
              <div>
                ul. Juliusza Kossaka 35
                <br />
                85-307 Bydgoszcz
              </div>
              <div className="lab">Dane rejestrowe</div>
              <div>NIP 953 277 41 22</div>
              <div>REGON 340 992 411</div>
              <div>KRS 0000 412 553</div>
            </div>
          </div>

          <div>
            <h5>Kontakt</h5>
            <div className="meta-block">
              <a href="tel:+48528501200" style={{ padding: 0 }}>
                +48 52 850 12 00
              </a>
              <a href="mailto:biuro@budomex.pl" style={{ padding: 0 }}>
                biuro@budomex.pl
              </a>
              <div aria-hidden="true">&nbsp;</div>
              <div className="lab">Godziny</div>
              <div>pon-pt 8:00-17:00</div>
              <div>sob 9:00-13:00</div>
            </div>
          </div>
        </div>

        <div className="legal">
          <div>© 2026 Budomex Sp. z&nbsp;o.o. · Wszystkie prawa zastrzeżone</div>
          <div className="legal-links">
            <a href="#" onClick={(e) => e.preventDefault()}>
              Polityka prywatności
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Regulamin
            </a>
            <a href="#" onClick={(e) => e.preventDefault()}>
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
