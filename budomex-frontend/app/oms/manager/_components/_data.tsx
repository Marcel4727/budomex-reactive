import type { OmsIconName } from "../../_components/Icon";

/* ============================================================
   Backend types + mappings + helpers used by manager dashboard
   ============================================================ */

export type BackendOrderStatus =
  | "OCZEKUJACE"
  | "ZAAKCEPTOWANE_PRZEZ_MISTRZA"
  | "W_REALIZACJI"
  | "ZREALIZOWANE"
  | "MONTAZ"
  | "ANULOWANE"
  | "KONIEC";

export const BACKEND_STATUS_MAP: Record<
  BackendOrderStatus,
  { cls: string; label: string }
> = {
  OCZEKUJACE: { cls: "warning", label: "Oczekujące" },
  ZAAKCEPTOWANE_PRZEZ_MISTRZA: { cls: "info", label: "Wycenione" },
  W_REALIZACJI: { cls: "info", label: "W realizacji" },
  ZREALIZOWANE: { cls: "success", label: "Zrealizowane" },
  MONTAZ: { cls: "purple", label: "Montaż" },
  ANULOWANE: { cls: "danger", label: "Anulowane" },
  KONIEC: { cls: "success", label: "Zakończone" },
};

export type BackendProductType =
  | "OKNO"
  | "DRZWI"
  | "BRAMA"
  | "ROLETA_ZEWNETRZNA"
  | "ROLETA_WEWNETRZNA"
  | "PARAPET"
  | "INNE";

export const PRODUCT_LABELS: Record<string, string> = {
  OKNO: "Okno",
  DRZWI: "Drzwi",
  BRAMA: "Brama",
  ROLETA_ZEWNETRZNA: "Roleta zewnętrzna",
  ROLETA_WEWNETRZNA: "Roleta wewnętrzna",
  PARAPET: "Parapet",
  INNE: "Inne",
};

export const BACKEND_PRODUCT_ICONS: Record<string, OmsIconName> = {
  OKNO: "window",
  DRZWI: "door",
  BRAMA: "gate",
  ROLETA_ZEWNETRZNA: "roller-shutter",
  ROLETA_WEWNETRZNA: "roller-shutter",
  PARAPET: "parapet",
  INNE: "package",
};

export function formatRef(id: number): string {
  return `BDX-${String(id).padStart(6, "0")}`;
}

export function relativeTime(iso: string): { label: string; urgent: boolean } {
  const submitted = new Date(iso).getTime();
  if (Number.isNaN(submitted)) return { label: "—", urgent: false };
  const diffMs = Date.now() - submitted;
  const mins = Math.max(0, Math.floor(diffMs / 60_000));
  const hours = Math.floor(mins / 60);
  if (mins < 1) return { label: "przed chwilą", urgent: false };
  if (mins < 60) return { label: `${mins} min temu`, urgent: false };
  if (hours < 48) return { label: `${hours} h temu`, urgent: hours >= 20 };
  const days = Math.floor(hours / 24);
  return { label: `${days} d temu`, urgent: true };
}

export function cityFrom(address: string | null | undefined): string {
  if (!address) return "—";
  const head = address.split(",")[0]?.trim() || address.trim();
  return head || "—";
}

export function workerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0] || "?").toUpperCase();
}

/** Deterministic color slot 1..6 based on numeric id. */
export function workerColor(id: number): 1 | 2 | 3 | 4 | 5 | 6 {
  return ((Math.abs(id) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}
