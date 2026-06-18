"use client";

import { useMemo } from "react";
import { useOrders } from "../_hooks/useOrders";
import OrdersListView from "../_components/OrdersListView";
import type { BackendOrderStatus } from "../_components/_data";
import { usePageTitle } from "../../_components/usePageTitle";

const ARCHIVE_STATUSES: BackendOrderStatus[] = [
  "ZREALIZOWANE",
  "MONTAZ",
  "KONIEC",
  "ANULOWANE",
];

export default function ArchivePage() {
  const { data, isLoading } = useOrders();
  usePageTitle("Archiwum · Budomex OMS");

  const count = useMemo(() => {
    return (data?.orders ?? []).filter((o) =>
      ARCHIVE_STATUSES.includes(o.status as BackendOrderStatus),
    ).length;
  }, [data]);

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Archiwum</div>
          <h1 className="content-title">Archiwum</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję archiwum…"
              : `Zamówienia zakończone, anulowane i w trakcie montażu · ${count}`}
          </p>
        </div>
      </header>

      <OrdersListView
        statuses={ARCHIVE_STATUSES}
        emptyLabel="Archiwum jest puste."
      />
    </>
  );
}
