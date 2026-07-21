import Link from "next/link";
import { CapacityChart, CashFlowChart, ExpenseChart, RevenueProfitChart, TherapistRevenueChart } from "@/components/portal/ttg/DashboardCharts";
import { getTtgDashboardData } from "@/lib/portal/ttg/dashboard";

const money = (value: number, digits = 1) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: digits }).format(value);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const delta = (current: number, prior: number) => (current - prior) / prior;

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "warning" }) {
  return <div className={`ttg-metric ttg-metric-${tone}`}><div className="ttg-metric-label">{label}</div><div className="ttg-metric-value">{value}</div><div className="ttg-metric-detail">{detail}</div></div>;
}

function Panel({ eyebrow, title, note, children, wide = false }: { eyebrow?: string; title: string; note: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`ttg-panel ${wide ? "ttg-panel-wide" : ""}`}>{eyebrow && <div className="ttg-eyebrow">{eyebrow}</div>}<div className="ttg-panel-heading"><h2>{title}</h2><p>{note}</p></div>{children}</section>;
}

export default async function TtgDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ view = "practice" }, data] = await Promise.all([searchParams, getTtgDashboardData()]);
  const activeView = ["practice", "capacity", "controls"].includes(view) ? view : "practice";
  const completeMonths = data.months.filter((month) => month.status === "Complete");
  const current = data.months.find((month) => month.period === data.reportingPeriod)!;
  const currentIndex = completeMonths.findIndex((month) => month.period === data.reportingPeriod);
  const prior = completeMonths[Math.max(currentIndex - 1, 0)];
  const periodName = data.reportingPeriod.replace(" 2026", "");
  const priorName = prior.period.replace(" 2026", "");
  const warnings = data.qualityChecks.filter((check) => check.status === "WARNING");

  return (
    <div className="ttg-dashboard-shell">
      <aside className="ttg-dashboard-nav" aria-label="Dashboard sections">
        <div><div className="ttg-nav-kicker">CEO dashboard</div><div className="ttg-nav-period">{data.reportingPeriod}</div></div>
        <nav>
          <Link className={activeView === "practice" ? "is-active" : ""} href="?view=practice"><span>01</span>Practice</Link>
          <Link className={activeView === "capacity" ? "is-active" : ""} href="?view=capacity"><span>02</span>Capacity</Link>
          <Link className={activeView === "controls" ? "is-active" : ""} href="?view=controls"><span>03</span>Controls</Link>
        </nav>
        <div className="ttg-nav-source"><span className={data.source.mode === "live" ? "is-live" : ""} />{data.source.label}<small>{data.source.mode === "live" ? "Read-only Google Sheet" : "Verified Jul 20, 2026"}</small></div>
      </aside>

      <div className="ttg-dashboard-main">
        <header className="ttg-dashboard-heading">
          <div><div className="ttg-eyebrow">{activeView === "practice" ? "Practice performance" : activeView === "capacity" ? "Clinical capacity" : "Financial controls"}</div><h1>{activeView === "practice" ? `A stronger ${periodName} close.` : activeView === "capacity" ? "Capacity is the operating opportunity." : `The ${periodName} close is reliable.`}</h1><p>{activeView === "practice" ? data.headline : activeView === "capacity" ? "Only 35.5% of scheduled clinical time was booked, leaving meaningful room to grow without adding practitioners." : `All ${data.summary.payoutsMatched} practitioner payouts matched. The remaining issues are classification and timing—not broken reconciliation.`}</p></div>
          <div className="ttg-period-control"><span>Reporting period</span><strong>{data.reportingPeriod}</strong><small>Latest aligned complete month</small></div>
        </header>

        {data.source.mode === "fixture" && <div className="ttg-prototype-banner"><strong>Prototype data</strong><span>This is the verified July 20 dataset. Connect the read-only Sheets service account to enable live refreshes.</span></div>}

        {activeView === "practice" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Gross revenue" value={money(current.grossRevenue)} detail={`vs ${money(prior.grossRevenue)} in ${priorName} · +${pct(delta(current.grossRevenue, prior.grossRevenue))}`} tone="positive" />
            <Metric label="Estimated operating profit" value={money(current.operatingProfit)} detail={`${pct(current.profitMargin)} margin · up ${money(current.operatingProfit - prior.operatingProfit)} from ${priorName}`} tone="positive" />
            <Metric label="Net cash flow" value={`${current.netCashFlow >= 0 ? "+" : ""}${money(current.netCashFlow)}`} detail={`recovered from ${money(prior.netCashFlow)} in ${priorName}`} tone="positive" />
          </div>
          <div className="ttg-dashboard-grid">
            <Panel eyebrow="Financial movement" title="Revenue held steady; profit expanded." note="Complete months only · CAD · estimated profit uses collected revenue less classified operating expenses"><RevenueProfitChart months={data.months} /></Panel>
            <Panel eyebrow="Cash movement" title="Cash generation returned positive." note="External cash only · July is shown as partial through Jul 17"><CashFlowChart months={data.months} /></Panel>
          </div>
          <Panel eyebrow="Operating pulse" title="The practice is collecting well, with capacity still open." note="A compact read on the levers behind June's result" wide>
            <div className="ttg-pulse-grid">
              <Metric label="Collection rate" value={pct(current.collectionRate)} detail={`up from ${pct(prior.collectionRate)} in ${priorName}`} tone="positive" />
              <Metric label="Marketing / revenue" value={pct(current.marketingRatio)} detail={`${money(current.marketingSpend)} invested`} />
              <Metric label="Active therapists" value={String(data.summary.activeTherapists)} detail={`${money(data.summary.revenuePerTherapist)} average revenue`} />
              <Metric label="Team revenue share" value={pct(1 - data.summary.ownerRevenueShare)} detail={`${money(data.summary.revenueWithoutOwner)} without owner clinical hours`} />
            </div>
          </Panel>
        </>}

        {activeView === "capacity" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Weighted utilization" value={pct(data.summary.weightedUtilization)} detail="64.5% of scheduled clinical time remained open" tone="warning" />
            <Metric label="Booked clinical hours" value={data.summary.bookedHours.toFixed(1)} detail={`${data.summary.availableHours.toFixed(1)} available clinical hours`} />
            <Metric label="Revenue per therapist" value={money(data.summary.revenuePerTherapist)} detail={`${data.summary.activeTherapists} active revenue-generating therapists`} />
          </div>
          <div className="ttg-dashboard-grid ttg-dashboard-grid-capacity">
            <Panel eyebrow="Capacity by practitioner" title="Available hours are widespread." note="Sorted by available hours · teal is booked time; stone is open scheduled time"><CapacityChart therapists={data.therapists} /></Panel>
            <Panel eyebrow="Revenue contribution" title="Revenue is distributed across the team." note={`June gross revenue · average per therapist ${money(data.summary.revenuePerTherapist)}`}><TherapistRevenueChart therapists={data.therapists} /></Panel>
          </div>
          <div className="ttg-owner-strip"><div><span>Owner contribution</span><strong>{pct(data.summary.ownerRevenueShare)}</strong><small>{money(current.grossRevenue * data.summary.ownerRevenueShare)}</small></div><div className="ttg-owner-bar"><span style={{ width: `${data.summary.ownerRevenueShare * 100}%` }} /><i /></div><div><span>Team contribution</span><strong>{pct(1 - data.summary.ownerRevenueShare)}</strong><small>{money(data.summary.revenueWithoutOwner)}</small></div></div>
        </>}

        {activeView === "controls" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Payout reconciliation" value={pct(data.summary.payoutReconciliation)} detail={`${data.summary.payoutsMatched} of ${data.summary.payoutsMatched} payouts · ${money(data.summary.payoutValue)} matched`} tone="positive" />
            <Metric label="Collection rate" value={pct(current.collectionRate)} detail={`${money(current.collectedRevenue)} collected · ${money(data.summary.outstandingBalance)} outstanding`} tone="positive" />
            <Metric label="Uncategorized expenses" value={money(current.uncategorizedExpenses)} detail={`${pct(current.uncategorizedExpenses / current.operatingExpenses)} of operating expenses`} tone="warning" />
          </div>
          <div className="ttg-dashboard-grid">
            <Panel eyebrow="Expense composition" title="Payroll is the dominant operating cost." note={`${money(current.operatingExpenses)} total operating expenses · ${periodName} complete month`}><ExpenseChart expenses={data.expenses} /></Panel>
            <Panel eyebrow="Close checklist" title="Six checks pass; two need context." note="Checks reconcile the reporting workbook to Jane and supplied bank exports">
              <div className="ttg-quality-list">{data.qualityChecks.map((check) => <div className="ttg-quality-row" key={check.check}><span className={check.status === "PASS" ? "is-pass" : "is-warning"}>{check.status === "PASS" ? "Pass" : "Review"}</span><div><strong>{check.check}</strong><p>{check.notes}</p></div></div>)}</div>
            </Panel>
          </div>
          <div className="ttg-caveat"><strong>{warnings.length} items to carry into the next refresh</strong><p>Live Jane controls where AdminFlow differs by $175. July remains directional because bank records end July 17 while Jane was observed July 20. Current bank balance is not available from transaction-only exports.</p></div>
        </>}

        <footer className="ttg-dashboard-footer"><span>No client names or PHI included.</span><span>Jane + supplied corporate-bank CSVs</span><span>{data.source.mode === "live" ? `Refreshed ${new Date(data.source.refreshedAt).toLocaleString("en-CA")}` : "Verified July 20, 2026"}</span></footer>
      </div>
    </div>
  );
}
