import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";

type Props = {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  emptyLabel?: string;
  errorLabel?: string;
  loadingLabel?: string;
  children: ReactNode;
};

export default function WidgetState({
  loading,
  error,
  empty,
  emptyLabel = "Brak danych.",
  errorLabel,
  loadingLabel = "Ładuję dane…",
  children,
}: Props) {
  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          color: "var(--text-dim)",
          fontSize: 13,
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        {loadingLabel}
      </div>
    );
  }

  if (error) {
    const fallback =
      error instanceof ApiError && error.message
        ? error.message
        : "Nie udało się pobrać danych. Sprawdź, czy backend działa.";
    return (
      <div
        style={{
          padding: "16px 20px",
          color: "var(--bdx-danger)",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        {errorLabel ?? fallback}
      </div>
    );
  }

  if (empty) {
    return (
      <div
        style={{
          padding: "24px 20px",
          color: "var(--text-dim)",
          fontSize: 13,
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return <>{children}</>;
}
