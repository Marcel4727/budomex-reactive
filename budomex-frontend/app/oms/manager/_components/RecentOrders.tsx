"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "../../_components/Icon";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
import {
  BACKEND_PRODUCT_ICONS,
  BACKEND_STATUS_MAP,
  PRODUCT_LABELS,
  cityFrom,
  formatRef,
  type BackendOrderStatus,
  workerColor,
  workerInitials,
} from "./_data";
import { formatPrice, formatShortDate } from "@/lib/format";
import OrderDetailModal from "./OrderDetailModal";
import { SkeletonRows } from "./SkeletonRow";

function StatusBadge({ status }: { status: string }) {
  const meta = BACKEND_STATUS_MAP[status as BackendOrderStatus] ?? {
    cls: "neutral",
    label: status,
  };
  return (
    <span className={`badge ${meta.cls}`}>
      <span className="b-dot" />
      {meta.label}
    </span>
  );
}

function AvatarStack({
  workers,
  max = 3,
}: {
  workers: { id: number; name: string }[];
  max?: number;
}) {
  const visible = workers.slice(0, max);
  const extra = workers.length - max;
  if (workers.length === 0) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-dim)",
        }}
      >
        —
      </span>
    );
  }
  return (
    <div className="av-stack" aria-label={`${workers.length} pracowników`}>
      {visible.map((w) => (
        <span
          key={w.id}
          className={`av c-${workerColor(w.id)}`}
          title={w.name}
        >
          {workerInitials(w.name)}
        </span>
      ))}
      {extra > 0 && <span className="av more">+{extra}</span>}
    </div>
  );
}

function relativeDeadline(iso: string | null, late: boolean): string {
  if (!iso) return "—";
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "—";
  const diffMs = target - Date.now();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (late) return `${Math.abs(days)} dni temu`;
  if (days === 0) return "dzisiaj";
  if (days === 1) return "jutro";
  if (days > 0) return `za ${days} dni`;
  return `${Math.abs(days)} dni temu`;
}

function isLate(o: BackendOrder): boolean {
  if (!o.estimatedDeliveryDate) return false;
  if (o.status === "ZREALIZOWANE" || o.status === "KONIEC" || o.status === "ANULOWANE") {
    return false;
  }
  const target = new Date(o.estimatedDeliveryDate).getTime();
  return target < Date.now();
}

export default function RecentOrders() {
  const { data, error, isLoading } = useOrders();
  const [detailId, setDetailId] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const orders = data?.orders ?? [];
    return orders
      .slice()
      .sort(
        (a, b) =>
          new Date(b.submissionDate).getTime() -
          new Date(a.submissionDate).getTime(),
      )
      .slice(0, 5);
  }, [data]);

  return (
    <>
      <div
        className="card"
        aria-busy={isLoading || undefined}
        aria-live="polite"
      >
        <div className="card-head">
          <div className="card-head-left">
            <h3 className="card-title">Ostatnie zamówienia</h3>
            <span className="card-sub">
              {isLoading ? "…" : `${sorted.length} z ${data?.orders.length ?? 0}`}
            </span>
          </div>
          <Link href="/oms/manager/orders" className="card-action-link">
            Zobacz wszystkie
            <Icon name="arrow-right" size={12} />
          </Link>
        </div>
        {error && (
          <div
            role="alert"
            style={{
              padding: "16px 20px",
              color: "var(--bdx-danger)",
              fontSize: 13,
            }}
          >
            Nie udało się pobrać listy zamówień.
          </div>
        )}
        {!error && isLoading && (
          <>
            <span className="sr-only">Ładuję listę zamówień…</span>
            <SkeletonRows count={5} />
          </>
        )}

        {!error && !isLoading && sorted.length === 0 && (
          <div
            style={{
              padding: "24px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Brak zamówień w systemie.
          </div>
        )}
        {sorted.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="orders-tbl">
              <colgroup>
                <col style={{ width: 130 }} />
                <col />
                <col style={{ width: 180 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Klient</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>Termin</th>
                  <th>Zespół</th>
                  <th style={{ textAlign: "right" }}>Wartość</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((o) => {
                  const late = isLate(o);
                  const productLabel =
                    PRODUCT_LABELS[o.productType] ?? o.productType;
                  const productIcon =
                    BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
                  return (
                    <tr key={o.id} onClick={() => setDetailId(o.id)}>
                      <td>
                        <span className="ord-num">{formatRef(o.id)}</span>
                      </td>
                      <td>
                        <div className="ord-customer">
                          {o.customerName}
                          <span className="addr">
                            {cityFrom(o.customerAddress)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="ord-product">
                          <span className="pi">
                            <Icon name={productIcon} size={12} />
                          </span>
                          {o.quantity}× {productLabel}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        <div className={`ord-deadline ${late ? "late" : ""}`}>
                          {o.estimatedDeliveryDate
                            ? formatShortDate(o.estimatedDeliveryDate)
                            : "—"}
                          <span className="rel">
                            {relativeDeadline(o.estimatedDeliveryDate, late)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <AvatarStack workers={o.assignedWorkers} max={3} />
                      </td>
                      <td className="ord-price">
                        {o.price != null ? formatPrice(o.price) : "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="row-action always"
                          aria-label="Otwórz szczegóły"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(o.id);
                          }}
                        >
                          <Icon name="chevron-right" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId != null && (
        <OrderDetailModal
          orderId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
