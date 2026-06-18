"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon, { type OmsIconName } from "./Icon";
import type { Role } from "./OmsShell";
import { useOrders } from "../manager/_hooks/useOrders";
import {
  useWorkerOrders,
  type WorkerOrderListItem,
} from "../worker/_hooks/useWorkerOrders";
import {
  BACKEND_PRODUCT_ICONS,
  PRODUCT_LABELS,
  formatRef,
} from "../manager/_components/_data";
import { deadlineCountdown, formatShortDate } from "@/lib/format";

type NavItem = {
  key: string;
  label: string;
  icon: OmsIconName;
  href: string;
  badge?: number;
  badgeMuted?: number;
};

function buildManagerNav(counts: {
  inbox: number;
  orders: number;
  production: number;
  install: number;
}): NavItem[] {
  return [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard", href: "/oms/manager" },
    { key: "inbox", label: "Nowe zapytania", icon: "inbox", href: "/oms/manager/inbox", badge: counts.inbox },
    { key: "orders", label: "Zamówienia", icon: "clipboard-list", href: "/oms/manager/orders", badgeMuted: counts.orders },
    { key: "production", label: "Produkcja", icon: "hammer", href: "/oms/manager/production", badgeMuted: counts.production },
    { key: "install", label: "Montaż", icon: "truck", href: "/oms/manager/install", badgeMuted: counts.install },
    { key: "workers", label: "Pracownicy", icon: "users", href: "/oms/manager/workers" },
    { key: "archive", label: "Archiwum", icon: "archive", href: "/oms/manager/archive" },
  ];
}


function NavLinks({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string | null;
}) {
  return (
    <>
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={`sb-link ${active ? "active" : ""} ${
              it.badgeMuted != null ? "muted-badge" : ""
            }`}
          >
            <Icon name={it.icon} size={18} />
            <span>{it.label}</span>
            {it.badge != null && it.badge > 0 && (
              <span className="sb-badge accent">{it.badge}</span>
            )}
            {it.badgeMuted != null && it.badgeMuted > 0 && (
              <span className="sb-badge">{it.badgeMuted}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

function ManagerExtras({ pathname }: { pathname: string | null }) {
  const settingsActive = pathname === "/oms/manager/settings";
  return (
    <>
      <div className="sb-separator" />
      <nav className="sb-nav" aria-label="Pozostałe">
        <Link
          href="/oms/manager/settings"
          className={`sb-link ${settingsActive ? "active" : ""}`}
        >
          <Icon name="settings" size={18} />
          <span>Ustawienia</span>
          <span className="sb-soon-pill">wkrótce</span>
        </Link>
      </nav>
      <div className="sb-foot" />
    </>
  );
}

function sortWorkerOrders(orders: WorkerOrderListItem[]): WorkerOrderListItem[] {
  return orders.slice().sort((a, b) => {
    const da = a.estimatedDeliveryDate
      ? new Date(a.estimatedDeliveryDate).getTime()
      : Number.POSITIVE_INFINITY;
    const db = b.estimatedDeliveryDate
      ? new Date(b.estimatedDeliveryDate).getTime()
      : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.id - b.id;
  });
}

function WorkerExtras({ pathname }: { pathname: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading } = useWorkerOrders();

  const orders = useMemo(() => sortWorkerOrders(data ?? []), [data]);
  const rawActiveId = searchParams.get("orderId");
  const activeId = rawActiveId ? Number(rawActiveId) : null;
  const onPanelRoute = pathname === "/oms/worker";

  // Default selection — gdy jesteśmy na /oms/worker bez ?orderId i lista nie pusta,
  // wybierz pierwsze (najbliższy deadline).
  useEffect(() => {
    if (!onPanelRoute) return;
    if (orders.length === 0) return;
    if (activeId != null) {
      const stillThere = orders.some((o) => o.id === activeId);
      if (stillThere) return;
    }
    const first = orders[0];
    const params = new URLSearchParams(searchParams.toString());
    params.set("orderId", String(first.id));
    router.replace(`/oms/worker?${params.toString()}`, { scroll: false });
  }, [onPanelRoute, orders, activeId, router, searchParams]);

  const selectOrder = (id: number) => {
    const params = new URLSearchParams(
      onPanelRoute ? searchParams.toString() : "",
    );
    params.set("orderId", String(id));
    router.push(`/oms/worker?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <div className="sb-section-label">
        <span>Moje zamówienia</span>
        <span className="count-pill">{orders.length}</span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            color: "var(--bdx-danger)",
            fontSize: 12,
          }}
        >
          Nie udało się pobrać przypisanych zamówień.
        </div>
      )}

      {!error && isLoading && !data && (
        <div
          className="sb-empty"
          style={{
            padding: "10px 14px",
            color: "var(--text-dim)",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          Ładuję…
        </div>
      )}

      {!error && !isLoading && orders.length === 0 && (
        <div
          className="sb-empty"
          role="status"
          style={{
            padding: "14px 16px",
            color: "var(--text-dim)",
            fontSize: 12,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <Icon name="inbox" size={20} />
          <div style={{ marginTop: 6, fontStyle: "italic" }}>
            Brak przypisanych zamówień.
          </div>
          <div style={{ marginTop: 4, fontSize: 11 }}>
            Manager przypisze ci je, gdy będą gotowe do produkcji.
          </div>
        </div>
      )}

      <div className="sb-orders">
        {orders.map((o) => {
          const isActive = onPanelRoute && activeId === o.id;
          const countdown = deadlineCountdown(o.estimatedDeliveryDate);
          const pct = Math.max(0, Math.min(100, o.completionPercentage ?? 0));
          const productLabel = PRODUCT_LABELS[o.productType] ?? o.productType;
          const productIcon =
            BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
          return (
            <button
              type="button"
              key={o.id}
              className={`sb-order ${isActive ? "active" : ""} ${countdown.expired ? "late" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => selectOrder(o.id)}
              title={o.customerName}
            >
              <div className="sb-order-top">
                <span className="sb-order-num">{formatRef(o.id)}</span>
              </div>
              <div className="sb-order-product">
                <span className="sb-order-product-icon" aria-hidden="true">
                  <Icon name={productIcon} size={11} />
                </span>
                {productLabel} · {o.customerName}
              </div>
              <div className="sb-order-bar">
                <div
                  className="sb-order-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="sb-order-meta">
                <span>
                  {pct}%
                  {o.estimatedDeliveryDate
                    ? ` · ${formatShortDate(o.estimatedDeliveryDate)}`
                    : ""}
                </span>
                {countdown.expired ? (
                  <span className="late">{countdown.label}</span>
                ) : countdown.urgent ? (
                  <span className="urgent">{countdown.label}</span>
                ) : (
                  <span>{countdown.label}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

    </>
  );
}

function ManagerNav({ pathname }: { pathname: string | null }) {
  const { data } = useOrders();
  const orders = data?.orders ?? [];
  const counts = {
    inbox: data?.countOczekujace ?? 0,
    orders: orders.length,
    production: orders.filter(
      (o) =>
        o.status === "ZAAKCEPTOWANE_PRZEZ_MISTRZA" ||
        o.status === "W_REALIZACJI",
    ).length,
    install: orders.filter(
      (o) => o.status === "ZREALIZOWANE" || o.status === "MONTAZ",
    ).length,
  };
  return <NavLinks items={buildManagerNav(counts)} pathname={pathname} />;
}

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const isWorker = role === "worker";

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-mark" aria-hidden="true" />
        <div>
          <div className="sb-wordmark">BUDOMEX</div>
          <div className="sb-sub">
            {isWorker ? "PANEL PRACOWNIKA" : "PANEL MANAGERA"}
          </div>
        </div>
      </div>

      {!isWorker && (
        <nav className="sb-nav" aria-label="Główna nawigacja">
          <ManagerNav pathname={pathname} />
        </nav>
      )}

      {isWorker ? (
        <WorkerExtras pathname={pathname} />
      ) : (
        <ManagerExtras pathname={pathname} />
      )}
    </aside>
  );
}
