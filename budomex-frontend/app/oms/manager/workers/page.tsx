"use client";

import { useMemo, useState } from "react";
import Icon from "../../_components/Icon";
import { useOrders } from "../_hooks/useOrders";
import { useWorkers, type BackendWorker } from "../_hooks/useWorkers";
import { workerColor, workerInitials } from "../_components/_data";
import WorkerDetailModal from "../_components/WorkerDetailModal";
import { usePageTitle } from "../../_components/usePageTitle";

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

const WORKLOAD_LABEL: Record<string, string> = {
  free: "wolny",
  low: "lekkie",
  medium: "średnie",
  high: "wysokie",
  critical: "krytyczne",
};

export default function WorkersPage() {
  const { data: workers, error, isLoading } = useWorkers();
  const { data: ordersResp } = useOrders();
  const [selected, setSelected] = useState<BackendWorker | null>(null);
  usePageTitle("Pracownicy · Budomex OMS");

  const capacity = ordersResp?.countWRealizacji ?? 0;

  const activePerWorker = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of ordersResp?.orders ?? []) {
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
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Pracownicy</div>
          <h1 className="content-title">Pracownicy</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję zespół…"
              : `Zespół produkcyjny · ${workers?.length ?? 0} ${
                  (workers?.length ?? 0) === 1 ? "osoba" : "osób"
                }${capacity > 0 ? `, ${capacity} aktywnych zamówień` : ""}`}
          </p>
        </div>
      </header>

      <div className="card">
        {error && (
          <div
            style={{
              padding: "16px 20px",
              color: "var(--bdx-danger)",
              fontSize: 13,
            }}
          >
            Nie udało się pobrać listy pracowników.
          </div>
        )}

        {!error && !isLoading && rows.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Brak pracowników w systemie.
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="orders-tbl">
              <colgroup>
                <col style={{ width: 56 }} />
                <col />
                <col style={{ width: 180 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 280 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th>Pracownik</th>
                  <th>Login</th>
                  <th>Aktywne</th>
                  <th>Obciążenie</th>
                  <th style={{ textAlign: "right" }}>Poziom</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ worker: w, active }) => {
                  const name = displayName(w);
                  const initials = workerInitials(name);
                  const pct =
                    capacity > 0
                      ? Math.min(100, Math.round((active / capacity) * 100))
                      : 0;
                  return (
                    <tr
                      key={w.id}
                      onClick={() => setSelected(w)}
                      title="Otwórz profil pracownika"
                    >
                      <td>
                        <div className={`wl-avatar c-${workerColor(w.id)}`}>
                          {initials}
                        </div>
                      </td>
                      <td>
                        <div className="ord-customer">
                          {name}
                          {w.email && <span className="addr">{w.email}</span>}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--text-dim)",
                          }}
                        >
                          {w.username}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            color: "var(--text)",
                          }}
                        >
                          {active} / {capacity || "—"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="wl-bar"
                          style={{ maxWidth: 240, margin: 0 }}
                        >
                          <div
                            className={`wl-bar-fill ${loadClass(pct)}`}
                            style={{ width: capacity === 0 ? "0%" : `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={`badge ${
                            w.workload === "critical"
                              ? "danger"
                              : w.workload === "high"
                                ? "warning"
                                : w.workload === "free"
                                  ? "success"
                                  : "neutral"
                          }`}
                        >
                          <span className="b-dot" />
                          {WORKLOAD_LABEL[w.workload] ?? w.workload}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-foot" style={{ justifyContent: "flex-end" }}>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-dim)",
              fontStyle: "italic",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="info" size={12} />
            Klik wiersza — profil pracownika i jego zamówienia.
          </span>
        </div>
      </div>

      {selected && (
        <WorkerDetailModal
          worker={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
