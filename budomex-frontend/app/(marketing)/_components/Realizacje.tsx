import Icon from "./Icon";

type Realiz = {
  tag: string;
  title: string;
  place: string;
  date: string;
  count: string;
};

const REALIZACJE: Realiz[] = [
  {
    tag: "Okna PCV",
    title: "Okna PCV - dom jednorodzinny",
    place: "Bydgoszcz, Fordon",
    date: "03.2026",
    count: "12 okien",
  },
  {
    tag: "Drzwi",
    title: "Drzwi wejściowe stalowe + naświetla",
    place: "Osielsko",
    date: "02.2026",
    count: "1 zestaw",
  },
  {
    tag: "Brama",
    title: "Brama segmentowa + automatyka",
    place: "Bydgoszcz, Bartodzieje",
    date: "01.2026",
    count: "2 bramy",
  },
  {
    tag: "Rolety",
    title: "Rolety zewnętrzne podtynkowe",
    place: "Solec Kujawski",
    date: "12.2025",
    count: "9 sztuk",
  },
  {
    tag: "Okna ALU",
    title: "Okna aluminium - apartament",
    place: "Bydgoszcz, Śródmieście",
    date: "11.2025",
    count: "5 okien",
  },
  {
    tag: "Parapety",
    title: "Parapety konglomerat + zewnętrzne stal",
    place: "Białe Błota",
    date: "10.2025",
    count: "11 sztuk",
  },
];

export default function Realizacje() {
  return (
    <section className="section" id="realizacje">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Realizacje</div>
          <h2>
            Coś z&nbsp;ostatnich miesięcy. Bydgoszcz, Osielsko, Solec, Białe
            Błota.
          </h2>
          <p className="sub">
            Wszystkie zdjęcia poniżej to nasze wykonania - za&nbsp;zgodą
            właścicieli, bez stocków i&nbsp;renderów. Pełna galeria
            w&nbsp;przygotowaniu.
          </p>
        </div>
        <div className="realiz-grid">
          {REALIZACJE.map((r, i) => (
            <a
              className="realiz"
              href="#"
              key={i}
              onClick={(e) => e.preventDefault()}
            >
              <div className="img-area">
                <Icon name="home" size={56} className="house-icon" />
                <span className="label">[ zdjęcie realizacji ]</span>
                <div className="overlay">
                  <span className="view">
                    <Icon name="eye" size={14} />
                    Zobacz galerię
                  </span>
                </div>
              </div>
              <div className="meta-block-2">
                <span className="tag">
                  {r.tag} · {r.count}
                </span>
                <h3>{r.title}</h3>
                <div className="footer-row">
                  <span>
                    <Icon name="map-pin" size={11} /> {r.place}
                  </span>
                  <span>{r.date}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
