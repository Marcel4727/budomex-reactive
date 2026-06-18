"use client";

import { useEffect } from "react";
import Icon from "../../_components/Icon";
import { formatRef } from "../../manager/_components/_data";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Props = {
  orderId: number;
  customerName: string;
  onClose: () => void;
};

export default function CelebrationModal({
  orderId,
  customerName,
  onClose,
}: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="qm-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        className="qm-modal celebration-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="celebration-body">
          <div className="celebration-burst" aria-hidden="true">
            <Icon name="check-circle" size={44} strokeWidth={2.5} />
          </div>
          <h3 id="celebration-title" className="celebration-title">
            Zamówienie ukończone
          </h3>
          <p className="celebration-ref">{formatRef(orderId)}</p>
          <p id="celebration-desc" className="celebration-desc">
            Wszystkie zadania dla <strong>{customerName}</strong> zostały
            zaznaczone. Manager dostał sygnał — możesz zaczynać kolejne.
          </p>
        </div>
        <div className="qm-foot" style={{ justifyContent: "center" }}>
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Świetna robota
          </button>
        </div>
      </div>
    </div>
  );
}
