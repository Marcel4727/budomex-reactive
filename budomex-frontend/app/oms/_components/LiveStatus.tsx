"use client";

import { useOrders } from "../manager/_hooks/useOrders";
import type { Role } from "./OmsShell";

type Props = { role: Role };

/**
 * Pokazuje stan połączenia z backendem na podstawie SWR.
 * Manager — używa useOrders (głównego endpointu dashboardu).
 * Worker — pokazuje neutralny indicator (worker ma własne hooki, ale na tym
 * etapie nie wpinamy ich tu, żeby uniknąć dual-fetcha).
 */
export default function LiveStatus({ role }: Props) {
  if (role === "worker") {
    return (
      <div className="live-status" aria-label="Status połączenia">
        <span className="live-dot" />
        <span>System aktywny</span>
      </div>
    );
  }
  return <ManagerLiveStatus />;
}

function ManagerLiveStatus() {
  const { error, isLoading, data } = useOrders();
  const hasError = !!error;
  const hasData = !!data;
  const stale = !isLoading && !hasData && !hasError;

  const variant = hasError ? "error" : stale ? "warning" : "";
  const label = hasError
    ? "Brak połączenia z serwerem"
    : isLoading && !hasData
      ? "Łączę…"
      : "System aktywny";

  return (
    <div
      className={`live-status ${variant}`}
      aria-label={`Status połączenia: ${label}`}
      title={
        hasError
          ? "Ostatnie odświeżenie nie powiodło się. SWR spróbuje ponownie."
          : undefined
      }
    >
      <span className="live-dot" />
      <span>{label}</span>
    </div>
  );
}
