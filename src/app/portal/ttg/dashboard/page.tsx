import Link from "next/link";
import { CapacityChart, CashFlowChart, ExpenseChart, RevenueProfitChart, TherapistRevenueChart } from "@/components/portal/ttg/DashboardCharts";
import { AdminFlowView } from "@/components/portal/ttg/AdminFlowViews";
import { DashboardPeriodControl } from "@/components/portal/ttg/DashboardPeriodControl";
import { getTtgDashboardData } from "@/lib/portal/ttg/dashboard";
import { dashboardVisualIndex, formatDataThrough, gabbyMetricCoverage, getDashboardCopy, getOwnerActions, getSourceHealth } from "@/lib/portal/ttg/dashboard-copy";
import { resolveDashboardRange } from "@/lib/portal/ttg/dashboard-period";

const money = (value: number, digits = 1) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: digits }).format(value);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const delta = (current: number, prior: number) => prior === 0 ? 0 : (current - prior) / Math.abs(prior);
const periodKey = (period: string) => {
  const match = period.match(/(20\d{2})-(0[1-9]|1[0-2])/);
  if (match) return `${match[1]}-${match[2]}`;
  const parsed = new Date(period.replace(/\bMTD\b/i, "").trim());
  return Number.isNaN(parsed.getTime()) ? period : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
};

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "positive" | "warning" }) {
  return <div className={`ttg-metric ttg-metric-${tone}`}><div className="ttg-metric-label">{label}</div><div className="ttg-metric-value">{value}</div><div className="ttg-metric-detail">{detail}</div></div>;
}

function Panel({ eyebrow, title, note, children, wide = false }: { eyebrow?: string; title: string; note: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`ttg-panel ${wide ? "ttg-panel-wide" : ""}`}>{eyebrow && <div className="ttg-eyebrow">{eyebrow}</div>}<div className="ttg-panel-heading"><h2>{title}</h2><p>{note}</p></div>{children}</section>;
}

export default async function TtgDashboardPage({ searchParams }: { searchParams: Promise<{ view?: string; period?: string; offset?: string; from?: string; to?: string; tab?: string; banks?: string }> }) {
  const [params, data] = await Promise.all([searchParams, getTtgDashboardData()]);
  const { view = "overview", period, offset, from, to, tab = "overview", banks } = params;
  const activeView = ["overview", "financial", "appointments", "team", "retention", "funnel", "imports", "data", "practice", "capacity", "controls", "index"].includes(view) ? view : "overview";
  const latestJaneDate = /^\d{4}-\d{2}-\d{2}$/.test(data.source.janeDataThrough)
    ? data.source.janeDataThrough
    : data.analyticsRows.map((row) => row.date).sort().at(-1) ?? new Date().toISOString().slice(0, 10);
  const range = resolveDashboardRange({ period, offset, from, to }, latestJaneDate);
  const selectedMonth = data.months.find((month) => periodKey(month.period) === range.start.slice(0, 7));
  const copy = getDashboardCopy(data, selectedMonth?.period);
  const { current, prior, priorPeriod: priorName, warnings, failures } = copy;
  const operatingMonth = data.months.find((month) => month.period === data.clinicalPeriod) ?? current;
  const sourceHealth = getSourceHealth(data);
  const ownerActions = getOwnerActions(data);
  const currentChange = delta(current.grossRevenue, prior.grossRevenue);
  const operatingPrior = data.months[Math.max(0, data.months.indexOf(operatingMonth) - 1)] ?? operatingMonth;
  const collectionImproved = operatingMonth.collectionRate >= operatingPrior.collectionRate;
  const topExpense = [...data.expenses].sort((a, b) => b.amount - a.amount)[0];
  const refreshedAt = formatDataThrough(data.source.refreshedAt.slice(0, 10));
  const commissionRate = operatingMonth.grossRevenue ? data.summary.contractorCommissions / operatingMonth.grossRevenue : 0;
  const adminHeadings: Record<string, { eyebrow: string; title: string; intro: string }> = {
    overview: { eyebrow: "Analytics", title: "Overview", intro: "The current operating picture across revenue, appointments, patients, and the team." },
    financial: { eyebrow: "Analytics", title: "Financial", intro: "Sales, collections, services, receivables, and cash flow from the available reporting sources." },
    appointments: { eyebrow: "Analytics", title: "Appointments", intro: "Volume, attendance, missed-visit impact, booking sources, and scheduling patterns." },
    team: { eyebrow: "Analytics", title: "Team performance", intro: "Practitioner revenue, workload, attendance, compensation, and patient mix." },
    retention: { eyebrow: "Analytics", title: "Patient retention", intro: "Patient activity and 30, 60, and 90-day return behaviour when sufficient history is available." },
    funnel: { eyebrow: "Analytics", title: "Patient funnel", intro: "Consultations, first visits, ongoing care, and practitioner-level conversion flow." },
    imports: { eyebrow: "Data", title: "Data imports", intro: "Coverage, validation, refresh history, and the guided Jane and bank workflow." },
    data: { eyebrow: "Data", title: "My data", intro: "A transparent table view of the safe aggregate Google Sheets that power this dashboard." },
  };
  const heading = adminHeadings[activeView] ?? (activeView === "practice"
    ? { eyebrow: "Practice performance", ...copy.practice }
    : activeView === "capacity"
      ? { eyebrow: "Clinical capacity", ...copy.capacity }
      : activeView === "controls"
        ? { eyebrow: "Financial controls", ...copy.controls }
        : { eyebrow: "Metric and source index", title: "Every number has a visible lineage.", intro: "This index shows what is currently displayed, how each visualization is calculated, and which of Gabby's requested metrics still need another source." });
  const periodParams = from && to ? { from, to } : { period: range.kind === "custom" ? "month" : range.kind, offset: String(range.offset) };
  const href = (nextView: string, nextTab?: string, extra?: Record<string, string>) => {
    const query = new URLSearchParams();
    query.set("view", nextView);
    Object.entries(periodParams).forEach(([key, value]) => value && query.set(key, value));
    if (nextTab) query.set("tab", nextTab);
    if (banks === "1") query.set("banks", "1");
    Object.entries(extra ?? {}).forEach(([key, value]) => query.set(key, value));
    return `?${query.toString()}`;
  };
  const analyticsView = ["overview", "financial", "appointments", "team", "retention", "funnel"].includes(activeView);
  const showBank = banks === "1" && !analyticsView;

  return (
    <div className="ttg-dashboard-shell">
      <aside className="ttg-dashboard-nav" aria-label="Dashboard sections">
        <div><div className="ttg-nav-kicker">CEO dashboard</div><div className="ttg-nav-period">{range.label}</div></div>
        <nav>
          <small>Analytics</small>
          <Link className={activeView === "overview" ? "is-active" : ""} href={href("overview")}>Overview</Link>
          <Link className={activeView === "financial" ? "is-active" : ""} href={href("financial")}>Financial</Link>
          <Link className={activeView === "appointments" ? "is-active" : ""} href={href("appointments")}>Appointments</Link>
          <Link className={activeView === "team" ? "is-active" : ""} href={href("team")}>Team performance</Link>
          <Link className={activeView === "retention" ? "is-active" : ""} href={href("retention")}>Patient retention</Link>
          <Link className={activeView === "funnel" ? "is-active" : ""} href={href("funnel")}>Patient funnel</Link>
          <small>Workspace</small>
          <Link className={["practice", "capacity", "controls", "index"].includes(activeView) ? "is-active" : ""} href={href("practice")}>Gabby’s dashboard</Link>
          <Link className={activeView === "imports" ? "is-active" : ""} href={href("imports")}>Data imports</Link>
          <Link className={activeView === "data" ? "is-active" : ""} href={href("data")}>My data</Link>
        </nav>
        <div className="ttg-nav-source"><span className={`is-${sourceHealth.tone}`} />{data.source.label}<small>Workbook updated {refreshedAt}</small></div>
      </aside>

      <div className="ttg-dashboard-main">
        <header className="ttg-dashboard-heading">
          <div><div className="ttg-eyebrow">{heading.eyebrow}</div><h1>{heading.title}</h1><p>{heading.intro}</p></div>
          <DashboardPeriodControl range={range} latestDate={latestJaneDate} />
        </header>

        <section className={`ttg-freshness-strip ${showBank ? "" : "is-jane-only"} is-${sourceHealth.tone}`} aria-label="Reporting source freshness">
          <div><span>Source status</span><strong>{sourceHealth.label}</strong><small>{sourceHealth.gapDays > 0 ? `${sourceHealth.gapDays}-day cutoff difference` : "Jane and bank cutoffs align"}</small></div>
          <div><span>Jane</span><strong>Through {formatDataThrough(data.source.janeDataThrough)}</strong><small>Clinical and revenue reporting</small></div>
          {showBank && <div><span>Bank</span><strong>Through {formatDataThrough(data.source.bankDataThrough)}</strong><small>{data.source.bankRows ? `${data.source.bankRows} transaction rows` : "Corporate transaction exports"}</small></div>}
          {!showBank && <div><span>Selected range</span><strong>{range.label}</strong><small>All analytics views use this period</small></div>}
          <div><span>Workbook</span><strong>Updated {refreshedAt}</strong><small>{data.source.refreshedBy ? `By ${data.source.refreshedBy}` : "Refresh owner not recorded"}</small></div>
        </section>

        {data.source.mode === "fixture" && <div className="ttg-prototype-banner"><strong>Prototype data</strong><span>This fixture represents the workbook as updated {refreshedAt}. It is not a live Jane or bank connection.</span></div>}

        {["overview", "financial", "appointments", "team", "retention", "funnel", "imports", "data"].includes(activeView) && <AdminFlowView data={data} view={activeView} tab={tab} range={range} />}

        {["practice", "capacity", "controls", "index"].includes(activeView) && <nav className="ttg-af-tabs" aria-label="Gabby's dashboard sections"><Link className={activeView === "practice" ? "is-active" : ""} href={href("practice")}>Practice</Link><Link className={activeView === "capacity" ? "is-active" : ""} href={href("capacity")}>Capacity</Link><Link className={activeView === "controls" ? "is-active" : ""} href={href("controls")}>Controls</Link><Link className={activeView === "index" ? "is-active" : ""} href={href("index")}>Data index</Link></nav>}

        {activeView === "practice" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Gross revenue" value={money(current.grossRevenue)} detail={copy.hasComparablePrior ? `vs ${money(prior.grossRevenue)} in ${priorName} · ${currentChange >= 0 ? "+" : ""}${pct(currentChange)}` : current.status === "Partial" ? `MTD through ${formatDataThrough(current.dataThrough)} · no full-month comparison` : "First complete reporting period"} tone={current.status === "Partial" ? "default" : currentChange >= 0 ? "positive" : "warning"} />
            <Metric label="Estimated operating profit" value={money(current.operatingProfit)} detail={copy.hasComparablePrior ? `${pct(current.profitMargin)} margin · ${current.operatingProfit >= prior.operatingProfit ? "up" : "down"} ${money(Math.abs(current.operatingProfit - prior.operatingProfit))} from ${priorName}` : current.status === "Partial" ? "Directional until the month closes and source dates align" : `${pct(current.profitMargin)} estimated margin`} tone={current.status === "Partial" ? "warning" : current.operatingProfit >= prior.operatingProfit ? "positive" : "warning"} />
            <Metric label="Net cash flow" value={`${current.netCashFlow >= 0 ? "+" : ""}${money(current.netCashFlow)}`} detail={copy.hasComparablePrior ? `${current.netCashFlow >= prior.netCashFlow ? "improved" : "declined"} from ${money(prior.netCashFlow)} in ${priorName}` : current.status === "Partial" ? "External cash movement through the bank cutoff" : "First complete reporting period"} tone={current.status === "Partial" ? "warning" : current.netCashFlow >= 0 ? "positive" : "warning"} />
          </div>
          <section className="ttg-owner-review" aria-labelledby="owner-review-title">
            <div className="ttg-owner-review-heading"><div><div className="ttg-eyebrow">Weekly owner review</div><h2 id="owner-review-title">What needs attention now</h2></div><p>Generated from source freshness, close controls, classification gaps, and scheduled capacity.</p></div>
            <div className="ttg-owner-actions">{ownerActions.map((action) => <div className={`ttg-owner-action is-${action.tone}`} key={action.title}><span>{action.tone === "critical" ? "Blocker" : action.tone === "attention" ? "Review" : action.tone === "opportunity" ? "Opportunity" : "Clear"}</span><div><strong>{action.title}</strong><p>{action.detail}</p></div></div>)}</div>
          </section>
          <div className="ttg-dashboard-grid">
            <Panel eyebrow="Financial movement" title={current.status === "Partial" ? "Complete-month performance remains the comparison anchor." : current.operatingProfit >= prior.operatingProfit ? "Estimated profit improved versus the prior complete month." : "Estimated profit declined versus the prior complete month."} note="Complete months only · CAD · estimated profit uses collected revenue less classified operating expenses"><RevenueProfitChart months={data.months} /></Panel>
            <Panel eyebrow="Cash movement" title={current.status === "Partial" ? "Month-to-date cash remains directional until the sources align." : current.netCashFlow >= 0 ? "The latest complete month generated positive cash flow." : "The latest complete month used cash."} note={`External cash only · ${copy.partialNote}`}><CashFlowChart months={data.months} /></Panel>
          </div>
          <Panel eyebrow="Current reporting-period operating pulse" title={operatingMonth.collectionRate >= 0.95 ? data.summary.weightedUtilization < 0.75 ? "Collections are strong, with clinical capacity still open." : "Collections are strong and capacity is tightening." : "Collections and clinical capacity both merit attention."} note={`Clinical and therapist detail currently reflects ${operatingMonth.period}`} wide>
            <div className="ttg-pulse-grid">
              <Metric label="Collection rate" value={pct(operatingMonth.collectionRate)} detail={`${collectionImproved ? "up" : "down"} from ${pct(operatingPrior.collectionRate)} in ${operatingPrior.period}`} tone={operatingMonth.collectionRate >= 0.95 ? "positive" : "warning"} />
              <Metric label="Marketing / revenue" value={pct(operatingMonth.marketingRatio)} detail={`${money(operatingMonth.marketingSpend)} invested`} />
              <Metric label="Active therapists" value={String(data.summary.activeTherapists)} detail={`${money(data.summary.revenuePerTherapist)} average revenue`} />
              <Metric label="Team revenue share" value={pct(1 - data.summary.ownerRevenueShare)} detail={`${money(data.summary.revenueWithoutOwner)} without owner clinical hours`} />
            </div>
          </Panel>
        </>}

        {activeView === "capacity" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Weighted utilization" value={pct(data.summary.weightedUtilization)} detail={`${pct(Math.max(0, 1 - data.summary.weightedUtilization))} of scheduled clinical time remained open`} tone={data.summary.weightedUtilization < 0.5 ? "warning" : "default"} />
            <Metric label="Booked appointments" value={String(data.summary.bookedAppointments)} detail={`${data.summary.bookedHours.toFixed(1)} booked hours · ${data.summary.appointmentsPerTherapistWeek.toFixed(1)} per therapist/week`} />
            <Metric label="Revenue per therapist" value={money(data.summary.revenuePerTherapist)} detail={`${data.summary.activeTherapists} active revenue-generating therapists`} />
          </div>
          <div className="ttg-dashboard-grid ttg-dashboard-grid-capacity">
            <Panel eyebrow="Capacity by practitioner" title={data.summary.weightedUtilization < 0.5 ? "Open clinical hours are widespread." : data.summary.weightedUtilization < 0.75 ? "Capacity varies across practitioners." : "Most scheduled capacity is now booked."} note={`${data.clinicalPeriod} · sorted by available hours · teal is booked time; stone is open scheduled time`}><CapacityChart therapists={data.therapists} /></Panel>
            <Panel eyebrow="Revenue contribution" title="Revenue contribution across the active team." note={`${data.clinicalPeriod} gross revenue · average per therapist ${money(data.summary.revenuePerTherapist)}`}><TherapistRevenueChart therapists={data.therapists} /></Panel>
          </div>
          <div className="ttg-owner-strip"><div><span>Owner contribution</span><strong>{pct(data.summary.ownerRevenueShare)}</strong><small>{money(operatingMonth.grossRevenue * data.summary.ownerRevenueShare)}</small></div><div className="ttg-owner-bar"><span style={{ width: `${data.summary.ownerRevenueShare * 100}%` }} /><i /></div><div><span>Team contribution</span><strong>{pct(1 - data.summary.ownerRevenueShare)}</strong><small>{money(data.summary.revenueWithoutOwner)}</small></div></div>
        </>}

        {activeView === "controls" && <>
          <div className="ttg-hero-metrics">
            <Metric label="Payout reconciliation" value={pct(data.summary.payoutReconciliation)} detail={`${data.summary.payoutsMatched} of ${data.summary.payoutsExpected} reviewed payouts · ${money(data.summary.payoutValue)} matched`} tone={data.summary.payoutReconciliation >= 0.999 ? "positive" : "warning"} />
            <Metric label="Contractor commissions" value={money(data.summary.contractorCommissions)} detail={`${pct(commissionRate)} of gross revenue · management reporting`} />
            <Metric label="Uncategorized expenses" value={money(operatingMonth.uncategorizedExpenses)} detail={`${pct(operatingMonth.uncategorizedExpenses / operatingMonth.operatingExpenses)} of operating expenses`} tone={operatingMonth.uncategorizedExpenses > 0 ? "warning" : "positive"} />
          </div>
          <div className="ttg-dashboard-grid">
            <Panel eyebrow="Expense composition" title={topExpense ? `${topExpense.category} is the largest operating cost.` : "Operating expense composition"} note={`${money(operatingMonth.operatingExpenses)} total operating expenses · ${data.reportingPeriod} ${operatingMonth.status.toLowerCase()}`}><ExpenseChart expenses={data.expenses} /></Panel>
            <Panel eyebrow="Close checklist" title={failures.length ? `${failures.length} ${failures.length === 1 ? "control has" : "controls have"} failed.` : `${copy.passes} checks pass; ${warnings.length} ${warnings.length === 1 ? "needs" : "need"} review.`} note="Checks reconcile the reporting workbook to Jane and supplied bank exports">
              <div className="ttg-quality-list">{data.qualityChecks.map((check) => <div className="ttg-quality-row" key={check.check}><span className={`is-${check.status.toLowerCase()}`}>{check.status === "PASS" ? "Pass" : check.status === "FAIL" ? "Fail" : "Review"}</span><div><strong>{check.check}</strong><p>{check.notes}</p></div></div>)}</div>
            </Panel>
          </div>
          <section className="ttg-refresh-routine"><div><div className="ttg-eyebrow">On-demand refresh routine</div><h2>Jane can refresh without waiting for the bank.</h2><p>Jess can update the core AdminFlow analytics whenever new Jane reports are ready. Bank-backed controls keep their previous cutoff until all five bank exports are supplied.</p><Link className="ttg-primary-action" href="/portal/ttg/refresh">Start a dashboard refresh</Link></div><ol><li><strong>Download four core Jane CSVs</strong><span>Appointments, Compensation, Sales, and Payments & Refunds. Hours and Payouts are optional supplements.</span></li><li><strong>Add bank exports when available</strong><span>Include all five accounts for a full financial refresh, or none for a Jane-only refresh.</span></li><li><strong>Review coverage and overlaps</strong><span>The preview combines historical segments, removes repeated rows, and shows what will change.</span></li><li><strong>Publish the refreshed view</strong><span>Jane-backed analytics update together while bank-backed values remain untouched.</span></li></ol></section>
          <div className="ttg-caveat"><strong>{failures.length ? "Close blocked" : `${warnings.length} ${warnings.length === 1 ? "item" : "items"} to carry into the next refresh`}</strong><p>{[...failures, ...warnings].length ? [...failures, ...warnings].map((warning) => warning.notes).filter(Boolean).join(" ") : "No review items are open for this reporting period."} Current bank balance and available operating cash remain unavailable from transaction-only exports.</p></div>
        </>}

        {activeView === "index" && <>
          <div className="ttg-index-summary">
            <div><span>Source mode</span><strong>{data.source.mode === "live" ? "Connected workbook" : "Verified fixture"}</strong><small>{data.source.label}</small></div>
            <div><span>Source cutoffs</span><strong>Jane {formatDataThrough(data.source.janeDataThrough)}</strong><small>Bank {formatDataThrough(data.source.bankDataThrough)}</small></div>
            <div><span>Workbook refresh</span><strong>{refreshedAt}</strong><small>{data.source.refreshedBy ? `By ${data.source.refreshedBy}` : "Refresh owner not recorded"}</small></div>
          </div>

          <Panel eyebrow="Visualization lineage" title="What powers each dashboard view" note="Fixed definitions; values refresh from the workbook" wide>
            <div className="ttg-lineage-list">
              {dashboardVisualIndex.map((item) => <div className="ttg-lineage-row" key={item.visual}><strong>{item.visual}</strong><span>{item.source}</span><p>{item.fields}</p><p>{item.calculation}</p></div>)}
            </div>
          </Panel>

          <section className="ttg-coverage-section">
            <div className="ttg-coverage-heading"><div><div className="ttg-eyebrow">Original request coverage</div><h2>Gabby’s full metric list</h2></div><div className="ttg-status-legend"><span className="is-shown">Shown</span><span className="is-available">Available</span><span className="is-partial">Partial</span><span className="is-not-available">Needs source</span></div></div>
            {gabbyMetricCoverage.map((group) => <div className="ttg-coverage-group" key={group.group}><h3>{group.group}</h3><div className="ttg-coverage-table">{group.items.map((item) => <div className="ttg-coverage-row" key={item.metric}><strong>{item.metric}</strong><span className={`is-${item.status}`}>{item.status === "not-available" ? "Needs source" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span><p>{item.source}</p><p>{item.use}</p></div>)}</div></div>)}
            <div className="ttg-caveat"><strong>Period selection</strong><p>Jane analytics can be viewed by week, month, quarter, or a custom date range. Gabby’s bank-backed practice metrics remain monthly because the supplied bank statements do not provide a dependable clinical reporting grain.</p></div>
          </section>
        </>}

        <footer className="ttg-dashboard-footer"><span>No client names or PHI included.</span><span>{analyticsView ? "Jane aggregate reporting" : "Jane + supplied corporate-bank CSVs"}</span><span>Workbook updated {refreshedAt}{data.source.refreshedBy ? ` by ${data.source.refreshedBy}` : ""}</span></footer>
      </div>
    </div>
  );
}
