"use client";

import Icon, { type IconName } from "./Icon";

export type ProductKey = "okna" | "drzwi" | "bramy" | "rolety" | "parapety";

type Product = {
  key: ProductKey;
  icon: IconName;
  name: string;
  desc: string;
};

export const PRODUCTS: Product[] = [
  {
    key: "okna",
    icon: "grid-2x2",
    name: "Okna",
    desc: "PCV, aluminium i drewno. Trzyszybowe standardem, ciepły montaż w cenie.",
  },
  {
    key: "drzwi",
    icon: "door-closed",
    name: "Drzwi",
    desc: "Wejściowe stalowe lub drewniane, drzwi wewnętrzne na wymiar.",
  },
  {
    key: "bramy",
    icon: "warehouse",
    name: "Bramy",
    desc: "Garażowe segmentowe i wjazdowe. Z napędem, pilotem i fotokomórką.",
  },
  {
    key: "rolety",
    icon: "blinds",
    name: "Rolety",
    desc: "Zewnętrzne nakładane oraz podtynkowe - sterowanie ręczne lub elektryczne.",
  },
  {
    key: "parapety",
    icon: "panel-bottom",
    name: "Parapety",
    desc: "Wewnętrzne PCV, konglomerat i kamień. Zewnętrzne stalowe i aluminium.",
  },
];

type Props = {
  onAsk: (key: ProductKey) => void;
};

export default function Products({ onAsk }: Props) {
  return (
    <section className="section" id="oferta">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Co produkujemy</div>
          <h2>
            Pięć rzeczy, na których zależy ci najbardziej w&nbsp;twoim domu.
          </h2>
          <p className="sub">
            Nie udajemy, że robimy wszystko. Stolarka otworowa - okna, drzwi,
            bramy, rolety, parapety. Materiał z&nbsp;własnego zakładu, montaż
            przez nasz zespół.
          </p>
        </div>
        <div className="products">
          {PRODUCTS.map((p) => (
            <a
              key={p.key}
              href={`#wycena-${p.key}`}
              className="product-card"
              onClick={(e) => {
                e.preventDefault();
                onAsk(p.key);
              }}
            >
              <div className="icon-box">
                <Icon name={p.icon} size={28} />
              </div>
              <div className="name">{p.name}</div>
              <div className="desc">{p.desc}</div>
              <div className="ask">
                Zapytaj o&nbsp;wycenę
                <Icon name="arrow-right" size={14} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
