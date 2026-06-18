"use client";

import { useMemo, useState } from "react";
import Icon from "../../_components/Icon";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
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
import QuoteModal from "./QuoteModal";
import { invalidateInventory, invalidateOrders } from "../_lib/mutations";
import { useToast } from "@/lib/toast";
import { SkeletonRows } from "./SkeletonRow";

type Props = {
  /** Statusy, które mają być pokazane. Undefined → wszystkie. */
  statuses?: BackendOrderStatus[];
  /** Zezwala na klik "Wyceń" w wierszu (dla OCZEKUJACE). */
  enableQuote?: boolean;
  emptyLabel?: string;
};

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
  const visible = workers.slice(0, max);
  const extra = workers.length - max;
  return (
    <div className="av-stack" aria-label={`${workers.length} pracowników`}>
      {visible.map((w) => (
        <span key={w.id} className={`av c-${workerColor(w.id)}`} title={w.name}>
          {workerInitials(w.name)}
        </span>
      ))}
      {extra > 0 && <span className="av more">+{extra}</span>}
    </div>
  );
}

function isLate(o: BackendOrder): boolean {
  if (!o.estimatedDeliveryDate) return false;
  if (o.status === "ZREALIZOWANE" || o.status === "KONIEC" || o.status === "ANULOWANE") {
    return false;
  }
  return new Date(o.estimatedDeliveryDate).getTime() < Date.now();
}

function relativeDeadline(iso: string | null, late: boolean): string {
  if (!iso) return "—";
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "—";
  const diffMs = target - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (late) return `${Math.abs(days)} dni temu`;
  if (days === 0) return "dzisiaj";
  if (days === 1) return "jutro";
  if (days > 0) return `za ${days} dni`;
  return `${Math.abs(days)} dni temu`;
}

export default function OrdersListView({
  statuses,
  enableQuote = false,
  emptyLabel = "Brak zamówień spełniających kryteria.",
}: Props) {
  const { data, error, isLoading } = useOrders();
  const toast = useToast();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [quoteOrder, setQuoteOrder] = useState<BackendOrder | null>(null);
  const [sort, setSort] = useState<{
    key: "date" | "deadline" | "customer" | "price";
    dir: "asc" | "desc";
  }>({ key: "date", dir: "desc" });

  const toggleSort = (key: typeof sort.key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "customer" ? "asc" : "desc" },
    );
  };

  const filtered = useMemo(() => {
    const all = data?.orders ?? [];
    const list = statuses
      ? all.filter((o) => statuses.includes(o.status as BackendOrderStatus))
      : all;
    const sorted = list.slice().sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "customer":
          return a.customerName.localeCompare(b.customerName, "pl") * dir;
        case "deadline": {
          const da = a.estimatedDeliveryDate
            ? new Date(a.estimatedDeliveryDate).getTime()
            : Infinity;
          const db = b.estimatedDeliveryDate
            ? new Date(b.estimatedDeliveryDate).getTime()
            : Infinity;
          return (da - db) * dir;
        }
        case "price": {
          const pa = a.price ?? -Infinity;
          const pb = b.price ?? -Infinity;
          return (Number(pa) - Number(pb)) * dir;
        }
        case "date":
        default:
          return (
            (new Date(a.submissionDate).getTime() -
              new Date(b.submissionDate).getTime()) *
            dir
          );
      }
    });
    return sorted;
  }, [data, statuses, sort]);

  const sortIndicator = (key: typeof sort.key) => {
    if (sort.key !== key) return null;
    return sort.dir === "asc" ? " ↑" : " ↓";
  };

  return (
    <>
      <div
        className="card"
        aria-busy={isLoading || undefined}
        aria-live="polite"
      >
        {error && (
          <div
            role="alert"
            style={{
              padding: "16px 20px",
              color: "var(--bdx-danger)",
              fontSize: 13,
            }}
          >
            Nie udało się pobrać listy zamówień. Sprawdź czy backend jest uruchomiony.
          </div>
        )}

        {!error && isLoading && (
          <>
            <span className="sr-only">Ładuję listę zamówień…</span>
            <SkeletonRows count={6} />
          </>
        )}

        {!error && !isLoading && filtered.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            {emptyLabel}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="orders-tbl">
              <colgroup>
                <col style={{ width: 130 }} />
                <col />
                <col style={{ width: 200 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: enableQuote ? 90 : 44 }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="sortable"
                    aria-sort={
                      sort.key === "date"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort("date")}
                      title="Sortuj po dacie zgłoszenia"
                    >
                      Numer{sortIndicator("date")}
                    </button>
                  </th>
                  <th
                    className="sortable"
                    aria-sort={
                      sort.key === "customer"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort("customer")}
                      title="Sortuj po nazwisku klienta"
                    >
                      Klient{sortIndicator("customer")}
                    </button>
                  </th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th
                    className="sortable"
                    aria-sort={
                      sort.key === "deadline"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort("deadline")}
                      title="Sortuj po terminie realizacji"
                    >
                      Termin{sortIndicator("deadline")}
                    </button>
                  </th>
                  <th>Zespół</th>
                  <th
                    className="sortable"
                    style={{ textAlign: "right" }}
                    aria-sort={
                      sort.key === "price"
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <button
                      type="button"
                      className="th-sort-btn"
                      onClick={() => toggleSort("price")}
                      title="Sortuj po wartości"
                    >
                      Wartość{sortIndicator("price")}
                    </button>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const late = isLate(o);
                  const productLabel =
                    PRODUCT_LABELS[o.productType] ?? o.productType;
                  const productIcon =
                    BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
                  const isPending = o.status === "OCZEKUJACE";
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
                      <td style={{ textAlign: "right" }}>
                        {enableQuote && isPending ? (
                          <button
                            type="button"
                            className="btn terracotta sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuoteOrder(o);
                            }}
                          >
                            Wyceń
                          </button>
                        ) : (
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
                        )}
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

      {quoteOrder && (
        <QuoteModal
          order={quoteOrder}
          onClose={() => setQuoteOrder(null)}
          onApproved={() => {
            const closed = quoteOrder;
            setQuoteOrder(null);
            invalidateOrders();
            invalidateInventory();
            toast.success(
              "Wycena zatwierdzona",
              `${formatRef(closed.id)} · ${closed.customerName} — link akceptacyjny dostępny w konsoli.`,
            );
          }}
        />
      )}
    </>
  );
}
