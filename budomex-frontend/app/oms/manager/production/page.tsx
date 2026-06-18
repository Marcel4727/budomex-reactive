"use client";

import { useMemo } from "react";
import { useOrders } from "../_hooks/useOrders";
import OrdersListView from "../_components/OrdersListView";
import { usePageTitle } from "../../_components/usePageTitle";

export default function ProductionPage() {
  const { data, isLoading } = useOrders();
  usePageTitle("Produkcja · Budomex OMS");

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const inProgress = orders.filter((o) => o.status === "W_REALIZACJI");
    const accepted = orders.filter(
      (o) => o.status === "ZAAKCEPTOWANE_PRZEZ_MISTRZA",
    );
    const overdue = inProgress.filter(
      (o) =>
        o.estimatedDeliveryDate &&
        new Date(o.estimatedDeliveryDate).getTime() < Date.now(),
    ).length;
    return {
      inProgress: inProgress.length,
      accepted: accepted.length,
      overdue,
    };
  }, [data]);

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Produkcja</div>
          <h1 className="content-title">Produkcja</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję zamówienia produkcyjne…"
              : `${stats.inProgress} w realizacji${
                  stats.accepted > 0
                    ? `, ${stats.accepted} czeka na rozpoczęcie`
                    : ""
                }${stats.overdue > 0 ? `, ${stats.overdue} po terminie` : ""}.`}
          </p>
        </div>
      </header>

      <OrdersListView
        statuses={["ZAAKCEPTOWANE_PRZEZ_MISTRZA", "W_REALIZACJI"]}
        emptyLabel="Brak zamówień w produkcji."
      />
    </>
  );
}
