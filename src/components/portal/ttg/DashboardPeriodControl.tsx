"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DashboardRange } from "@/lib/portal/ttg/dashboard-period";

export function DashboardPeriodControl({ range, latestDate }: { range: DashboardRange; latestDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(range.start);
  const [to, setTo] = useState(range.end);
  const [open, setOpen] = useState(false);

  const update = (values: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };
  const choosePeriod = (period: "week" | "month" | "quarter") => update({ period, offset: "0", from: undefined, to: undefined });
  const move = (change: number) => update({ offset: String(Math.max(0, range.offset + change)), from: undefined, to: undefined, period: range.kind === "custom" ? "month" : range.kind });
  const applyCustom = () => {
    if (!from || !to || from > to) return;
    update({ from, to, period: undefined, offset: undefined });
    setOpen(false);
  };
  const toggleCustom = () => {
    if (!open) {
      setFrom(range.start);
      setTo(range.end);
    }
    setOpen((value) => !value);
  };

  return (
    <div className="ttg-global-period">
      <div className="ttg-period-presets" aria-label="Reporting period">
        {(["week", "month", "quarter"] as const).map((period) => <button className={range.kind === period ? "is-active" : ""} key={period} onClick={() => choosePeriod(period)} type="button">{period[0].toUpperCase() + period.slice(1)}</button>)}
      </div>
      <div className="ttg-period-navigation">
        <button aria-label="Previous period" onClick={() => move(1)} type="button">‹</button>
        <button className="ttg-period-label" aria-expanded={open} onClick={toggleCustom} type="button"><span>{range.kind === "custom" ? "Custom range" : "Reporting period"}</span><strong>{range.label}</strong></button>
        <button aria-label="Next period" disabled={range.offset === 0 || range.kind === "custom"} onClick={() => move(-1)} type="button">›</button>
      </div>
      {open && <div className="ttg-date-popover">
        <label><span>Start date</span><input max={latestDate} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>End date</span><input max={latestDate} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <div><button onClick={() => setOpen(false)} type="button">Cancel</button><button disabled={!from || !to || from > to} onClick={applyCustom} type="button">Apply range</button></div>
      </div>}
    </div>
  );
}
