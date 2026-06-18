import Icon from "./Icon";

export default function WhyUs() {
  return (
    <section className="section paper-2">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Dlaczego Budomex</div>
          <h2>
            Trzy rzeczy, których nie&nbsp;dostaniesz w&nbsp;markecie budowlanym.
          </h2>
        </div>
        <div className="usp-grid">
          <div className="usp highlight">
            <div className="usp-icon">
              <Icon name="radio" size={24} />
            </div>
            <h3>Śledzenie zamówienia na żywo</h3>
            <p>
              Po akceptacji wyceny dostajesz własny link. Widzisz status
              produkcji, imię montażysty oraz datę pomiaru i&nbsp;montażu - bez
              logowania, bez aplikacji.
            </p>
            <div className="usp-mini" aria-hidden="true">
              <div className="row">
                <span>Produkcja profili</span>
                <span>
                  <strong>65%</strong>
                </span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" />
              </div>
              <div className="row">
                <span>Montażysta</span>
                <span>
                  <strong>Tomasz W.</strong>
                </span>
              </div>
              <div className="row">
                <span>Termin montażu</span>
                <span>
                  <strong>śr. 12.06</strong>
                </span>
              </div>
              <div className="row">
                <span>Status</span>
                <span className="live">w produkcji</span>
              </div>
            </div>
          </div>

          <div className="usp">
            <div className="usp-icon">
              <Icon name="hard-hat" size={24} />
            </div>
            <h3>Lokalny zespół montażowy</h3>
            <p>
              Bez podwykonawców z&nbsp;ogłoszenia. Montaż wykonuje nasz
              pracownik z&nbsp;imienia i&nbsp;nazwiska, z&nbsp;naszym narzędziem
              i&nbsp;naszą odpowiedzialnością.
            </p>
          </div>

          <div className="usp">
            <div className="usp-icon">
              <Icon name="smile" size={24} />
            </div>
            <h3>Stała cena, bez niespodzianek</h3>
            <p>
              To, co zaakceptujesz w&nbsp;wycenie, to&nbsp;to&nbsp;co zapłacisz.
              Materiał, dowóz, demontaż starych okien, montaż i&nbsp;listwy
              maskujące w&nbsp;jednej pozycji.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
