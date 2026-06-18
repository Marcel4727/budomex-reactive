import Link from "next/link";
import Logo from "../../(marketing)/_components/Logo";

export default function AtmospherePanel() {
  return (
    <aside className="login-atmos" aria-hidden="false">
      <div className="atmos-top">
        <Logo variant="reversed" />
      </div>

      <div className="atmos-mid">
        <h1>
          <span className="line">System</span>
          <span className="line">zarządzania</span>
          <span className="line accent">zamówieniami.</span>
        </h1>
        <p className="atmos-sub">
          Wewnętrzny panel Budomex. Twoje zlecenia, postęp produkcji
          i&nbsp;zespół na hali — wszystko w&nbsp;jednym miejscu.
        </p>
      </div>

      <div className="atmos-mark" aria-hidden="true">
        <svg
          viewBox="0 0 280 320"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
        >
          {/* Wymiar: szerokość */}
          <g className="dim">
            <line x1="40" y1="32" x2="240" y2="32" />
            <line x1="40" y1="26" x2="40" y2="38" />
            <line x1="240" y1="26" x2="240" y2="38" />
            <text
              x="140"
              y="22"
              textAnchor="middle"
              className="dim-label"
            >
              1200
            </text>
          </g>

          {/* Rama okna */}
          <rect
            className="frame"
            x="40"
            y="56"
            width="200"
            height="240"
            rx="2"
          />

          {/* Słupek pionowy + poprzeczka */}
          <line className="mullion" x1="140" y1="56" x2="140" y2="296" />
          <line className="mullion" x1="40" y1="176" x2="240" y2="176" />

          {/* Drobny "wpis konstrukcyjny" w jednej szybie */}
          <line className="hint" x1="60" y1="76" x2="120" y2="76" />
          <line className="hint" x1="60" y1="76" x2="60" y2="100" />

          {/* Wymiar: wysokość */}
          <g className="dim">
            <line x1="260" y1="56" x2="260" y2="296" />
            <line x1="254" y1="56" x2="266" y2="56" />
            <line x1="254" y1="296" x2="266" y2="296" />
            <text
              x="272"
              y="176"
              textAnchor="middle"
              className="dim-label"
              transform="rotate(90, 272, 176)"
            >
              1500
            </text>
          </g>
        </svg>
      </div>

      <div className="atmos-foot">
        <Link href="/">Wracam na stronę firmy</Link>
        <span className="atmos-locale">ul. Juliusza Kossaka 35, Bydgoszcz</span>
      </div>
    </aside>
  );
}
