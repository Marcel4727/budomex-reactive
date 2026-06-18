import Icon from "../../_components/Icon";
import {
  PRODUCT_LABELS,
  formatRef,
} from "../../manager/_components/_data";
import { formatLongDate } from "@/lib/format";
import type { WorkerOrderDetail } from "../_hooks/useWorkerOrderDetail";

export default function OrderInfo({ order }: { order: WorkerOrderDetail }) {
  const productLabel = PRODUCT_LABELS[order.productType] ?? order.productType;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Szczegóły zamówienia</h3>
        </div>
        <span className="card-sub">{formatRef(order.id)}</span>
      </div>

      <div className="rbac-banner" aria-label="Informacja o widoczności danych">
        <Icon name="eye-off" size={13} />
        <span>
          Widzisz dane techniczne potrzebne do produkcji. Pełne dane klienta widzi
          tylko manager.
        </span>
      </div>

      <div className="info-list">
        <div className="info-row">
          <div className="k">Klient</div>
          <div className="v">{order.customerName}</div>
        </div>
        <div className="info-row">
          <div className="k">Typ produktu</div>
          <div className="v">{productLabel}</div>
        </div>
        <div className="info-row">
          <div className="k">Ilość</div>
          <div className="v mono">{order.quantity} szt.</div>
        </div>
        <div className="info-row">
          <div className="k">Termin realizacji</div>
          <div className="v">
            {order.estimatedDeliveryDate
              ? formatLongDate(order.estimatedDeliveryDate)
              : "do uzgodnienia"}
          </div>
        </div>
        <div className="info-row">
          <div className="k">Specyfikacja</div>
          <div
            className="v note"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {order.productSpecifications || "Brak dodatkowej specyfikacji."}
          </div>
        </div>
      </div>
    </div>
  );
}
