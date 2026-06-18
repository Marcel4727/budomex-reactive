"use client";

import { useEffect, useState, type FormEvent } from "react";
import Icon from "../../_components/Icon";
import { api, ApiError } from "@/lib/api";
import { PRODUCT_LABELS, formatRef } from "./_data";
import { useFocusTrap } from "@/lib/useFocusTrap";

type BackendOrder = {
  id: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerAddress: string | null;
  productType: string;
  productSpecifications: string;
  quantity: number;
  estimatedDeliveryDate?: string | null;
};

type ApproveResponse = {
  message: string;
  acceptanceToken: string;
};

type Props = {
  order: BackendOrder;
  onClose: () => void;
  onApproved: () => void;
};

function defaultDeliveryDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function QuoteModal({ order, onClose, onApproved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const customerPreferred =
    order.estimatedDeliveryDate &&
    order.estimatedDeliveryDate >= today
      ? order.estimatedDeliveryDate
      : null;
  const [price, setPrice] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(
    customerPreferred ?? defaultDeliveryDate(),
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const acceptanceUrl = token
    ? `${window.location.origin}/order/accept/${token}`
    : null;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const priceNum = Number(price.replace(",", "."));
    if (!priceNum || priceNum <= 0) {
      setError("Podaj cenę większą od zera.");
      return;
    }
    if (!deliveryDate || deliveryDate < todayISO()) {
      setError("Termin realizacji musi być w przyszłości.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await api<ApproveResponse>(
        `/api/manager/order/${order.id}/approve`,
        {
          method: "POST",
          body: JSON.stringify({
            price: priceNum,
            estimatedDeliveryDate: deliveryDate,
            managerNotes: notes.trim() || null,
          }),
        },
      );
      setToken(res.acceptanceToken);
      const url = `${window.location.origin}/order/accept/${res.acceptanceToken}`;
      // eslint-disable-next-line no-console
      console.info(
        "%c[Budomex] Wycena zaakceptowana — link akceptacyjny dla klienta:",
        "color:#B33A2A;font-weight:700",
        url,
      );
      // eslint-disable-next-line no-console
      console.info(
        "[Budomex] Klient: %s <%s> · zamówienie %s",
        order.customerName,
        order.customerEmail,
        formatRef(order.id),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || `Błąd ${err.status}`);
      } else if (err instanceof TypeError) {
        setError("Nie udało się połączyć z backendem. Sprawdź czy działa.");
      } else {
        setError("Nie udało się zatwierdzić wyceny.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!acceptanceUrl) return;
    try {
      await navigator.clipboard.writeText(acceptanceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const productLabel = PRODUCT_LABELS[order.productType] ?? order.productType;
  const isSuccess = token !== null;

  return (
    <div
      className="qm-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isSuccess ? "Wycena zaakceptowana" : "Wyceń zamówienie"}
    >
      <div ref={trapRef} className="qm-modal" onClick={(e) => e.stopPropagation()}>
        {isSuccess ? (
          <div className="qm-success">
            <div className="qm-success-head">
              <div className="icon-wrap">
                <Icon name="check" size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3>Wycena zatwierdzona.</h3>
                <div className="desc">
                  Email z linkiem akceptacyjnym trafił do logów backendu
                  ({order.customerEmail}).
                </div>
              </div>
            </div>

            <div className="qm-link-box">
              <span className="k">Link akceptacyjny dla klienta</span>
              <div className="link-row">
                <code>{acceptanceUrl}</code>
                <button
                  type="button"
                  className={`qm-copy ${copied ? "done" : ""}`}
                  onClick={copyLink}
                >
                  {copied ? (
                    <>
                      <Icon name="check" size={14} strokeWidth={2.5} />
                      Skopiowane
                    </>
                  ) : (
                    <>
                      <Icon name="file-text" size={14} />
                      Skopiuj link
                    </>
                  )}
                </button>
              </div>
              <div className="qm-hint-note">
                Link zapisany też w konsoli przeglądarki (DevTools → Console).
                Token jest jednorazowy, ważny 48 h.
              </div>
            </div>

            <div className="qm-foot" style={{ marginLeft: -22, marginRight: -22, marginBottom: -22 }}>
              <button type="button" className="btn secondary" onClick={onApproved}>
                Zamknij
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="qm-head">
              <div className="qm-head-text">
                <h3>Wyceń zamówienie</h3>
                <span className="qm-sub">{formatRef(order.id)}</span>
              </div>
              <button
                type="button"
                className="qm-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Zamknij"
              >
                <Icon name="x" size={16} />
              </button>
            </header>

            <form className="qm-body" onSubmit={onSubmit} noValidate>
              <div className="qm-summary">
                <div className="row">
                  <span className="k">Klient</span>
                  <span className="v">{order.customerName}</span>
                </div>
                <div className="row">
                  <span className="k">Kontakt</span>
                  <span className="v mono">
                    {order.customerEmail}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                  </span>
                </div>
                <div className="row">
                  <span className="k">Adres</span>
                  <span
                    className={`v ${order.customerAddress ? "" : "muted"}`}
                    style={
                      order.customerAddress
                        ? undefined
                        : { color: "var(--text-dim)", fontStyle: "italic" }
                    }
                  >
                    {order.customerAddress || "nie podano"}
                  </span>
                </div>
                <div className="row">
                  <span className="k">Produkt</span>
                  <span className="v">
                    {order.quantity}× {productLabel}
                  </span>
                </div>
                <div className="spec">{order.productSpecifications}</div>
              </div>

              <div className="qm-field-row">
                <div className="qm-field">
                  <label htmlFor="qm-price">
                    Cena (PLN)<span className="req">*</span>
                  </label>
                  <input
                    id="qm-price"
                    type="text"
                    inputMode="decimal"
                    placeholder="np. 12480"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={submitting}
                    autoFocus
                  />
                  <span className="hint">Wartość brutto.</span>
                </div>
                <div className="qm-field">
                  <label htmlFor="qm-date">
                    Termin realizacji<span className="req">*</span>
                  </label>
                  <input
                    id="qm-date"
                    type="date"
                    min={todayISO()}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    disabled={submitting}
                  />
                  <span className="hint">
                    {customerPreferred
                      ? "Termin preferowany przez klienta — możesz zmienić."
                      : "Data montażu u klienta."}
                  </span>
                </div>
              </div>

              <div className="qm-field">
                <label htmlFor="qm-notes">Uwagi managera</label>
                <textarea
                  id="qm-notes"
                  placeholder="Co warto, żeby klient wiedział: wariant, kolor, dodatki…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  rows={3}
                />
              </div>

              {error && (
                <div className="qm-error" role="alert">
                  <Icon name="alert-circle" size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="qm-foot" style={{ marginLeft: -22, marginRight: -22, marginBottom: -20 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Anuluj
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? "Zapisuję…" : "Zatwierdź wycenę"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
