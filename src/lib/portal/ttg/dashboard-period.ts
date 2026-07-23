export type DashboardPeriodKind = "week" | "month" | "quarter" | "custom";

export type DashboardRange = {
  kind: DashboardPeriodKind;
  start: string;
  end: string;
  label: string;
  offset: number;
};

type PeriodParams = { period?: string; offset?: string; from?: string; to?: string };

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (value: string) => new Date(`${value}T12:00:00Z`);
const shiftDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
const monthStart = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
const monthEnd = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));

function formatDate(value: string, year = true) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(utc(value));
}

function validDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(utc(value).getTime()));
}

export function resolveDashboardRange(params: PeriodParams, latestDate: string): DashboardRange {
  if (validDate(params.from) && validDate(params.to) && params.from! <= params.to!) {
    return {
      kind: "custom",
      start: params.from!,
      end: params.to!,
      label: `${formatDate(params.from!, params.from!.slice(0, 4) !== params.to!.slice(0, 4))} – ${formatDate(params.to!)}`,
      offset: 0,
    };
  }
  const kind: Exclude<DashboardPeriodKind, "custom"> = params.period === "week" || params.period === "quarter" ? params.period : "month";
  const offset = Math.max(0, Number.parseInt(params.offset || "0", 10) || 0);
  const anchor = utc(latestDate);
  if (kind === "week") {
    const currentStart = shiftDays(anchor, -anchor.getUTCDay());
    const start = shiftDays(currentStart, -offset * 7);
    const expectedEnd = shiftDays(start, 6);
    const end = offset === 0 && expectedEnd > anchor ? anchor : expectedEnd;
    return { kind, start: iso(start), end: iso(end), label: `${formatDate(iso(start), false)} – ${formatDate(iso(end))}`, offset };
  }
  if (kind === "quarter") {
    const currentQuarter = Math.floor(anchor.getUTCMonth() / 3);
    const shifted = new Date(Date.UTC(anchor.getUTCFullYear(), currentQuarter * 3 - offset * 3, 1, 12));
    const quarter = Math.floor(shifted.getUTCMonth() / 3);
    const start = new Date(Date.UTC(shifted.getUTCFullYear(), quarter * 3, 1, 12));
    const expectedEnd = new Date(Date.UTC(shifted.getUTCFullYear(), quarter * 3 + 3, 0, 12));
    const end = offset === 0 && expectedEnd > anchor ? anchor : expectedEnd;
    return { kind, start: iso(start), end: iso(end), label: `Q${quarter + 1} ${shifted.getUTCFullYear()}`, offset };
  }
  const shifted = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1, 12));
  const expectedEnd = monthEnd(shifted);
  return {
    kind,
    start: iso(monthStart(shifted)),
    end: iso(offset === 0 && expectedEnd > anchor ? anchor : expectedEnd),
    label: new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(shifted),
    offset,
  };
}

export function rangeContains(date: string, range: DashboardRange) {
  return date >= range.start && date <= range.end;
}

function cohortMonthWindow(range: DashboardRange, endOffset: number, months: number) {
  const selectedStart = utc(range.start);
  const end = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth() - endOffset, 1, 12));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1), 1, 12));
  return {
    start: iso(start).slice(0, 7),
    end: iso(end).slice(0, 7),
  };
}

export function retentionCohortWindow(range: DashboardRange, days: 30 | 60 | 90) {
  // AdminFlow compares six complete cohorts that have fully matured for the
  // selected retention horizon. For a July range, those windows end in May,
  // April, and March for 30-, 60-, and 90-day retention respectively.
  return cohortMonthWindow(range, (days / 30) + 1, 6);
}

export function retentionDisplayWindow(range: DashboardRange) {
  return cohortMonthWindow(range, 1, 12);
}
