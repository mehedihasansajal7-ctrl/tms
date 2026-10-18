// All dates are displayed and grouped in a single fixed business timezone,
// independent of the browser/server locale. Default: Asia/Dhaka (UTC+6, no DST).
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Dhaka";

const KEY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const OFFSET_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partsToObj(parts: Intl.DateTimeFormatPart[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

// Milliseconds that APP_TIMEZONE is ahead of UTC at the given instant (DST-aware).
function zoneOffsetMs(date: Date): number {
  const t = partsToObj(OFFSET_FMT.formatToParts(date));
  const localAsUtc = Date.UTC(t.year!, t.month! - 1, t.day!, t.hour ?? 0, t.minute ?? 0, t.second ?? 0);
  return localAsUtc - date.getTime();
}

export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const p = partsToObj(KEY_FMT.formatToParts(date));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function monthKey(d: Date | string): string {
  return dateKey(d).slice(0, 7);
}

// Start of the calendar day in APP_TIMEZONE (returned as a UTC instant).
export function startOfDay(d: Date): Date {
  const p = partsToObj(KEY_FMT.formatToParts(d));
  const utcMidnight = Date.UTC(p.year!, p.month! - 1, p.day!);
  const offset = zoneOffsetMs(new Date(utcMidnight));
  return new Date(utcMidnight - offset);
}

export function endOfDay(d: Date): Date {
  return new Date(startOfDay(d).getTime() + 86400000 - 1);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return DATETIME_FMT.format(date);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return DATE_FMT.format(date);
}
