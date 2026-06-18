import Icon from "./Icon";

type Testimonial = {
  name: string;
  place: string;
  job: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Marek",
    place: "Bydgoszcz",
    job: "Okna",
    quote:
      "Solidnie, terminowo, bez gadania. Montaż zaczęli o 7:30, skończyli przed 16:00. Polecam.",
  },
  {
    name: "Iwona",
    place: "Osielsko",
    job: "Drzwi",
    quote:
      "Wycena przyszła na maila po 31 godzinach. Termin montażu przesunęli o jeden dzień, ale uprzedzili tydzień wcześniej. Konkretni ludzie.",
  },
  {
    name: "Tadeusz",
    place: "Solec Kujawski",
    job: "Rolety",
    quote:
      "Najbardziej spodobało mi się to, że na stronie widziałem, na jakim etapie jest moje zamówienie. Bez dzwonienia, bez nerwów.",
  },
];

function Stars() {
  return (
    <span className="stars" aria-label="Ocena 5 z 5 gwiazdek">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" size={15} />
      ))}
    </span>
  );
}

export default function Testimonials() {
  return (
    <section className="section paper-2">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Opinie klientów</div>
          <h2>Co mówią ci, którzy już mieszkają z&nbsp;naszą stolarką.</h2>
        </div>
        <div className="testimonials">
          {TESTIMONIALS.map((t, i) => (
            <article className="testimonial" key={i}>
              <div className="testimonial-photo" aria-hidden="true">
                <Icon name="home" size={48} className="house-icon" />
                <span className="label">[ zdjęcie realizacji ]</span>
              </div>
              <div className="testimonial-body">
                <Stars />
                <blockquote>{t.quote}</blockquote>
                <div className="who">
                  <div className="name">{t.name}</div>
                  <div className="who-meta">
                    {t.place} · {t.job}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
