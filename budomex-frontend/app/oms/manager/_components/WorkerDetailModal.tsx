"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../../_components/Icon";
import { useOrders } from "../_hooks/useOrders";
import type { BackendWorker } from "../_hooks/useWorkers";
import {
  BACKEND_PRODUCT_ICONS,
  BACKEND_STATUS_MAP,
  PRODUCT_LABELS,
  cityFrom,
  formatRef,
  workerColor,
  workerInitials,
  type BackendOrderStatus,
} from "./_data";
import { formatPrice, formatShortDate } from "@/lib/format";
import OrderDetailModal from "./OrderDetailModal";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Props = {
  worker: BackendWorker;
  onClose: () => void;
};

function displayName(w: BackendWorker): string {
  const full = `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim();
  return full || w.username;
}

const ACTIVE_STATUSES: BackendOrderStatus[] = [
  "ZAAKCEPTOWANE_PRZEZ_MISTRZA",
  "W_REALIZACJI",
];

export default function WorkerDetailModal({ worker, onClose }: Props) {
  const { data, isLoading } = useOrders();
  const [orderDetailId, setOrderDetailId] = useState<number | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(orderDetailId === null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !orderDetailId) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, orderDetailId]);

  const name = displayName(worker);
  const initials = workerInitials(name);

  const { active, recent } = useMemo(() => {
    const orders = data?.orders ?? [];
    const mine = orders.filter((o) =>
      o.assignedWorkers.some((w) => w.id === worker.id),
    );
    return {
      active: mine.filter((o) =>
        ACTIVE_STATUSES.includes(o.status as BackendOrderStatus),
      ),
      recent: mine
        .filter(
          (o) =>
            !ACTIVE_STATUSES.includes(o.status as BackendOrderStatus),
        )
        .sort(
          (a, b) =>
            new Date(b.submissionDate).getTime() -
            new Date(a.submissionDate).getTime(),
        )
        .slice(0, 5),
    };
  }, [data, worker.id]);

  return (
    <>
      <div
        className="qm-scrim"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Pracownik ${name}`}
      >
        <div
          ref={trapRef}
          className="qm-modal qm-modal-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="qm-head">
            <div
              className="qm-head-text"
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div
                className={`wl-avatar c-${workerColor(worker.id)}`}
                style={{ width: 44, height: 44, fontSize: 15 }}
              >
                {initials}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{name}</h3>
                <span className="qm-sub">{worker.username}</span>
              </div>
            </div>
            <button
              type="button"
              className="qm-close"
              onClick={onClose}
              aria-label="Zamknij"
            >
              <Icon name="x" size={16} />
            </button>
          </header>

          <div className="qm-body">
            <section className="qm-section">
              <h4>Kontakt</h4>
              <div className="qm-info-grid">
                <div className="row">
                  <span className="k">Email</span>
                  <span className={`v ${worker.email ? "mono" : "muted"}`}>
                    {worker.email || "—"}
                  </span>
                </div>
                <div className="row">
                  <span className="k">Login</span>
                  <span className="v mono">{worker.username}</span>
                </div>
                <div className="row">
                  <span className="k">Aktywne zamówienia</span>
                  <span className="v mono">{active.length}</span>
                </div>
                <div className="row">
                  <span className="k">Obciążenie</span>
                  <span className="v">{worker.workload}</span>
                </div>
              </div>
            </section>

            <section className="qm-section">
              <h4>Aktywne zamówienia ({active.length})</h4>
              {isLoading ? (
                <div className="qm-empty">Ładuję zamówienia…</div>
              ) : active.length === 0 ? (
                <div className="qm-empty">
                  Pracownik nie ma aktualnie przypisanych aktywnych zamówień.
                </div>
              ) : (
                <div className="worker-order-list">
                  {active.map((o) => {
                    const meta = BACKEND_STATUS_MAP[
                      o.status as BackendOrderStatus
                    ] ?? { cls: "neutral", label: o.status };
                    const productLabel =
                      PRODUCT_LABELS[o.productType] ?? o.productType;
                    const productIcon =
                      BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
                    return (
                      <button
                        type="button"
                        key={o.id}
                        className="worker-order-item"
                        onClick={() => setOrderDetailId(o.id)}
                      >
                        <div className="woi-left">
                          <div className="woi-ref">{formatRef(o.id)}</div>
                          <div className="woi-customer">
                            {o.customerName} ·{" "}
                            <span className="woi-city">
                              {cityFrom(o.customerAddress)}
                            </span>
                          </div>
                          <div className="woi-product">
                            <Icon name={productIcon} size={11} />
                            {o.quantity}× {productLabel}
                          </div>
                        </div>
                        <div className="woi-right">
                          <span className={`badge ${meta.cls}`}>
                            <span className="b-dot" />
                            {meta.label}
                          </span>
                          <div className="woi-deadline">
                            {o.estimatedDeliveryDate
                              ? formatShortDate(o.estimatedDeliveryDate)
                              : "—"}
                          </div>
                          <Icon name="chevron-right" size={14} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {recent.length > 0 && (
              <section className="qm-section">
                <h4>Historia (ostatnie {recent.length})</h4>
                <div className="worker-order-list">
                  {recent.map((o) => {
                    const meta = BACKEND_STATUS_MAP[
                      o.status as BackendOrderStatus
                    ] ?? { cls: "neutral", label: o.status };
                    return (
                      <button
                        type="button"
                        key={o.id}
                        className="worker-order-item"
                        onClick={() => setOrderDetailId(o.id)}
                      >
                        <div className="woi-left">
                          <div className="woi-ref">{formatRef(o.id)}</div>
                          <div className="woi-customer">{o.customerName}</div>
                        </div>
                        <div className="woi-right">
                          <span className={`badge ${meta.cls}`}>
                            <span className="b-dot" />
                            {meta.label}
                          </span>
                          <div className="woi-deadline">
                            {o.price ? formatPrice(o.price) : "—"}
                          </div>
                          <Icon name="chevron-right" size={14} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="qm-foot">
            <button type="button" className="btn secondary" onClick={onClose}>
              Zamknij
            </button>
          </div>
        </div>
      </div>

      {orderDetailId != null && (
        <OrderDetailModal
          orderId={orderDetailId}
          onClose={() => setOrderDetailId(null)}
        />
      )}
    </>
  );
}
