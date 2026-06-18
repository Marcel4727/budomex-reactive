"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOrders } from "../_hooks/useOrders";
import OrdersListView from "../_components/OrdersListView";
import {
  BACKEND_STATUS_MAP,
  type BackendOrderStatus,
} from "../_components/_data";
import { usePageTitle } from "../../_components/usePageTitle";

type Filter = "all" | BackendOrderStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Wszystkie" },
  { key: "OCZEKUJACE", label: BACKEND_STATUS_MAP.OCZEKUJACE.label },
  { key: "ZAAKCEPTOWANE_PRZEZ_MISTRZA", label: BACKEND_STATUS_MAP.ZAAKCEPTOWANE_PRZEZ_MISTRZA.label },
  { key: "W_REALIZACJI", label: BACKEND_STATUS_MAP.W_REALIZACJI.label },
  { key: "ZREALIZOWANE", label: BACKEND_STATUS_MAP.ZREALIZOWANE.label },
  { key: "MONTAZ", label: BACKEND_STATUS_MAP.MONTAZ.label },
];

const VALID: Filter[] = FILTERS.map((f) => f.key);

function parseFilter(raw: string | null): Filter {
  if (raw && (VALID as string[]).includes(raw)) return raw as Filter;
  return "all";
}

export default function OrdersPage() {
  const { data, isLoading } = useOrders();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get("status"));
  usePageTitle("Zamówienia · Budomex OMS");

  const setFilter = (next: Filter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("status");
    else params.set("status", next);
    const qs = params.toString();
    router.replace(qs ? `/oms/manager/orders?${qs}` : "/oms/manager/orders", {
      scroll: false,
    });
  };

  const counts = useMemo(() => {
    const map: Partial<Record<BackendOrderStatus, number>> = {};
    for (const o of data?.orders ?? []) {
      const s = o.status as BackendOrderStatus;
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [data]);

  const total = data?.orders.length ?? 0;
  const statuses: BackendOrderStatus[] | undefined =
    filter === "all" ? undefined : [filter];

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Zamówienia</div>
          <h1 className="content-title">Zamówienia</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję zamówienia…"
              : `Pełna lista wszystkich zamówień w systemie · ${total}`}
          </p>
        </div>
      </header>

      <div className="filter-chips" role="tablist" aria-label="Filtr statusów">
        {FILTERS.map((f) => {
          const count =
            f.key === "all" ? total : (counts[f.key as BackendOrderStatus] ?? 0);
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`filter-chip ${active ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              <span>{f.label}</span>
              <span className="filter-chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <OrdersListView
        statuses={statuses}
        emptyLabel="Brak zamówień w tej kategorii."
      />
    </>
  );
}
