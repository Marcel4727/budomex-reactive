"use client";

import Icon, { type OmsIconName } from "../../_components/Icon";

export type EmptyReason =
  | "no-orders"
  | "no-selection"
  | "forbidden"
  | "not-found"
  | "error";

type Props = {
  reason: EmptyReason;
  message?: string;
  onRetry?: () => void;
};

const META: Record<
  EmptyReason,
  { icon: OmsIconName; title: string; description: string; role: "status" | "alert" }
> = {
  "no-orders": {
    icon: "inbox",
    title: "Brak przypisanych zamówień",
    description:
      "Nie masz aktualnie żadnych zamówień w realizacji. Manager przypisze ci je gdy będą gotowe.",
    role: "status",
  },
  "no-selection": {
    icon: "layout-grid",
    title: "Wybierz zamówienie",
    description: "Kliknij pozycję na pasku bocznym, aby zobaczyć szczegóły.",
    role: "status",
  },
  forbidden: {
    icon: "alert-triangle",
    title: "Brak dostępu",
    description:
      "To zamówienie nie jest do ciebie przypisane. Skontaktuj się z managerem jeśli to pomyłka.",
    role: "alert",
  },
  "not-found": {
    icon: "alert-circle",
    title: "Nie znaleziono zamówienia",
    description:
      "Zamówienie zostało usunięte lub link jest nieprawidłowy. Wybierz inne z paska bocznego.",
    role: "alert",
  },
  error: {
    icon: "alert-circle",
    title: "Nie udało się załadować zamówienia",
    description:
      "Sprawdź połączenie z internetem lub czy backend jest uruchomiony.",
    role: "alert",
  },
};

export default function WorkerEmptyState({ reason, message, onRetry }: Props) {
  const meta = META[reason];
  return (
    <div className="worker-empty" role={meta.role}>
      <div className="worker-empty-icon" aria-hidden="true">
        <Icon name={meta.icon} size={26} />
      </div>
      <h2 className="worker-empty-title">{meta.title}</h2>
      <p className="worker-empty-desc">{message ?? meta.description}</p>
      {onRetry && (
        <button type="button" className="btn secondary sm" onClick={onRetry}>
          <Icon name="refresh-cw" size={13} />
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}
