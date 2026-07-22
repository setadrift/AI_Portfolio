import type { DashboardSource } from "./dashboard";

export type RefreshGuidance = {
  recommendedStart: string;
  recommendedEnd: string;
  janeThrough?: string;
  bankThrough?: string;
  janeGapStart?: string;
  bankGapStart?: string;
};

function torontoDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDate(value?: string) {
  return value && /^20\d{2}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function buildRefreshGuidance(source?: Pick<DashboardSource, "janeDataThrough" | "bankDataThrough">, now = new Date()): RefreshGuidance {
  const recommendedEnd = shiftDate(torontoDate(now), -1);
  const recommendedStart = `${recommendedEnd.slice(0, 7)}-01`;
  const janeThrough = validDate(source?.janeDataThrough);
  const bankThrough = validDate(source?.bankDataThrough);
  return {
    recommendedStart,
    recommendedEnd,
    janeThrough,
    bankThrough,
    janeGapStart: janeThrough && janeThrough < recommendedEnd ? shiftDate(janeThrough, 1) : undefined,
    bankGapStart: bankThrough && bankThrough < recommendedEnd ? shiftDate(bankThrough, 1) : undefined,
  };
}
