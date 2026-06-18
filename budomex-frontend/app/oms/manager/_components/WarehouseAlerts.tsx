"use client";

import Icon from "../../_components/Icon";
import { useInventory } from "../_hooks/useInventory";

export default function WarehouseAlerts() {
  const { data, error, isLoading } = useInventory();

  const items = (data ?? [])
    .slice()
    .sort((a, b) => {
      const da =
        a.minimumThreshold > 0
          ? (a.minimumThreshold - a.availableQuantity) / a.minimumThreshold
          : 0;
      const db =
        b.minimumThreshold > 0
          ? (b.minimumThreshold - b.availableQuantity) / b.minimumThreshold
          : 0;
      return db - da;
    });

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-left">
          <h3 className="card-title">Magazyn — niskie stany</h3>
        </div>
        {!isLoading && (
          <span className={`badge ${items.length > 0 ? "warning" : "success"}`}>
            <span className="b-dot" />
            {items.length > 0 ? `${items.length} alerty` : "wszystko OK"}
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "16px 20px",
            color: "var(--bdx-danger)",
            fontSize: 13,
          }}
        >
          Nie udało się pobrać stanu magazynu.
        </div>
      )}

      {!error && !isLoading && items.length === 0 && (
        <div
          style={{
            padding: "24px 20px",
            color: "var(--text-dim)",
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          Wszystkie pozycje powyżej progu minimum.
        </div>
      )}

      <div className="wh-list">
        {items.slice(0, 5).map((w) => {
          const crit =
            w.minimumThreshold > 0 &&
            w.availableQuantity / w.minimumThreshold < 0.5;
          return (
            <div className={`wh-item ${crit ? "crit" : ""}`} key={w.id}>
              <div className="wh-icon">
                <Icon name="alert-triangle" size={14} />
              </div>
              <div className="wh-info">
                <div className="wh-name">{w.name}</div>
                <div className="wh-stock">
                  <span className={crit ? "lo" : ""}>
                    {w.availableQuantity} {w.unit ?? "szt."}
                  </span>{" "}
                  / min {w.minimumThreshold}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-foot" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="card-action-link">
          Pełny widok magazynu
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}
