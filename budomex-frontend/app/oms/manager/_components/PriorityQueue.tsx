"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "../../_components/Icon";
import { ApiError } from "@/lib/api";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
import { invalidateOrders, invalidateInventory } from "../_lib/mutations";
import {
  PRODUCT_LABELS,
  cityFrom,
  formatRef,
  relativeTime,
} from "./_data";
import QuoteModal from "./QuoteModal";
import { useToast } from "@/lib/toast";
import { SkeletonRows } from "./SkeletonRow";

const VISIBLE = 3;

export default function PriorityQueue() {
  const { data, error, isLoading } = useOrders();
  const [quoteOrder, setQuoteOrder] = useState<BackendOrder | null>(null);
  const toast = useToast();

  const oczekujace = (data?.orders ?? []).filter(
    (o) => o.status === "OCZEKUJACE",
  );

  const isAuthError =
    error instanceof ApiError && (error.status === 401 || error.status === 403);

  const visibleOrders = oczekujace.slice(0, VISIBLE);
  const remaining = Math.max(0, oczekujace.length - VISIBLE);
  const hasPending = oczekujace.length > 0;

  return (
    <>
      <div
        className="card"
        aria-busy={isLoading || undefined}
        aria-live="polite"
      >
        <div className="card-head">
          <div className="card-head-left">
            <h3
              className={`card-title ${hasPending ? "card-title-alert" : ""}`}
              style={hasPending ? { color: "var(--bdx-danger)" } : undefined}
            >
              {hasPending && (
                <span className="alert-mark" aria-hidden="true">
                  <Icon name="alert-circle" size={12} strokeWidth={2.5} />
                </span>
              )}
              Wymaga wyceny
            </h3>
          </div>
          <span className="card-sub">
            {isLoading ? "…" : `${oczekujace.length} oczekujących`}
          </span>
        </div>

        {error && !isAuthError && (
          <div
            role="alert"
            style={{
              padding: "16px 20px",
              color: "var(--bdx-danger)",
              fontSize: 13,
            }}
          >
            Nie udało się pobrać zapytań. Sprawdź czy backend jest uruchomiony.
          </div>
        )}

        {!error && isLoading && (
          <div className="pq-list">
            <span className="sr-only">Ładuję zapytania…</span>
            <SkeletonRows count={3} />
          </div>
        )}

        {!error && !isLoading && oczekujace.length === 0 && (
          <div
            style={{
              padding: "24px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Brak nowych zapytań. Wszystko wycenione.
          </div>
        )}

        <div className="pq-list">
          {visibleOrders.map((o) => {
            const rel = relativeTime(o.submissionDate);
            const productLabel = PRODUCT_LABELS[o.productType] ?? o.productType;
            const truncated = o.productSpecifications.length > 60;
            const spec = truncated
              ? `${o.productSpecifications.slice(0, 57)}…`
              : o.productSpecifications;
            return (
              <div className="pq-item" key={o.id}>
                <div className="pq-meta">
                  <div className="pq-num">
                    {formatRef(o.id)} · {cityFrom(o.customerAddress)}
                  </div>
                  <div className="pq-customer">{o.customerName}</div>
                  <div
                    className="pq-product"
                    title={truncated ? o.productSpecifications : undefined}
                  >
                    {o.quantity}× {productLabel} · {spec}
                  </div>
                  <div className={`pq-time ${rel.urgent ? "urgent" : ""}`}>
                    <Icon name="clock" size={11} />
                    <span>Otrzymane {rel.label}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn terracotta sm"
                  onClick={() => setQuoteOrder(o)}
                >
                  Wyceń
                </button>
              </div>
            );
          })}
        </div>

        <div className="card-foot" style={{ justifyContent: "flex-end" }}>
          <Link href="/oms/manager/inbox" className="card-action-link">
            Zobacz wszystkie wyceny
            {remaining > 0 ? ` (+${remaining})` : ""}
            <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      </div>

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
