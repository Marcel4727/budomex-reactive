"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../_components/Icon";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
import {
  BACKEND_STATUS_MAP,
  PRODUCT_LABELS,
  formatRef,
  type BackendOrderStatus,
} from "./_data";
import OrderDetailModal from "./OrderDetailModal";

const MAX_RESULTS = 3;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function scoreOrder(o: BackendOrder, q: string): number {
  if (!q) return 0;
  const ref = formatRef(o.id).toLowerCase();
  const numericId = String(o.id);
  const name = normalize(o.customerName);

  // Exact ref / id wins
  if (ref === q || numericId === q) return 100;
  // Ref starts with query (e.g. "bdx-00012")
  if (ref.startsWith(q)) return 90;
  // Numeric prefix of id
  if (numericId.startsWith(q)) return 85;
  // Name starts with query
  if (name.startsWith(q)) return 70;
  // Name word starts with query
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  // Substring matches
  if (name.includes(q)) return 40;
  if (ref.includes(q)) return 30;
  return 0;
}

type Props = {
  placeholder: string;
};

export default function TopBarSearch({ placeholder }: Props) {
  const { data } = useOrders();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q.length < 1) return [];
    const orders = data?.orders ?? [];
    return orders
      .map((o) => ({ o, s: scoreOrder(o, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((r) => r.o);
  }, [data, query]);

  useEffect(() => {
    setFocusedIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (orderId: number) => {
    setDetailId(orderId);
    close();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) setQuery("");
      else setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[focusedIdx];
      if (pick) choose(pick.id);
    }
  };

  return (
    <>
      <div className="search-wrap" ref={wrapRef}>
        <div
          className="search"
          onClick={() => inputRef.current?.focus()}
        >
          <Icon name="search" size={14} />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            aria-label="Wyszukiwanie zamówień"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
          />
        </div>

        {open && query.trim().length > 0 && (
          <div className="search-results" role="listbox">
            {results.length === 0 ? (
              <div className="res-empty">Brak wyników dla „{query}”.</div>
            ) : (
              <>
                <div className="res-list">
                  {results.map((o, idx) => {
                    const status =
                      BACKEND_STATUS_MAP[o.status as BackendOrderStatus]
                        ?.label ?? o.status;
                    const product = PRODUCT_LABELS[o.productType] ?? o.productType;
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={idx === focusedIdx}
                        key={o.id}
                        className={`res-item ${idx === focusedIdx ? "focused" : ""}`}
                        onClick={() => choose(o.id)}
                        onMouseEnter={() => setFocusedIdx(idx)}
                      >
                        <div className="res-row1">
                          <span className="res-ref">{formatRef(o.id)}</span>
                          <span className="res-name">{o.customerName}</span>
                        </div>
                        <div className="res-row2">
                          <span className="res-product">
                            {o.quantity}× {product}
                          </span>
                          <span className="dot" />
                          <span>{status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="res-foot">
                  {results.length} {results.length === 1 ? "wynik" : "wyniki"}
                  {" "}· ↑↓ wybór · ↵ otwórz
                </div>
              </>
            )}
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
