"use client";

import useSWR from "swr";
import OrderTopNav from "../../../_components/OrderTopNav";
import Icon from "../../../../(marketing)/_components/Icon";
import { ApiError, fetcher } from "@/lib/api";
import { formatLongDate, formatOrderRef } from "@/lib/format";
import { useStomp } from "@/lib/realtime";

type TrackResponse = {
  id: number;
  productType: string;
  productSpecifications: string;
  quantity: number;
  status: string;
  completionPercentage: number | null;
  estimatedDeliveryDate: string | null;
  installationDate: string | null;
  totalTasks: number;
  completedTasks: number;
};

const PRODUCT_LABELS: Record<string, string> = {
  OKNO: "Okno",
  DRZWI: "Drzwi",
  BRAMA: "Brama",
  ROLETA_ZEWNETRZNA: "Roleta zewnętrzna",
  ROLETA_WEWNETRZNA: "Roleta wewnętrzna",
  PARAPET: "Parapet",
  INNE: "Inne",
};

type StatusKey =
  | "ZAAKCEPTOWANE_PRZEZ_MISTRZA"
  | "W_REALIZACJI"
  | "ZREALIZOWANE"
  | "MONTAZ"
  | "KONIEC"
  | "ANULOWANE";

const STATUS_PILL: Record<StatusKey, { cls: string; label: string }> = {
  ZAAKCEPTOWANE_PRZEZ_MISTRZA: { cls: "info", label: "Zaakceptowane" },
  W_REALIZACJI: { cls: "info", label: "W realizacji" },
  ZREALIZOWANE: { cls: "success", label: "Zrealizowane" },
  MONTAZ: { cls: "purple", label: "Montaż u klienta" },
  KONIEC: { cls: "success", label: "Zakończone" },
  ANULOWANE: { cls: "warning", label: "Anulowane" },
};

const STEP_ORDER: StatusKey[] = [
  "ZAAKCEPTOWANE_PRZEZ_MISTRZA",
  "W_REALIZACJI",
  "ZREALIZOWANE",
  "MONTAZ",
  "KONIEC",
];

const STEP_META: Record<StatusKey, { label: string; desc: string }> = {
  ZAAKCEPTOWANE_PRZEZ_MISTRZA: {
    label: "Oferta zaakceptowana",
    desc: "Zarezerwowaliśmy materiał, ruszamy z produkcją.",
  },
  W_REALIZACJI: {
    label: "Produkcja w naszym zakładzie",
    desc: "Cięcie profili, zgrzewanie, szklenie, kontrola jakości.",
  },
  ZREALIZOWANE: {
    label: "Produkcja zakończona",
    desc: "Pakowanie i przygotowanie do montażu.",
  },
  MONTAZ: {
    label: "Montaż u Ciebie",
    desc: "Przyjeżdżamy w umówionym dniu, w umówionych godzinach.",
  },
  KONIEC: {
    label: "Zamówienie zakończone",
    desc: "Protokół podpisany, klucz w zamku.",
  },
  ANULOWANE: {
    label: "Zamówienie anulowane",
    desc: "Skontaktuj się z nami, jeśli to pomyłka.",
  },
};

function stepState(
  current: string,
  step: StatusKey,
): "done" | "current" | "pending" {
  if (current === "ANULOWANE") return step === "ZAAKCEPTOWANE_PRZEZ_MISTRZA" ? "done" : "pending";
  const currentIdx = STEP_ORDER.indexOf(current as StatusKey);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (currentIdx < 0) return "pending";
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "current";
  return "pending";
}

type Props = { token: string };

export default function TrackingPanel({ token }: Props) {
  const { data, error, isLoading, mutate, isValidating } = useSWR<TrackResponse>(
    `/api/order/accept/${token}/track`,
    fetcher,
    {
      // WebSocket pushuje zmiany w czasie rzeczywistym; polling jako backstop.
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    },
  );

  // Real-time: backend broadcastuje na /topic/track/{token} przy każdej zmianie
  // statusu/postępu. Publiczny topic — bez JWT.
  useStomp([{ topic: `/topic/track/${token}`, onMessage: () => mutate() }]);

  if (isLoading) {
    return (
      <div className="order-shell">
        <OrderTopNav />
        <main className="order-main">
          <div className="order-content">
            <div className="order-skeleton">Ładuję status zamówienia…</div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    const isApi = error instanceof ApiError;
    const notAccepted = isApi && error.status === 400;
    return (
      <div className="order-shell">
        <OrderTopNav />
        <main className="order-main">
          <div className="order-content">
            <div className="order-error" role="alert">
              <div className="icon-wrap">
                <Icon name="alert-circle" size={18} />
              </div>
              <div>
                <h2>
                  {notAccepted
                    ? "To zamówienie nie jest jeszcze aktywne."
                    : "Nie znaleźliśmy tego zamówienia."}
                </h2>
                <p>
                  {notAccepted
                    ? "Tracking dostępny dopiero po akceptacji oferty. Jeśli to świeży link — sprawdź ponownie za chwilę."
                    : "Sprawdź, czy link jest poprawny. Jeśli problem się powtarza, zadzwoń: +48 52 850 12 00."}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const ref = formatOrderRef(data.id);
  const productLabel = PRODUCT_LABELS[data.productType] ?? data.productType;
  const pct = Math.max(0, Math.min(100, Math.round(data.completionPercentage ?? 0)));
  const pill = STATUS_PILL[data.status as StatusKey] ?? {
    cls: "info",
    label: data.status,
  };

  // Ring math
  const r = 60;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className="order-shell">
      <OrderTopNav refLabel={ref} />
      <main className="order-main">
        <div className="order-content">
          <div className="order-eyebrow">Śledzenie · {ref}</div>

          <div className="sr-only" aria-live="polite">
            Status zamówienia: {pill.label}. Postęp produkcji: {pct}%.
          </div>

          <div className="track-header">
            <div>
              <h1 className="order-h1">
                {data.quantity}× {productLabel}
              </h1>
              <p className="order-lead">
                Status aktualizuje się tu na żywo - bez odświeżania strony,
                gdy tylko coś zmieni się w&nbsp;zakładzie.
              </p>
            </div>
            <span className={`track-status-pill ${pill.cls}`}>
              <span className="dot" />
              {pill.label}
            </span>
          </div>

          <div className="track-card">
            <div className="track-progress-block">
              <div className="track-ring-wrap">
                <svg
                  className="track-ring"
                  viewBox="0 0 140 140"
                  role="img"
                  aria-label={`Postęp produkcji: ${pct}%`}
                >
                  <circle className="track-bg-circle" cx="70" cy="70" r={r} />
                  <circle
                    className="track-fg-circle"
                    cx="70"
                    cy="70"
                    r={r}
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="track-ring-center">
                  <div className="track-ring-pct">{pct}%</div>
                  <div className="track-ring-label">postęp</div>
                </div>
              </div>

              <div className="track-stats">
                <div className="track-stat-row">
                  <span className="k">Zadania produkcyjne</span>
                  <span className="v">
                    {data.totalTasks > 0 ? (
                      <>
                        {data.completedTasks}
                        <span className="sub">z {data.totalTasks}</span>
                      </>
                    ) : (
                      <span className="sub" style={{ fontSize: 15 }}>
                        czekają na przypisanie
                      </span>
                    )}
                  </span>
                </div>
                <div className="track-stat-row">
                  <span className="k">Planowany termin</span>
                  <span className="v">
                    {data.estimatedDeliveryDate
                      ? formatLongDate(data.estimatedDeliveryDate)
                      : "—"}
                  </span>
                </div>
                <div className="track-stat-row">
                  <span className="k">Montaż</span>
                  <span className="v">
                    {data.installationDate
                      ? formatLongDate(data.installationDate)
                      : "do uzgodnienia"}
                  </span>
                </div>
              </div>
            </div>

            <div className="track-foot">
              <span className="dot" />
              <span>
                {isValidating ? "Sprawdzam aktualizacje…" : "Na żywo · połączono"}
              </span>
              <button
                type="button"
                onClick={() => mutate()}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: "var(--bdx-navy)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                }}
              >
                <Icon name="refresh-cw" size={13} />
                Odśwież teraz
              </button>
            </div>
          </div>

          <div className="track-timeline">
            <h3>Co dzieje się teraz</h3>
            <div className="track-steps">
              {STEP_ORDER.map((step) => {
                const state = stepState(data.status, step);
                const meta = STEP_META[step];
                return (
                  <div className={`track-step ${state}`} key={step}>
                    <div className="step-dot">
                      {state === "done" && (
                        <Icon name="check" size={13} strokeWidth={3} />
                      )}
                      {state === "current" && (
                        <Icon name="rotate-cw" size={12} strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="step-body">
                      <div className="step-label">{meta.label}</div>
                      {state !== "pending" && (
                        <div className="step-desc">{meta.desc}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {data.status === "ANULOWANE" && (
                <div className="track-step current">
                  <div className="step-dot" style={{ background: "var(--bdx-danger)", borderColor: "var(--bdx-danger)" }}>
                    <Icon name="x" size={13} strokeWidth={2.5} />
                  </div>
                  <div className="step-body">
                    <div className="step-label">Zamówienie anulowane</div>
                    <div className="step-desc">{STEP_META.ANULOWANE.desc}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="track-summary">
            <div className="track-summary-card">
              <span className="k">Specyfikacja</span>
              <div className="v" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>
                {data.productSpecifications}
              </div>
            </div>
            <div className="track-summary-card">
              <span className="k">Numer referencyjny</span>
              <div className="v mono">{ref}</div>
              <div className="sub">
                Trzymaj go pod ręką - przyda się, jeśli będziesz dzwonił.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
