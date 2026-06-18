"use client";

import Link from "next/link";
import Icon from "../../_components/Icon";
import { useOrders } from "../_hooks/useOrders";
import OrdersListView from "../_components/OrdersListView";
import { usePageTitle } from "../../_components/usePageTitle";

export default function InboxPage() {
  const { data, isLoading } = useOrders();
  const count = data?.countOczekujace ?? 0;
  usePageTitle(
    count > 0
      ? `(${count}) Nowe zapytania · Budomex OMS`
      : "Nowe zapytania · Budomex OMS",
  );
  const showEmptyCTA = !isLoading && count === 0;

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Nowe zapytania</div>
          <h1 className="content-title">Nowe zapytania</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję zapytania…"
              : count === 0
                ? "Brak nowych zapytań. Wszystko wycenione."
                : `${count} ${count === 1 ? "zapytanie oczekuje" : "zapytań oczekuje"} na wycenę.`}
          </p>
        </div>
      </header>

      {showEmptyCTA && (
        <div className="inbox-empty-cta">
          <div className="inbox-empty-icon" aria-hidden="true">
            <Icon name="check-circle" size={20} />
          </div>
          <div className="inbox-empty-body">
            <strong>Skrzynka jest pusta.</strong>
            <span>
              Nowe zapytania trafiają tutaj automatycznie po wysłaniu
              formularza ze strony{" "}
              <Link href="/" target="_blank" className="inbox-link">
                budomex.pl
              </Link>
              .
            </span>
          </div>
          <Link href="/oms/manager/orders" className="btn secondary sm">
            Wszystkie zamówienia
          </Link>
        </div>
      )}

      <OrdersListView
        statuses={["OCZEKUJACE"]}
        enableQuote
        emptyLabel="Brak nowych zapytań. Wszystko wycenione."
      />
    </>
  );
}
