"use client";

import Icon from "./Icon";
import HeroSlideshow from "./HeroSlideshow";

const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
};

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="container">
        <div className="hero-grid">
          <div>
            <h1>
              Stolarka otworowa, której{" "}
              <span className="accent">nie&nbsp;musisz pilnować.</span>
            </h1>
            <p className="lead">
              Wyceniamy w&nbsp;48&nbsp;godzin, produkujemy u&nbsp;siebie w&nbsp;zakładzie
              i&nbsp;montujemy w&nbsp;umówionym terminie. Postęp sprawdzasz na bieżąco
              pod jednym linkiem - bez telefonów &bdquo;kiedy będzie gotowe&rdquo;.
            </p>
            <div className="hero-cta">
              <a
                href="#wycena"
                className="btn xl primary-cta"
                onClick={scrollTo("#wycena")}
              >
                Wyceń za darmo
                <Icon name="arrow-right" size={18} />
              </a>
            </div>
            <div className="hero-trust">
              <div>
                <div className="stat-num">48&nbsp;h</div>
                <div className="stat-label">Gwarancja wyceny</div>
              </div>
              <div>
                <div className="stat-num">95%</div>
                <div className="stat-label">Terminów dotrzymanych w&nbsp;2025</div>
              </div>
              <div>
                <div className="stat-num">500+</div>
                <div className="stat-label">Zrealizowanych zamówień</div>
              </div>
            </div>
          </div>

          <div className="hero-illustration">
            <HeroSlideshow />
          </div>
        </div>
      </div>
    </section>
  );
}
