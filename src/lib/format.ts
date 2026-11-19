// All formatting is pinned to Lagos time so server and browser render identically.
const TZ = "Africa/Lagos";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: number | null | undefined) {
  return naira.format(Number(value ?? 0) || 0).replace("NGN", "₦");
}

export function formatNairaCompact(value: number | null | undefined) {
  const n = Number(value ?? 0) || 0;
  if (Math.abs(n) >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return formatNaira(n);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-NG").format(Number(value ?? 0) || 0);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});
const shortDateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});

function safeDate(iso: string | number | Date | null | undefined): Date | null {
  if (iso == null || iso === "") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string | number | Date | null | undefined) {
  const d = safeDate(iso);
  return d ? dateFmt.format(d) : "—";
}
export function formatShortDate(iso: string | number | Date | null | undefined) {
  const d = safeDate(iso);
  return d ? shortDateFmt.format(d) : "—";
}
export function formatTime(iso: string | number | Date | null | undefined) {
  const d = safeDate(iso);
  return d ? timeFmt.format(d) : "—";
}
export function formatDateTime(iso: string | number | Date | null | undefined) {
  const d = safeDate(iso);
  return d ? `${dateFmt.format(d)}, ${timeFmt.format(d)}` : "—";
}

export function dayKey(iso: string | number | Date | null | undefined) {
  // YYYY-MM-DD in Lagos time
  const d = safeDate(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function relativeTime(iso: string | number | Date | null | undefined, now: Date) {
  const d = safeDate(iso);
  if (!d) return "—";
  const diff = now.getTime() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const mins = Math.round(abs / 60000);
  let label: string;
  if (mins < 1) return "just now";
  if (mins < 60) label = `${mins}m`;
  else if (mins < 60 * 24) label = `${Math.round(mins / 60)}h`;
  else label = `${Math.round(mins / 60 / 24)}d`;
  return future ? `in ${label}` : `${label} ago`;
}

export function initials(name: string | null | undefined) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
