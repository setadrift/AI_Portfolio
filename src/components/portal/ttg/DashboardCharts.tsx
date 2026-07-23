import type { ExpenseMetric, MonthlyMetric, TherapistMetric } from "@/lib/portal/ttg/dashboard";
import { periodLabel } from "@/lib/portal/ttg/dashboard-copy";

const currency = (value: number, compact = true) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function RevenueProfitChart({ months }: { months: MonthlyMetric[] }) {
  const complete = months.filter((month) => month.status === "Complete").slice(-6);
  const max = Math.max(...complete.map((month) => month.grossRevenue), 1);
  return (
    <div className="ttg-chart" role="img" aria-label={complete.map((m) => `${m.period}: ${currency(m.grossRevenue, false)} gross revenue and ${currency(m.operatingProfit, false)} estimated operating profit`).join(". ")}>
      <div className="ttg-chart-legend"><span className="ttg-key ttg-key-revenue" />Gross revenue <span className="ttg-key ttg-key-profit" />Estimated profit</div>
      <div className="ttg-column-chart">
        {complete.map((month) => (
          <div className="ttg-column-group" key={month.period}>
            <div className="ttg-column-value">{currency(month.grossRevenue)}</div>
            <div className="ttg-columns">
              <div className="ttg-column ttg-column-revenue" style={{ height: `${(month.grossRevenue / max) * 164}px` }} />
              <div className="ttg-column ttg-column-profit" style={{ height: `${Math.max((month.operatingProfit / max) * 164, 8)}px` }} />
            </div>
            <div className="ttg-column-label">{periodLabel(month.period)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashFlowChart({ months }: { months: MonthlyMetric[] }) {
  const cash = months.slice(-6).map((month) => ({ period: periodLabel(month.period).replace(" MTD", ""), value: month.netCashFlow, status: month.status }));
  const max = Math.max(...cash.map((month) => Math.abs(month.value)), 1);
  return (
    <div className="ttg-cash-chart" style={{ gridTemplateColumns: `repeat(${Math.max(cash.length, 1)}, 1fr)` }} role="img" aria-label={cash.map((m) => `${m.period}: ${currency(m.value, false)} net cash flow${m.status === "Partial" ? ", partial" : ""}`).join(". ")}>
      <div className="ttg-cash-zero" />
      {cash.map((month) => {
        const height = Math.max((Math.abs(month.value) / max) * 82, 8);
        return (
          <div className="ttg-cash-period" key={month.period}>
            <span className={`ttg-cash-value ${month.value < 0 ? "is-negative" : ""}`}>{month.value > 0 ? "+" : ""}{currency(month.value)}</span>
            <div className="ttg-cash-space">
              <div className={`ttg-cash-bar ${month.value < 0 ? "is-negative" : ""} ${month.status === "Partial" ? "is-partial" : ""}`} style={{ height: `${height}px` }} />
            </div>
            <span className="ttg-cash-label">{month.period}{month.status === "Partial" && <small>MTD</small>}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TherapistRevenueChart({ therapists }: { therapists: TherapistMetric[] }) {
  const sorted = [...therapists].sort((a, b) => b.revenue - a.revenue);
  const max = sorted[0]?.revenue ?? 1;
  return (
    <div className="ttg-ranked-bars" role="img" aria-label={sorted.map((item) => `${item.name}: ${currency(item.revenue, false)} gross revenue`).join(". ")}>
      {sorted.map((item) => (
        <div className="ttg-ranked-row" key={item.name}>
          <div className="ttg-ranked-name">{item.name}{item.owner && <span>Owner</span>}</div>
          <div className="ttg-ranked-track"><div className={`ttg-ranked-fill ${item.owner ? "is-owner" : ""}`} style={{ width: `${(item.revenue / max) * 100}%` }} /></div>
          <div className="ttg-ranked-value">{currency(item.revenue)}</div>
        </div>
      ))}
    </div>
  );
}

export function CapacityChart({ therapists }: { therapists: TherapistMetric[] }) {
  const sorted = [...therapists].sort((a, b) => b.availableHours - a.availableHours);
  return (
    <div className="ttg-capacity-bars" role="img" aria-label={sorted.map((item) => `${item.name}: ${item.bookedHours.toFixed(1)} booked hours, ${item.availableHours.toFixed(1)} available hours, ${percent(item.utilization)} utilization`).join(". ")}>
      {sorted.map((item) => (
        <div className="ttg-capacity-row" key={item.name}>
          <div className="ttg-ranked-name">{item.name}{item.owner && <span>Owner</span>}</div>
          <div className="ttg-capacity-track">
            <div className="ttg-capacity-booked" style={{ width: `${item.utilization * 100}%` }} />
            <div className="ttg-capacity-open" style={{ width: `${(1 - item.utilization) * 100}%` }} />
          </div>
          <div className="ttg-ranked-value">{percent(item.utilization)}</div>
        </div>
      ))}
    </div>
  );
}

export function ExpenseChart({ expenses }: { expenses: ExpenseMetric[] }) {
  const primary = expenses.slice(0, 7);
  const max = primary[0]?.amount ?? 1;
  return (
    <div className="ttg-expense-bars" role="img" aria-label={primary.map((item) => `${item.category}: ${currency(item.amount, false)}, ${percent(item.share)} of expenses`).join(". ")}>
      {primary.map((item) => (
        <div className="ttg-expense-row" key={item.category}>
          <div className="ttg-expense-label"><span>{item.category}</span><span>{currency(item.amount)} · {percent(item.share)}</span></div>
          <div className="ttg-expense-track"><div className={`ttg-expense-fill ${item.category === "Uncategorized" ? "is-warning" : ""}`} style={{ width: `${(item.amount / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
