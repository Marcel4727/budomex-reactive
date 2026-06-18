"use client";

import { useEffect, useState, type FormEvent } from "react";
import Icon from "../../_components/Icon";
import { api, ApiError } from "@/lib/api";
import { invalidateOrders } from "../_lib/mutations";
import { PRODUCT_LABELS, formatRef } from "./_data";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Order = {
  id: number;
  customerName: string;
  customerAddress: string | null;
  productType: string;
  quantity: number;
  installationDate?: string | null;
};

type Props = {
  order: Order;
  mode: "schedule" | "reschedule";
  onClose: () => void;
  onDone: () => void;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultDate(existing: string | null | undefined): {
  date: string;
  time: string;
} {
  if (existing) {
    const d = new Date(existing);
    if (!Number.isNaN(d.getTime())) {
      return {
        date: d.toISOString().slice(0, 10),
        time: d.toTimeString().slice(0, 5),
      };
    }
  }
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return { date: d.toISOString().slice(0, 10), time: "09:00" };
}

export default function InstallScheduleModal({
  order,
  mode,
  onClose,
  onDone,
}: Props) {
  const initial = defaultDate(order.installationDate);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!date || !time) {
      setError("Wybierz datę i godzinę.");
      return;
    }
    if (date < todayISO()) {
      setError("Termin montażu musi być w przyszłości.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const endpoint =
        mode === "schedule"
          ? `/api/manager/order/${order.id}/schedule-installation`
          : `/api/manager/order/${order.id}/reschedule-installation`;
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify({
          installationDate: `${date}T${time}:00`,
        }),
      });
      await invalidateOrders();
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || `Błąd ${err.status}`);
      } else if (err instanceof TypeError) {
        setError("Nie udało się połączyć z backendem.");
      } else {
        setError("Nie udało się zapisać terminu.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const productLabel = PRODUCT_LABELS[order.productType] ?? order.productType;
  const title =
    mode === "schedule" ? "Zaplanuj montaż" : "Zmień termin montażu";

  return (
    <div
      className="qm-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div ref={trapRef} className="qm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="qm-head">
          <div className="qm-head-text">
            <h3>{title}</h3>
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
              <span className="k">Adres montażu</span>
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
          </div>

          <div className="qm-field-row">
            <div className="qm-field">
              <label htmlFor="ins-date">
                Data montażu<span className="req">*</span>
              </label>
              <input
                id="ins-date"
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="qm-field">
              <label htmlFor="ins-time">
                Godzina<span className="req">*</span>
              </label>
              <input
                id="ins-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={submitting}
              />
              <span className="hint">Orientacyjne okno przyjazdu ekipy.</span>
            </div>
          </div>

          {error && (
            <div className="qm-error" role="alert">
              <Icon name="alert-circle" size={14} />
              <span>{error}</span>
            </div>
          )}

          <div
            className="qm-foot"
            style={{ marginLeft: -22, marginRight: -22, marginBottom: -20 }}
          >
            <button
              type="button"
              className="btn secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Anuluj
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting
                ? "Zapisuję…"
                : mode === "schedule"
                  ? "Zaplanuj montaż"
                  : "Zapisz nowy termin"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
