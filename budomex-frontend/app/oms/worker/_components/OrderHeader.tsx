import Icon from "../../_components/Icon";
import { cityFrom, formatRef } from "../../manager/_components/_data";
import { deadlineCountdown, formatLongDate } from "@/lib/format";
import type { WorkerOrderDetail } from "../_hooks/useWorkerOrderDetail";

export default function OrderHeader({ order }: { order: WorkerOrderDetail }) {
  const ref = formatRef(order.id);
  const parts = ref.split("-");
  const prefix = parts.slice(0, parts.length - 1).join("-") + "-";
  const main = parts[parts.length - 1];

  const countdown = deadlineCountdown(order.estimatedDeliveryDate);
  const urgency = countdown.expired
    ? "red"
    : countdown.urgent
      ? "amber"
      : "green";
  const city = cityFrom(order.customerAddress);

  return (
    <header className="order-header">
      <div>
        <h1>
          <span className="order-num-prefix">{prefix}</span>
          <span className="order-num-main">{main}</span>
          {countdown.urgent && !countdown.expired && (
            <span className="badges">
              <span className="badge terracotta">
                <Icon name="flag" size={11} />
                Pilne
              </span>
            </span>
          )}
          {countdown.expired && (
            <span className="badges">
              <span className="badge danger">
                <Icon name="alert-triangle" size={11} />
                Po terminie
              </span>
            </span>
          )}
        </h1>
        <div className="meta">
          <span>
            Klient: <strong>{order.customerName}</strong>
          </span>
          {city !== "—" && (
            <>
              <span className="sep">·</span>
              <span>
                Lokalizacja: <strong>{city}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className={`countdown-card ${urgency}`}>
        <div className="cd-icon">
          <Icon name="clock" size={18} strokeWidth={2} />
        </div>
        <div className="cd-content">
          <div className="cd-label">Termin realizacji</div>
          <div className="cd-date">
            {order.estimatedDeliveryDate
              ? formatLongDate(order.estimatedDeliveryDate)
              : "—"}
          </div>
          <div className="cd-rel">{countdown.label}</div>
        </div>
      </div>
    </header>
  );
}
