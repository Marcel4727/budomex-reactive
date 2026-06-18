"use client";

import Icon, { type OmsIconName } from "../../_components/Icon";

export type Toast = {
  id: string;
  variant?: "success" | "info";
  icon?: OmsIconName;
  title: string;
  desc?: string;
  leaving?: boolean;
  undo?: boolean;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onUndo: (id: string) => void;
};

export default function ToastStack({ toasts, onDismiss, onUndo }: Props) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.variant ?? ""} ${t.leaving ? "leaving" : ""}`}
          role="status"
        >
          <div className="ti">
            <Icon
              name={t.icon ?? "info"}
              size={15}
              strokeWidth={t.icon === "check" ? 3 : 1.8}
            />
          </div>
          <div className="tb">
            <div className="tt-title">{t.title}</div>
            {t.desc && <div className="tt-desc">{t.desc}</div>}
          </div>
          {t.undo && (
            <button type="button" className="ta" onClick={() => onUndo(t.id)}>
              Cofnij
            </button>
          )}
          <button
            type="button"
            className="tc"
            onClick={() => onDismiss(t.id)}
            aria-label="Zamknij powiadomienie"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
