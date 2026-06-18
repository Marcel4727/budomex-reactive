"use client";

import { useEffect } from "react";
import Icon, { type OmsIconName } from "./Icon";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destruktywna akcja → ostrzegawcza paleta. */
  danger?: boolean;
  icon?: OmsIconName;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  danger = false,
  icon = "alert-triangle",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
      if (e.key === "Enter" && !busy) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel, onConfirm]);

  const trapRef = useFocusTrap<HTMLDivElement>(open);
  if (!open) return null;

  return (
    <div
      className="qm-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-desc" : undefined}
    >
      <div
        ref={trapRef}
        className="qm-modal confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-body">
          <div className={`confirm-icon ${danger ? "danger" : ""}`}>
            <Icon name={icon} size={22} />
          </div>
          <div>
            <h3 id="confirm-title" className="confirm-title">
              {title}
            </h3>
            {description && (
              <p id="confirm-desc" className="confirm-desc">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="qm-foot">
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "terracotta" : ""}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
