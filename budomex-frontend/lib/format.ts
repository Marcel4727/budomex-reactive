const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LONG_DATE = new Intl.DateTimeFormat("pl-PL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const SHORT_DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const SHORT_DATE_TIME = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "—";
  return PLN.format(num);
}

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return LONG_DATE.format(d);
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return SHORT_DATE.format(d);
}

export function formatShortDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return SHORT_DATE_TIME.format(d);
}

export function formatOrderRef(id: number | string): string {
  const n = typeof id === "number" ? id : Number(id);
  if (Number.isNaN(n)) return String(id);
  return `BDX-${String(n).padStart(6, "0")}`;
}

export type Countdown = {
  label: string;
  urgent: boolean;
  expired: boolean;
};

export function deadlineCountdown(iso: string | null | undefined): Countdown {
  if (!iso) return { label: "—", urgent: false, expired: false };
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return { label: "—", urgent: false, expired: false };
  const diffMs = target - Date.now();
  if (diffMs <= 0) return { label: "termin minął", urgent: true, expired: true };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);
  if (hours < 1) {
    return { label: `${mins} min`, urgent: true, expired: false };
  }
  if (hours < 24) {
    return { label: `${hours} h ${mins} min`, urgent: hours < 6, expired: false };
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return {
    label: `${days} dn. ${restHours} h`,
    urgent: false,
    expired: false,
  };
}
