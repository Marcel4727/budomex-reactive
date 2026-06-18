"use client";

import Link from "next/link";
import Icon, { type OmsIconName } from "../../_components/Icon";
import { useOrders } from "../_hooks/useOrders";
import { useMonthlyStats } from "../_hooks/useMonthlyStats";

type StatColor = "danger" | "info" | "warning" | "purple";
type Trend = "up" | "down" | "flat";

type StatCard = {
  key: string;
  label: string;
  value: number | null;
  /** Trendowa delta (m/m). Jeśli null — pole "status" zamiast trendu. */
  delta: { label: string; trend: Trend } | null;
  /** Tekstowy status (nie delta) — np. "wymagają wyceny". */
  status: string | null;
  color: StatColor;
  icon: OmsIconName;
  urgent: boolean;
  href: string;
};

const trendIcon = (trend: Trend): OmsIconName =>
  trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "minus";
const trendCls = (trend: Trend) =>
  trend === "up" ? "up" : trend === "down" ? "down" : "";

function computeMonthlyDelta(
  monthly: { name: string; zamowienia: number }[] | undefined,
): { label: string; trend: Trend } | null {
  if (!monthly || monthly.length < 2) return null;
  const currentIdx = new Date().getMonth();
  const current = monthly[currentIdx]?.zamowienia ?? 0;
  const prevIdx = (currentIdx + 11) % 12;
  const previous = monthly[prevIdx]?.zamowienia ?? 0;
  const diff = current - previous;
  if (diff === 0)
    return { label: "bez zmian vs poprzedni mies.", trend: "flat" };
  const sign = diff > 0 ? "+" : "";
  return {
    label: `${sign}${diff} vs poprzedni mies.`,
    trend: diff > 0 ? "up" : "down",
  };
}

export default function StatCards() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: monthly } = useMonthlyStats();

  const counts = {
    pending: orders?.countOczekujace ?? null,
    active: orders?.countWRealizacji ?? null,
    overdue: orders?.countOverdue ?? null,
    install: orders?.countMontaz ?? null,
  };

  const monthlyDelta = computeMonthlyDelta(monthly);

  const cards: StatCard[] = [
    {
      key: "pending",
      label: "Oczekujące zapytania",
      value: counts.pending,
      delta: null,
      status:
        counts.pending && counts.pending > 0
          ? counts.pending === 1
            ? "wymaga wyceny"
            : "wymagają wyceny"
          : "wszystko wycenione",
      color: "danger",
      icon: "inbox",
      urgent: (counts.pending ?? 0) > 0,
      href: "/oms/manager/inbox",
    },
    {
      key: "active",
      label: "W realizacji",
      value: counts.active,
      delta: monthlyDelta,
      status: null,
      color: "info",
      icon: "activity",
      urgent: false,
      href: "/oms/manager/production",
    },
    {
      key: "overdue",
      label: "Przekroczony termin",
      value: counts.overdue,
      delta: null,
      status:
        counts.overdue && counts.overdue > 0
          ? "wymaga reakcji"
          : "brak opóźnień",
      color: "warning",
      icon: "alert-triangle",
      urgent: (counts.overdue ?? 0) > 0,
      href: "/oms/manager/orders",
    },
    {
      key: "install",
      label: "W montażu",
      value: counts.install,
      delta: null,
      status: counts.install && counts.install > 0 ? "zaplanowane" : "—",
      color: "purple",
      icon: "truck",
      urgent: false,
      href: "/oms/manager/install",
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          className={`kpi ${s.color}`}
          aria-label={`${s.label}: ${s.value ?? "ładowanie"}, przejdź do listy`}
        >
          <div className="kpi-head">
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-icon">
              <Icon name={s.icon} size={16} />
            </div>
          </div>
          <div className="kpi-value">
            {s.value == null ? (ordersLoading ? "…" : "—") : s.value}
            {s.urgent && (s.value ?? 0) > 0 && (
              <>
                <span className="pulse-dot" aria-hidden="true" />
                <span className="sr-only">pilne — wymaga uwagi</span>
              </>
            )}
          </div>
          {s.delta ? (
            <div className={`kpi-delta ${trendCls(s.delta.trend)}`}>
              <Icon name={trendIcon(s.delta.trend)} size={11} />
              <span>{s.delta.label}</span>
            </div>
          ) : (
            <div className="kpi-status">
              <span>{s.status ?? "—"}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
