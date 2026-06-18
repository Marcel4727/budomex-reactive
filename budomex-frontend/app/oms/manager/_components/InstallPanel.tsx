"use client";

import { useMemo, useState } from "react";
import Icon from "../../_components/Icon";
import { useOrders, type BackendOrder } from "../_hooks/useOrders";
import { api, ApiError } from "@/lib/api";
import { invalidateOrders } from "../_lib/mutations";
import {
  BACKEND_PRODUCT_ICONS,
  PRODUCT_LABELS,
  cityFrom,
  formatRef,
  workerColor,
  workerInitials,
} from "./_data";
import {
  formatLongDate,
  formatShortDate,
  formatShortDateTime,
} from "@/lib/format";
import InstallScheduleModal from "./InstallScheduleModal";
import OrderDetailModal from "./OrderDetailModal";
import ConfirmDialog from "../../_components/ConfirmDialog";
import { useToast } from "@/lib/toast";

function isOverdueInstallation(o: BackendOrder): boolean {
  if (o.status !== "MONTAZ" || !o.installationDate) return false;
  return new Date(o.installationDate).getTime() < Date.now();
}

function AvatarStack({
  workers,
  max = 3,
}: {
  workers: { id: number; name: string }[];
  max?: number;
}) {
  if (workers.length === 0) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-dim)",
        }}
      >
        —
      </span>
    );
  }
  const visible = workers.slice(0, max);
  const extra = workers.length - max;
  return (
    <div className="av-stack" aria-label={`${workers.length} pracowników`}>
      {visible.map((w) => (
        <span key={w.id} className={`av c-${workerColor(w.id)}`} title={w.name}>
          {workerInitials(w.name)}
        </span>
      ))}
      {extra > 0 && <span className="av more">+{extra}</span>}
    </div>
  );
}

type ModalState =
  | { kind: "schedule"; order: BackendOrder }
  | { kind: "reschedule"; order: BackendOrder }
  | null;

export default function InstallPanel() {
  const { data, error, isLoading } = useOrders();
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<BackendOrder | null>(null);

  const { ready, scheduled } = useMemo(() => {
    const all = data?.orders ?? [];
    return {
      ready: all
        .filter((o) => o.status === "ZREALIZOWANE")
        .sort(
          (a, b) =>
            new Date(a.estimatedDeliveryDate ?? a.submissionDate).getTime() -
            new Date(b.estimatedDeliveryDate ?? b.submissionDate).getTime(),
        ),
      scheduled: all
        .filter((o) => o.status === "MONTAZ")
        .sort((a, b) => {
          const da = a.installationDate
            ? new Date(a.installationDate).getTime()
            : Infinity;
          const db = b.installationDate
            ? new Date(b.installationDate).getTime()
            : Infinity;
          return da - db;
        }),
    };
  }, [data]);

  const overdueCount = scheduled.filter(isOverdueInstallation).length;

  const completeInstallation = async (order: BackendOrder) => {
    setCompleting(order.id);
    try {
      await api(`/api/manager/order/${order.id}/complete-installation`, {
        method: "POST",
      });
      await invalidateOrders();
      toast.success(
        "Montaż zakończony",
        `Zamówienie ${formatRef(order.id)} (${order.customerName}) trafiło do archiwum.`,
      );
      setConfirmOrder(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || `Błąd ${err.status}`
          : "Nie udało się zakończyć montażu.";
      toast.error("Nie udało się zakończyć montażu", msg);
    } finally {
      setCompleting(null);
    }
  };

  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Montaż</div>
          <h1 className="content-title">Montaż</h1>
          <p className="content-sub">
            {isLoading
              ? "Ładuję dane montażu…"
              : `${ready.length} gotowych do montażu, ${scheduled.length} zaplanowanych${
                  overdueCount > 0 ? `, ${overdueCount} po terminie` : ""
                }.`}
          </p>
        </div>
      </header>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div
            style={{
              padding: "16px 20px",
              color: "var(--bdx-danger)",
              fontSize: 13,
            }}
          >
            Nie udało się pobrać zamówień. Sprawdź czy backend jest uruchomiony.
          </div>
        </div>
      )}

      <div
        className={`card ${ready.length > 0 ? "install-card-primary" : ""}`}
        style={{ marginBottom: 16 }}
      >
        <div className="card-head">
          <div className="card-head-left">
            <h3
              className={`card-title ${ready.length > 0 ? "card-title-alert" : ""}`}
              style={ready.length > 0 ? { color: "var(--accent)" } : undefined}
            >
              {ready.length > 0 && (
                <span className="alert-mark" aria-hidden="true">
                  <Icon name="zap" size={12} strokeWidth={2.5} />
                </span>
              )}
              Gotowe do montażu
            </h3>
          </div>
          <span className="card-sub">
            {isLoading
              ? "…"
              : ready.length === 0
                ? "brak akcji"
                : `${ready.length} ${ready.length === 1 ? "zamówienie wymaga akcji" : "zamówień wymaga akcji"}`}
          </span>
        </div>

        {!error && !isLoading && ready.length === 0 && (
          <div
            style={{
              padding: "24px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Żadne zamówienie nie czeka na zaplanowanie montażu.
          </div>
        )}

        <div className="pq-list">
          {ready.map((o) => {
            const productLabel = PRODUCT_LABELS[o.productType] ?? o.productType;
            const productIcon =
              BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
            return (
              <div className="pq-item" key={o.id}>
                <div className="pq-meta">
                  <div className="pq-num">
                    {formatRef(o.id)} · {cityFrom(o.customerAddress)}
                  </div>
                  <div className="pq-customer">{o.customerName}</div>
                  <div className="pq-product">
                    <span className="ord-product">
                      <span className="pi">
                        <Icon name={productIcon} size={12} />
                      </span>
                      {o.quantity}× {productLabel}
                    </span>
                  </div>
                  <div className="pq-time">
                    <Icon name="check-circle" size={11} />
                    <span>
                      Produkcja ukończona ·{" "}
                      {o.estimatedDeliveryDate
                        ? `termin ${formatShortDate(o.estimatedDeliveryDate)}`
                        : "bez terminu"}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => setDetailId(o.id)}
                  >
                    Szczegóły
                  </button>
                  <button
                    type="button"
                    className="btn terracotta sm"
                    onClick={() => setModal({ kind: "schedule", order: o })}
                  >
                    Zaplanuj montaż
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-left">
            <h3
              className="card-title"
              style={
                overdueCount > 0
                  ? { color: "var(--bdx-danger)" }
                  : undefined
              }
            >
              Zaplanowane montaże
            </h3>
          </div>
          <span className="card-sub">
            {isLoading
              ? "…"
              : overdueCount > 0
                ? `${scheduled.length} łącznie, ${overdueCount} po terminie`
                : `${scheduled.length} łącznie`}
          </span>
        </div>

        {!error && !isLoading && scheduled.length === 0 && (
          <div
            style={{
              padding: "24px 20px",
              color: "var(--text-dim)",
              fontSize: 13,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Brak zaplanowanych montaży.
          </div>
        )}

        {scheduled.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="orders-tbl">
              <colgroup>
                <col style={{ width: 130 }} />
                <col />
                <col style={{ width: 180 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 240 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Klient · adres</th>
                  <th>Produkt</th>
                  <th>Termin montażu</th>
                  <th>Ekipa</th>
                  <th style={{ textAlign: "right" }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {scheduled.map((o) => {
                  const overdue = isOverdueInstallation(o);
                  const productLabel =
                    PRODUCT_LABELS[o.productType] ?? o.productType;
                  const productIcon =
                    BACKEND_PRODUCT_ICONS[o.productType] ?? "package";
                  const isCompleting = completing === o.id;
                  return (
                    <tr key={o.id} onClick={() => setDetailId(o.id)}>
                      <td>
                        <span className="ord-num">{formatRef(o.id)}</span>
                      </td>
                      <td>
                        <div className="ord-customer">
                          {o.customerName}
                          <span className="addr">
                            {o.customerAddress || cityFrom(o.customerAddress)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="ord-product">
                          <span className="pi">
                            <Icon name={productIcon} size={12} />
                          </span>
                          {o.quantity}× {productLabel}
                        </span>
                      </td>
                      <td>
                        <div className={`ord-deadline ${overdue ? "late" : ""}`}>
                          {o.installationDate
                            ? formatShortDateTime(o.installationDate)
                            : "—"}
                          {o.installationDate && (
                            <span
                              className="rel"
                              title={formatLongDate(o.installationDate)}
                            >
                              {overdue ? "po terminie" : "zaplanowany"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <AvatarStack workers={o.assignedWorkers} max={3} />
                      </td>
                      <td
                        style={{ textAlign: "right" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() =>
                              setModal({ kind: "reschedule", order: o })
                            }
                            disabled={isCompleting}
                          >
                            Przełóż
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => setConfirmOrder(o)}
                            disabled={isCompleting}
                          >
                            Zakończ montaż
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <InstallScheduleModal
          order={modal.order}
          mode={modal.kind}
          onClose={() => setModal(null)}
          onDone={() => {
            toast.success(
              modal.kind === "schedule"
                ? "Montaż zaplanowany"
                : "Termin montażu zaktualizowany",
              `${formatRef(modal.order.id)} · ${modal.order.customerName}`,
            );
            setModal(null);
          }}
        />
      )}

      {detailId != null && (
        <OrderDetailModal
          orderId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      <ConfirmDialog
        open={confirmOrder !== null}
        title="Zakończyć montaż?"
        description={
          confirmOrder
            ? `Zamówienie ${formatRef(confirmOrder.id)} dla ${confirmOrder.customerName} zostanie oznaczone jako zakończone i przeniesione do archiwum. Tej akcji nie można cofnąć.`
            : ""
        }
        confirmLabel="Zakończ montaż"
        cancelLabel="Anuluj"
        danger
        icon="check-circle"
        busy={completing !== null}
        onConfirm={() => confirmOrder && completeInstallation(confirmOrder)}
        onCancel={() => setConfirmOrder(null)}
      />
    </>
  );
}
