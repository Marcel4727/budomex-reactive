"use client";

import { useAuth } from "@/lib/auth";
import StatCards from "./StatCards";
import OrdersChart from "./OrdersChart";
import RecentOrders from "./RecentOrders";
import PriorityQueue from "./PriorityQueue";
import WorkerLoad from "./WorkerLoad";
import { useOrders } from "../_hooks/useOrders";

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return many;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data } = useOrders();

  const firstName = user?.firstName?.trim() || user?.fullName?.split(" ")[0] || "managerze";
  const pending = data?.countOczekujace ?? 0;
  const overdue = data?.countOverdue ?? 0;

  const pendingPhrase = `${pending} ${plural(pending, "zapytanie", "zapytania", "zapytań")} oczekuje na wycenę`;
  const overduePhrase =
    overdue > 0
      ? `${overdue} ${plural(overdue, "zamówienie ma", "zamówienia mają", "zamówień ma")} przekroczony termin`
      : null;

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Dashboard</div>
          <h1 className="content-title">Dashboard</h1>
          <p className="content-sub">
            Witaj z powrotem, {firstName}.{" "}
            <strong>{pendingPhrase}</strong>
            {overduePhrase ? (
              <>
                {", "}
                <strong>{overduePhrase}</strong>.
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      </header>

      <StatCards />

      <div className="dash-grid">
        <div className="col-stack">
          <OrdersChart />
          <RecentOrders />
        </div>
        <div className="col-stack">
          <PriorityQueue />
          <WorkerLoad />
        </div>
      </div>
    </>
  );
}
