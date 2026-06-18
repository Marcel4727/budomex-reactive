"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon, { type OmsIconName } from "../../_components/Icon";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
import { PRODUCT_LABELS, formatRef, relativeTime } from "./_data";
import OrderDetailModal from "./OrderDetailModal";

const SEEN_KEY = "bdx-oms-seen-notifs";

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

type NotifKind = "quote" | "install";

type Notif = {
  id: string;
  orderId: number;
  kind: NotifKind;
  ref: string;
  title: string;
  desc: string;
  time: string;
  sortKey: number;
};

function buildNotifications(orders: BackendOrder[]): Notif[] {
  const list: Notif[] = [];
  for (const o of orders) {
    const ref = formatRef(o.id);
    const productLabel = PRODUCT_LABELS[o.productType] ?? o.productType;
    const rel = relativeTime(o.submissionDate);
    const sortKey = new Date(o.submissionDate).getTime();

    if (o.status === "OCZEKUJACE") {
      list.push({
        id: `quote-${o.id}`,
        orderId: o.id,
        kind: "quote",
        ref,
        title: "Nowe zapytanie do wyceny",
        desc: `${o.quantity}× ${productLabel} · ${o.customerName}`,
        time: rel.label,
        sortKey,
      });
    } else if (o.status === "ZREALIZOWANE") {
      list.push({
        id: `install-${o.id}`,
        orderId: o.id,
        kind: "install",
        ref,
        title: "Zamówienie skończone — umów montaż",
        desc: `${o.customerName} · ${o.quantity}× ${productLabel}`,
        time: rel.label,
        sortKey,
      });
    }
  }
  return list.sort((a, b) => b.sortKey - a.sortKey);
}

const ICON_FOR: Record<NotifKind, OmsIconName> = {
  quote: "inbox",
  install: "truck",
};

const GROUP_LABEL: Record<NotifKind, string> = {
  quote: "Do wyceny",
  install: "Do montażu",
};

export default function NotificationsMenu() {
  const { data } = useOrders();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  const notifications = useMemo(
    () => buildNotifications(data?.orders ?? []),
    [data],
  );

  // Pruning: remove ids from "seen" that no longer exist among current notifications
  useEffect(() => {
    if (notifications.length === 0) return;
    const currentIds = new Set(notifications.map((n) => n.id));
    setSeen((prev) => {
      const pruned = new Set([...prev].filter((id) => currentIds.has(id)));
      if (pruned.size !== prev.size) {
        writeSeen(pruned);
        return pruned;
      }
      return prev;
    });
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const totalCount = notifications.length;
  const unseenCount = notifications.filter((n) => !seen.has(n.id)).length;

  const grouped = useMemo(() => {
    const map: Record<NotifKind, Notif[]> = { quote: [], install: [] };
    for (const n of notifications) {
      map[n.kind].push(n);
    }
    return map;
  }, [notifications]);

  const markAllSeen = () => {
    const merged = new Set(seen);
    notifications.forEach((n) => merged.add(n.id));
    writeSeen(merged);
    setSeen(merged);
  };

  const openOrder = (notifId: string, orderId: number) => {
    // Mark only this notification as seen
    if (!seen.has(notifId)) {
      const next = new Set(seen);
      next.add(notifId);
      writeSeen(next);
      setSeen(next);
    }
    setDetailId(orderId);
    setOpen(false);
  };

  return (
    <>
      <div className="notif-wrap" ref={wrapRef}>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Powiadomienia (${unseenCount} nowych)`}
          title="Powiadomienia"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="bell" size={17} />
          {unseenCount > 0 && (
            <>
              <span className="bell-dot" aria-hidden="true" />
              <span className="sr-only">{unseenCount} nowych powiadomień</span>
            </>
          )}
        </button>

        {open && (
          <div
            className="notif-pop"
            role="menu"
            aria-orientation="vertical"
            aria-label="Powiadomienia"
          >
            <div className="notif-head">
              <span className="title">Powiadomienia</span>
              {totalCount > 0 && <span className="count">{totalCount}</span>}
            </div>

            {notifications.length === 0 ? (
              <div className="notif-empty">
                Brak nowych powiadomień. Wszystko pod kontrolą.
              </div>
            ) : (
              <>
                {(["quote", "install"] as NotifKind[]).map((kind) => {
                  const items = grouped[kind];
                  if (items.length === 0) return null;
                  return (
                    <div key={kind}>
                      <div className="notif-group">
                        <span>
                          {GROUP_LABEL[kind]} ({items.length})
                        </span>
                      </div>
                      <div className="notif-list">
                        {items.map((n) => {
                          const isUnseen = !seen.has(n.id);
                          return (
                            <button
                              type="button"
                              role="menuitem"
                              key={n.id}
                              className={`notif-item ${n.kind} ${isUnseen ? "unseen" : ""}`}
                              onClick={() => openOrder(n.id, n.orderId)}
                            >
                              <div className="notif-icon">
                                <Icon name={ICON_FOR[n.kind]} size={16} />
                              </div>
                              <div className="notif-body">
                                <div className="notif-title-row">
                                  <span className="notif-ref">{n.ref}</span>
                                </div>
                                <div className="notif-title">{n.title}</div>
                                <div className="notif-desc">{n.desc}</div>
                                <div className="notif-time">{n.time}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            <div
              className="notif-foot"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Klik powiadomienia · otwórz zamówienie</span>
              {notifications.length > 0 && (
                <button
                  type="button"
                  className="notif-mark-all"
                  onClick={markAllSeen}
                  disabled={unseenCount === 0}
                >
                  {unseenCount === 0
                    ? "Wszystkie przeczytane"
                    : "Oznacz wszystkie"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {detailId != null && (
        <OrderDetailModal
          orderId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
