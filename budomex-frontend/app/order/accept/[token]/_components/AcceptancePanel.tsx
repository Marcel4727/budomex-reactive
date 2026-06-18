"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import OrderTopNav from "../../../_components/OrderTopNav";
import Icon from "../../../../(marketing)/_components/Icon";
import { api, ApiError, fetcher } from "@/lib/api";
import {
  deadlineCountdown,
  formatLongDate,
  formatOrderRef,
  formatPrice,
  formatShortDateTime,
} from "@/lib/format";

type AcceptResponse = {
  order: {
    id: number;
    productType: string;
    productSpecifications: string;
    quantity: number;
    price: number | null;
    estimatedDeliveryDate: string | null;
    customerAcceptanceDeadline: string | null;
  };
  alreadyResponded?: boolean;
  accepted?: boolean;
  expired?: boolean;
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

type Props = { token: string };

export default function AcceptancePanel({ token }: Props) {
  const { data, error, isLoading, mutate } = useSWR<AcceptResponse>(
    `/api/order/accept/${token}`,
    fetcher,
  );
  const [actionState, setActionState] = useState<"idle" | "accepting" | "rejecting" | "accepted" | "rejected">("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="order-shell">
        <OrderTopNav />
        <main className="order-main">
          <div className="order-content">
            <div className="order-skeleton">Ładuję ofertę…</div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    const msg =
      error instanceof ApiError
        ? error.message
        : "Nie udało się pobrać oferty. Sprawdź, czy link jest poprawny.";
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
                <h2>Nie znaleźliśmy tej oferty.</h2>
                <p>{msg}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { order } = data;
  const ref = formatOrderRef(order.id);
  const productLabel = PRODUCT_LABELS[order.productType] ?? order.productType;
  const deadline = deadlineCountdown(order.customerAcceptanceDeadline);

  // Już wcześniej zaakceptowane/odrzucone
  if (data.alreadyResponded) {
    const accepted = data.accepted === true;
    return (
      <div className="order-shell">
        <OrderTopNav refLabel={ref} />
        <main className="order-main">
          <div className="order-content">
            <div className="order-eyebrow">Wycena · {ref}</div>
            <h1 className="order-h1">
              {accepted ? "Oferta już zaakceptowana." : "Oferta odrzucona."}
            </h1>
            <p className="order-lead">
              {accepted
                ? "Dziękujemy. Zamówienie jest u nas, w realizacji."
                : "Zarejestrowaliśmy odrzucenie. Jeśli to pomyłka, zadzwoń — odbierze Marek lub Ewa."}
            </p>
            {accepted && (
              <div className={`accept-state-card success`}>
                <div className="icon-wrap">
                  <Icon name="check-circle" size={32} strokeWidth={2} />
                </div>
                <h2>Wszystko w porządku.</h2>
                <p>
                  Twoje zamówienie ma się dobrze. Postęp produkcji śledź pod
                  unikalnym linkiem — bez logowania, bez aplikacji.
                </p>
                <Link href={`/order/track/${token}`} className="cta">
                  Śledź zamówienie
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Termin minął
  if (data.expired || deadline.expired) {
    return (
      <div className="order-shell">
        <OrderTopNav refLabel={ref} />
        <main className="order-main">
          <div className="order-content">
            <div className="order-eyebrow">Wycena · {ref}</div>
            <h1 className="order-h1">Termin akceptacji minął.</h1>
            <p className="order-lead">
              Mieliśmy 48 godzin, żeby się dogadać — niestety, czas minął.
              Jeśli wciąż chcesz to zamówienie, zadzwoń lub wyślij zapytanie
              jeszcze raz.
            </p>
            <div className="accept-state-card neutral">
              <div className="icon-wrap">
                <Icon name="clock" size={32} strokeWidth={2} />
              </div>
              <h2>Wyślij nowe zapytanie.</h2>
              <p>
                Pełne dane (produkt, specyfikacja, ilość) wyceniamy ponownie
                w&nbsp;48&nbsp;godzin.
              </p>
              <Link href="/#wycena" className="cta">
                Złóż nowe zapytanie
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Stan po akcji
  if (actionState === "accepted") {
    return (
      <div className="order-shell">
        <OrderTopNav refLabel={ref} />
        <main className="order-main">
          <div className="order-content">
            <div className="order-eyebrow">Zaakceptowane · {ref}</div>
            <h1 className="order-h1">
              Dziękujemy. <span style={{ color: "var(--bdx-terracotta)" }}>Bierzemy się do roboty.</span>
            </h1>
            <p className="order-lead">
              Zamówienie zarejestrowane. Materiał zarezerwowany. Postęp
              produkcji śledź pod unikalnym linkiem poniżej — bez logowania.
            </p>
            <div className="accept-state-card success">
              <div className="icon-wrap">
                <Icon name="check-circle" size={32} strokeWidth={2} />
              </div>
              <h2>Twoje zamówienie ruszyło.</h2>
              <p>
                W konsoli backendu (i&nbsp;na Twoim mailu) wylądował link
                do&nbsp;śledzenia statusu. Możesz wejść w&nbsp;niego w&nbsp;każdej chwili.
              </p>
              <Link href={`/order/track/${token}`} className="cta">
                Śledź zamówienie
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (actionState === "rejected") {
    return (
      <div className="order-shell">
        <OrderTopNav refLabel={ref} />
        <main className="order-main">
          <div className="order-content">
            <div className="order-eyebrow">Odrzucone · {ref}</div>
            <h1 className="order-h1">OK, rozumiemy.</h1>
            <p className="order-lead">
              Zamówienie zostało anulowane. Jeśli zmienisz zdanie albo chcesz
              dopytać o szczegóły — zadzwoń, odbierze Marek lub Ewa.
            </p>
            <div className="accept-state-card neutral">
              <div className="icon-wrap">
                <Icon name="x" size={28} strokeWidth={2} />
              </div>
              <h2>Dzięki za szybką decyzję.</h2>
              <p>
                Złożenie nowego zapytania zajmuje minutę. Wyceniamy w 48&nbsp;h.
              </p>
              <Link href="/#wycena" className="cta">
                Zacznij od początku
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleAccept = async () => {
    if (actionState !== "idle") return;
    setActionError(null);
    setActionState("accepting");
    try {
      await api(`/api/order/accept/${token}/confirm`, { method: "POST" });
      setActionState("accepted");
      mutate();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.message
          ? err.message
          : "Nie udało się zaakceptować. Spróbuj jeszcze raz.",
      );
      setActionState("idle");
    }
  };

  const handleReject = async () => {
    if (actionState !== "idle") return;
    if (!confirm("Na pewno odrzucić ofertę? Tej decyzji nie da się cofnąć.")) return;
    setActionError(null);
    setActionState("rejecting");
    try {
      await api(`/api/order/accept/${token}/reject`, { method: "POST" });
      setActionState("rejected");
      mutate();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.message
          ? err.message
          : "Nie udało się odrzucić oferty.",
      );
      setActionState("idle");
    }
  };

  return (
    <div className="order-shell">
      <OrderTopNav refLabel={ref} />
      <main className="order-main">
        <div className="order-content">
          <div className="order-eyebrow">Wycena gotowa · {ref}</div>
          <h1 className="order-h1">
            Twoja oferta <span style={{ color: "var(--bdx-terracotta)" }}>jest gotowa.</span>
          </h1>
          <p className="order-lead">
            Sprawdź szczegóły poniżej. Jeśli wszystko się zgadza — kliknij
            &bdquo;Akceptuję ofertę&rdquo;. Zarezerwujemy materiał i ruszymy
            z&nbsp;produkcją.
          </p>

          <div className="accept-quote-card">
            <header className="accept-quote-head">
              <div className="head-left">
                <span className="ref">Zamówienie · {ref}</span>
                <h2>
                  {order.quantity}× {productLabel}
                </h2>
              </div>
              <div className={`accept-deadline ${deadline.urgent ? "urgent" : ""}`}>
                <span className="label">Decyzja do</span>
                <span className="value">
                  {formatShortDateTime(order.customerAcceptanceDeadline)}
                </span>
                <span>pozostało {deadline.label}</span>
              </div>
            </header>

            <div className="accept-quote-body">
              <div className="accept-row price">
                <span className="k">Cena całkowita</span>
                <span className="v">
                  {formatPrice(order.price)}
                  <small>brutto</small>
                </span>
              </div>
              <div className="accept-row">
                <span className="k">Termin realizacji</span>
                <span className="v">
                  {formatLongDate(order.estimatedDeliveryDate)}
                </span>
              </div>
              <div className="accept-row">
                <span className="k">Produkt</span>
                <span className="v">{productLabel}</span>
              </div>
              <div className="accept-row">
                <span className="k">Ilość</span>
                <span className="v mono">{order.quantity} szt.</span>
              </div>
              <div className="accept-row full specs">
                <span className="k">Twoja specyfikacja</span>
                <span className="v">{order.productSpecifications}</span>
              </div>
            </div>
          </div>

          <div className="accept-actions">
            <button
              type="button"
              className="btn-accept"
              onClick={handleAccept}
              disabled={actionState !== "idle"}
            >
              {actionState === "accepting" ? (
                <>
                  <span className="spin" /> Zatwierdzam…
                </>
              ) : (
                <>
                  Akceptuję ofertę
                  <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-reject"
              onClick={handleReject}
              disabled={actionState !== "idle"}
            >
              {actionState === "rejecting" ? "Anuluję…" : "Rezygnuję"}
            </button>
          </div>

          {actionError && (
            <div className="order-error" role="alert" style={{ marginTop: 20 }}>
              <div className="icon-wrap">
                <Icon name="alert-circle" size={18} />
              </div>
              <div>
                <h2>Coś poszło nie tak.</h2>
                <p>{actionError}</p>
              </div>
            </div>
          )}

          <p className="accept-fine">
            Cena zawiera materiał, dowóz, demontaż starych elementów (jeśli
            potrzebny), montaż i&nbsp;listwy maskujące. Po akceptacji
            zarezerwujemy profile i&nbsp;wyślemy potwierdzenie z&nbsp;linkiem
            do&nbsp;śledzenia. Akceptacja jest jednorazowa — token wygasa
            po&nbsp;48&nbsp;godzinach.
          </p>
        </div>
      </main>
    </div>
  );
}
