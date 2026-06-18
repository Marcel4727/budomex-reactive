"use client";

import { useMemo } from "react";
import Link from "next/link";
import Icon from "../../_components/Icon";
import { useWorkers } from "../_hooks/useWorkers";
import { useOrders } from "../_hooks/useOrders";
import { workerColor, workerInitials } from "./_data";
import { SkeletonAvatars } from "./SkeletonRow";

function loadClass(pct: number): string {
  if (pct >= 70) return "high";
  if (pct >= 40) return "med";
  return "";
}

function displayName(w: {
  firstName: string | null;
  lastName: string | null;
  username: string;
}): string {
  const full = `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim();
  return full || w.username;
}

function ordersWord(n: number): string {
  if (n === 1) return "zamówienie";
  const lastTwo = n % 100;
  if (lastTwo >= 12 && lastTwo <= 14) return "zamówień";
  const last = n % 10;
  if (last >= 2 && last <= 4) return "zamówienia";
  return "zamówień";
}

export default function WorkerLoad() {
  const { data: workers, error, isLoading } = useWorkers();
  const { data: ordersResp } = useOrders();

  // Capacity = liczba zamówień aktualnie w realizacji (wspólny mianownik dla wszystkich)
  const capacity = ordersResp?.countWRealizacji ?? 0;

  // Per-worker: ile spośród zamówień w realizacji ma faktycznie przypisanych
  const activePerWorker = useMemo(() => {
    const map = new Map<number, number>();
    const orders = ordersResp?.orders ?? [];
    for (const o of orders) {
      if (o.status !== "W_REALIZACJI") continue;
      for (const w of o.assignedWorkers) {
        map.set(w.id, (map.get(w.id) ?? 0) + 1);
      }
    }
    return map;
  }, [ordersResp]);

  const rows = useMemo(() => {
    return (workers ?? [])
      .map((w) => ({
        worker: w,
        active: activePerWorker.get(w.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.active - a.active ||
          b.worker.assignedOrders - a.worker.assignedOrders,
      );
  }, [workers, activePerWorker]);

  return (
    <div
      className="card"
      aria-busy={isLoading || undefined}
      aria-live="polite"
    >
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Obciążenie zespołu</h3>
        </div>
        <span className="card-sub">
          {isLoading
            ? "…"
            : capacity === 0
              ? "brak aktywnej produkcji"
              : `${capacity} ${ordersWord(capacity)} w realizacji`}
        </span>
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
          Nie udało się pobrać pracowników.
        </div>
      )}

      {!error && isLoading && (
        <div className="wl-list">
          <span className="sr-only">Ładuję pracowników…</span>
          <SkeletonAvatars count={4} />
        </div>
      )}

      {!error && !isLoading && rows.length === 0 && (
        <div
          style={{
            padding: "24px 20px",
            color: "var(--text-dim)",
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          Brak pracowników w systemie.
        </div>
      )}

      <div className="wl-list">
        {rows.map(({ worker: w, active }) => {
          const name = displayName(w);
          const initials = workerInitials(name);
          const pct =
            capacity > 0
              ? Math.min(100, Math.round((active / capacity) * 100))
              : 0;
          const label =
            capacity === 0
              ? "wolny"
              : active === 0
                ? "brak przypisań"
                : `${active} ${active === 1 ? "zlecenie" : active < 5 ? "zlecenia" : "zleceń"}`;
          const tooltipLabel =
            capacity === 0
              ? "Brak aktywnej produkcji w firmie."
              : `Pracownik przypisany do ${active} z ${capacity} zamówień aktualnie w realizacji.`;
          return (
            <div className="wl-item" key={w.id} title={tooltipLabel}>
              <div className={`wl-avatar c-${workerColor(w.id)}`}>
                {initials}
              </div>
              <div className="wl-info">
                <div className="wl-name">
                  <span>{name}</span>
                  <span className="wl-count">{label}</span>
                </div>
                <div className="wl-bar">
                  <div
                    className={`wl-bar-fill ${loadClass(pct)}`}
                    style={{ width: capacity === 0 ? "0%" : `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-foot" style={{ justifyContent: "flex-end" }}>
        <Link href="/oms/manager/workers" className="card-action-link">
          Zarządzaj pracownikami
          <Icon name="arrow-right" size={12} />
        </Link>
      </div>
    </div>
  );
}
