import Link from "next/link";
import { CapacityChart, CashFlowChart, ExpenseChart, RevenueProfitChart, TherapistRevenueChart } from "@/components/portal/ttg/DashboardCharts";
import { getTtgDashboardData } from "@/lib/portal/ttg/dashboard";
import { dashboardVisualIndex, formatDataThrough, gabbyMetricCoverage, getDashboardCopy } from "@/lib/portal/ttg/dashboard-copy";

const money = (value: number, digits = 1) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: digits }).format(value);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const delta = (current: number, prior: number) => prior === 0 ? 0 : (current - prior) / Math.abs(prior);

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "warning" }) {
  return <div className={`ttg-metric ttg-metric-${tone}`}><div className="ttg-metric-label">{label}</div><div className="ttg-metric-value">{value}</div><div className="ttg-metric-detail">{detail}</div></div>;
}

function Panel({ eyebrow, title, note, children, wide = false }: { eyebrow?: string; title: string; note: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`ttg-panel ${wide ? "ttg-panel-wide" : ""}`}>{eyebrow && <div className="ttg-eyebrow">{eyebrow}</div>}<div className="ttg-panel-heading"><h2>{title}</h2><p>{note}</p></div>{children}</section>;
}

export default async function TtgDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [{ view = "practice" }, data] = await Promise.all([searchParams, getTtgDashboardData()]);
  const activeView = ["practice", "capacity", "controls", "index"].includes(view) ? view : "practice";
  const copy = getDashboardCopy(data);
  const { current, prior, period: periodName, priorPeriod: priorName, warnings } = copy;
  const currentChange = delta(current.grossRevenue, prior.grossRevenue);
  const collectionImproved = current.collectionRate >= prior.collectionRate;
  const topExpense = [...data.expenses].sort((a, b) => b.amount - a.amount)[0];
  const verifiedAt = new Date(data.source.refreshedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const heading = activeView === "practice"
    ? { eyebrow: "Practice performance", ...copy.practice }
    : activeView === "capacity"
      ? { eyebrow: "Clinical capacity", ...copy.capacity }
      : activeView === "controls"
        ? { eyebrow: "Financial controls", ...copy.controls }
        : { eyebrow: "Metric and source index", title: "Every number has a visible lineage.", intro: "This index shows what is currently displayed, how each visualization is calculated, and which of Gabby's requested metrics still need another source." };

  return (
    <div className="ttg-dashboard-shell">
      <aside className="ttg-dashboard-nav" aria-label="Dashboard sections">
        <div><div className="ttg-nav-kicker">CEO dashboard</div><div className="ttg-nav-period">{data.reportingPeriod}</div></div>
        <nav>
          <Link className={activeView === "practice" ? "is-active" : ""} href="?view=practice"><span>01</span>Practice</Link>
          <Link className={activeView === "capacity" ? "is-active" : ""} href="?view=capacity"><span>02</span>Capacity</Link>
          <Link className={activeView === "controls" ? "is-active" : ""} href="?view=controls"><span>03</span>Controls</Link>
          <Link className={activeView === "index" ? "is-active" : ""} href="?view=index"><span>04</span>Data index</Link>
        </nav>
        <div className="ttg-nav-source"><span className={data.source.mode === "live" ? "is-live" : ""} />{data.source.label}<small>{data.source.mode === "live" ? "Read-only Google Sheet" : `Verified ${verifiedAt}`}</small></div>
      </aside>

      <div className="ttg-dashboard-main">
        <header className="ttg-dashboard-heading">
          <div><div className="ttg-eyebrow">{heading.eyebrow}</div><h1>{heading.title}</h1><p>{heading.intro}</p></div>
          <div className="ttg-period-control"><span>Reporting period</span><strong>{data.reportingPeriod}</strong><small>Latest aligned complete month</small></div>
        </header>

        {data.source.mode === "fixture" && <div className="ttg-prototype-banner"><strong>Prototype data</strong><span>This fixture was verified {verifiedAt}. Connect the read-only Sheets service account to enable live refreshes.</span></div>}

        {activeView === "practice" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Gross revenue" value={money(current.grossRevenue)} detail={copy.hasPrior ? `vs ${money(prior.grossRevenue)} in ${priorName} · ${currentChange >= 0 ? "+" : ""}${pct(currentChange)}` : "First complete reporting period"} tone={currentChange >= 0 ? "positive" : "warning"} />
            <Metric label="Estimated operating profit" value={money(current.operatingProfit)} detail={copy.hasPrior ? `${pct(current.profitMargin)} margin · ${current.operatingProfit >= prior.operatingProfit ? "up" : "down"} ${money(Math.abs(current.operatingProfit - prior.operatingProfit))} from ${priorName}` : `${pct(current.profitMargin)} estimated margin`} tone={current.operatingProfit >= prior.operatingProfit ? "positive" : "warning"} />
            <Metric label="Net cash flow" value={`${current.netCashFlow >= 0 ? "+" : ""}${money(current.netCashFlow)}`} detail={copy.hasPrior ? `${current.netCashFlow >= prior.netCashFlow ? "improved" : "declined"} from ${money(prior.netCashFlow)} in ${priorName}` : "First complete reporting period"} tone={current.netCashFlow >= 0 ? "positive" : "warning"} />
          </div>
          <div className="ttg-dashboard-grid">
            <Panel eyebrow="Financial movement" title={current.operatingProfit >= prior.operatingProfit ? "Estimated profit improved versus the prior complete month." : "Estimated profit declined versus the prior complete month."} note="Complete months only · CAD · estimated profit uses collected revenue less classified operating expenses"><RevenueProfitChart months={data.months} /></Panel>
            <Panel eyebrow="Cash movement" title={current.netCashFlow >= 0 ? "The latest complete month generated positive cash flow." : "The latest complete month used cash."} note={`External cash only · ${copy.partialNote}`}><CashFlowChart months={data.months} /></Panel>
          </div>
          <Panel eyebrow="Operating pulse" title={current.collectionRate >= 0.95 ? data.summary.weightedUtilization < 0.75 ? "Collections are strong, with clinical capacity still open." : "Collections are strong and capacity is tightening." : "Collections and clinical capacity both merit attention."} note={`Key operating levers behind ${periodName}'s result`} wide>
            <div className="ttg-pulse-grid">
              <Metric label="Collection rate" value={pct(current.collectionRate)} detail={copy.hasPrior ? `${collectionImproved ? "up" : "down"} from ${pct(prior.collectionRate)} in ${priorName}` : "First complete reporting period"} tone={current.collectionRate >= 0.95 ? "positive" : "warning"} />
              <Metric label="Marketing / revenue" value={pct(current.marketingRatio)} detail={`${money(current.marketingSpend)} invested`} />
              <Metric label="Active therapists" value={String(data.summary.activeTherapists)} detail={`${money(data.summary.revenuePerTherapist)} average revenue`} />
              <Metric label="Team revenue share" value={pct(1 - data.summary.ownerRevenueShare)} detail={`${money(data.summary.revenueWithoutOwner)} without owner clinical hours`} />
            </div>
          </Panel>
        </>}

        {activeView === "capacity" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Weighted utilization" value={pct(data.summary.weightedUtilization)} detail={`${pct(Math.max(0, 1 - data.summary.weightedUtilization))} of scheduled clinical time remained open`} tone={data.summary.weightedUtilization < 0.5 ? "warning" : "default"} />
            <Metric label="Booked clinical hours" value={data.summary.bookedHours.toFixed(1)} detail={`${data.summary.availableHours.toFixed(1)} available clinical hours`} />
            <Metric label="Revenue per therapist" value={money(data.summary.revenuePerTherapist)} detail={`${data.summary.activeTherapists} active revenue-generating therapists`} />
          </div>
          <div className="ttg-dashboard-grid ttg-dashboard-grid-capacity">
            <Panel eyebrow="Capacity by practitioner" title={data.summary.weightedUtilization < 0.5 ? "Open clinical hours are widespread." : data.summary.weightedUtilization < 0.75 ? "Capacity varies across practitioners." : "Most scheduled capacity is now booked."} note="Sorted by available hours · teal is booked time; stone is open scheduled time"><CapacityChart therapists={data.therapists} /></Panel>
            <Panel eyebrow="Revenue contribution" title="Revenue contribution across the active team." note={`${periodName} gross revenue · average per therapist ${money(data.summary.revenuePerTherapist)}`}><TherapistRevenueChart therapists={data.therapists} /></Panel>
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
            <Panel eyebrow="Expense composition" title={topExpense ? `${topExpense.category} is the largest operating cost.` : "Operating expense composition"} note={`${money(current.operatingExpenses)} total operating expenses · ${periodName} complete month`}><ExpenseChart expenses={data.expenses} /></Panel>
            <Panel eyebrow="Close checklist" title={`${copy.passes} checks pass; ${warnings.length} ${warnings.length === 1 ? "needs" : "need"} review.`} note="Checks reconcile the reporting workbook to Jane and supplied bank exports">
              <div className="ttg-quality-list">{data.qualityChecks.map((check) => <div className="ttg-quality-row" key={check.check}><span className={check.status === "PASS" ? "is-pass" : "is-warning"}>{check.status === "PASS" ? "Pass" : "Review"}</span><div><strong>{check.check}</strong><p>{check.notes}</p></div></div>)}</div>
            </Panel>
          </div>
          <div className="ttg-caveat"><strong>{warnings.length} {warnings.length === 1 ? "item" : "items"} to carry into the next refresh</strong><p>{warnings.length ? warnings.map((warning) => warning.notes).filter(Boolean).join(" ") : "No review items are open for this reporting period."} Current bank balance remains unavailable from transaction-only exports.</p></div>
        </>}

        {activeView === "index" && <>
          <div className="ttg-index-summary">
            <div><span>Source mode</span><strong>{data.source.mode === "live" ? "Live, read-only" : "Verified fixture"}</strong><small>{data.source.label}</small></div>
            <div><span>Reporting period</span><strong>{data.reportingPeriod}</strong><small>Data through {formatDataThrough(current.dataThrough)}</small></div>
            <div><span>Source tables</span><strong>4 normalized tabs</strong><small>Monthly · therapists · expenses · checks</small></div>
          </div>

          <Panel eyebrow="Visualization lineage" title="What powers each dashboard view" note="Fixed definitions; values refresh from the workbook" wide>
            <div className="ttg-lineage-list">
              {dashboardVisualIndex.map((item) => <div className="ttg-lineage-row" key={item.visual}><strong>{item.visual}</strong><span>{item.source}</span><p>{item.fields}</p><p>{item.calculation}</p></div>)}
            </div>
          </Panel>

          <section className="ttg-coverage-section">
            <div className="ttg-coverage-heading"><div><div className="ttg-eyebrow">Original request coverage</div><h2>Gabby’s full metric list</h2></div><div className="ttg-status-legend"><span className="is-shown">Shown</span><span className="is-available">Available</span><span className="is-partial">Partial</span><span className="is-not-available">Needs source</span></div></div>
            {gabbyMetricCoverage.map((group) => <div className="ttg-coverage-group" key={group.group}><h3>{group.group}</h3><div className="ttg-coverage-table">{group.items.map((item) => <div className="ttg-coverage-row" key={item.metric}><strong>{item.metric}</strong><span className={`is-${item.status}`}>{item.status === "not-available" ? "Needs source" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span><p>{item.source}</p><p>{item.use}</p></div>)}</div></div>)}
            <div className="ttg-caveat"><strong>Date-range filtering</strong><p>The original request also asked for week, month, and quarter selection. The current prototype is fixed to the latest aligned complete month with prior-period context; interactive date-range filtering is not yet implemented.</p></div>
          </section>
        </>}

        <footer className="ttg-dashboard-footer"><span>No client names or PHI included.</span><span>Jane + supplied corporate-bank CSVs</span><span>{data.source.mode === "live" ? `Refreshed ${new Date(data.source.refreshedAt).toLocaleString("en-CA")}` : `Verified ${verifiedAt}`}</span></footer>
      </div>
    </div>
  );
}
