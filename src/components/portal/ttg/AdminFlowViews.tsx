import Link from "next/link";
import {
  InteractiveBarChart,
  InteractiveDonut,
  InteractiveLineChart,
  InteractiveStackedChart,
  InteractiveTrendChart,
} from "@/components/portal/ttg/AdminFlowCharts";
import type { AnalyticsDailyRow, RetentionCohortRow } from "@/lib/portal/ttg/dashboard-refresh";
import type { TtgDashboardData } from "@/lib/portal/ttg/dashboard";
import { rangeContains, type DashboardRange } from "@/lib/portal/ttg/dashboard-period";
import type { SupabaseDataPage } from "@/lib/portal/ttg/supabase-dashboard";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 });
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

type NumericKey = Exclude<{
  [K in keyof AnalyticsDailyRow]: AnalyticsDailyRow[K] extends number ? K : never
}[keyof AnalyticsDailyRow], undefined>;

function queryFor(range: DashboardRange, values: Record<string, string>) {
  const query = new URLSearchParams(values);
  if (range.kind === "custom") {
    query.set("from", range.start);
    query.set("to", range.end);
  } else {
    query.set("period", range.kind);
    query.set("offset", String(range.offset));
  }
  return `?${query.toString()}`;
}

function sum(rows: AnalyticsDailyRow[], key: NumericKey) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function groupRows(rows: AnalyticsDailyRow[], entity: AnalyticsDailyRow["entity"]) {
  const grouped = new Map<string, AnalyticsDailyRow[]>();
  rows.filter((row) => row.entity === entity).forEach((row) => grouped.set(row.name, [...(grouped.get(row.name) ?? []), row]));
  return grouped;
}

function ranked(rows: AnalyticsDailyRow[], entity: AnalyticsDailyRow["entity"], key: NumericKey) {
  return [...groupRows(rows, entity)].map(([label, values]) => ({ label, value: sum(values, key) })).filter((row) => row.value !== 0).sort((a, b) => b.value - a.value);
}

function daily(rows: AnalyticsDailyRow[], keys: NumericKey[]) {
  const grouped = new Map<string, AnalyticsDailyRow[]>();
  rows.filter((row) => row.entity === "clinic").forEach((row) => grouped.set(row.date, [...(grouped.get(row.date) ?? []), row]));
  return [...grouped].sort(([left], [right]) => left.localeCompare(right)).map(([date, values]) => ({
    date,
    label: new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)),
    ...Object.fromEntries(keys.map((key) => [key, sum(values, key)])),
  }));
}

function Cards({ items }: { items: Array<{ label: string; value: string; detail: string; unavailable?: boolean; href?: string }> }) {
  return (
    <div className="ttg-af-cards">
      {items.map((item) => {
        const content = <><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></>;
        return item.href
          ? <Link className={item.unavailable ? "is-unavailable" : ""} href={item.href} key={item.label}>{content}</Link>
          : <div className={item.unavailable ? "is-unavailable" : ""} key={item.label}>{content}</div>;
      })}
    </div>
  );
}

function Tabs({ view, active, tabs, range }: { view: string; active: string; tabs: string[]; range: DashboardRange }) {
  return <nav className="ttg-af-tabs" aria-label={`${view} sections`}>{tabs.map((label) => {
    const tab = slug(label);
    return <Link className={active === tab ? "is-active" : ""} href={queryFor(range, { view, tab })} key={label}>{label}</Link>;
  })}</nav>;
}

function Panel({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="ttg-af-panel"><div className="ttg-af-panel-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</div>{children}</section>;
}

function EmptyHistory() {
  return <div className="ttg-af-empty"><strong>Historical appointment coverage is needed</strong><p>This view appears after the historical Appointments files are published. No current-month values are substituted for retention history.</p><Link href="/portal/ttg/refresh">Open data imports</Link></div>;
}

function DataTable({ columns, rows }: { columns: Array<{ label: string; value: (row: Record<string, string | number>) => string }>; rows: Array<Record<string, string | number>> }) {
  return <div className="ttg-af-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.label ?? "")}-${index}`}>{columns.map((column) => <td key={column.label}>{column.value(row)}</td>)}</tr>)}</tbody></table></div>;
}

function weightedRate(rows: RetentionCohortRow[], retained: "retained30" | "retained60" | "retained90", eligible: "eligible30" | "eligible60" | "eligible90") {
  const denominator = rows.reduce((total, row) => total + row[eligible], 0);
  return denominator ? rows.reduce((total, row) => total + row[retained], 0) / denominator : 0;
}

function retentionCohortWindow(range: DashboardRange) {
  const selectedStart = new Date(`${range.start}T12:00:00Z`);
  const end = new Date(Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1));
  return {
    start: start.toISOString().slice(0, 7),
    end: end.toISOString().slice(0, 7),
  };
}

export function AdminFlowView({ data, dataPage, view, tab = "overview", range }: { data: TtgDashboardData; dataPage?: SupabaseDataPage; view: string; tab?: string; range: DashboardRange }) {
  const rows = data.analyticsRows.filter((row) => rangeContains(row.date, range));
  const clinic = rows.filter((row) => row.entity === "clinic");
  const trend = daily(rows, ["invoiced", "collected", "processed", "appointments", "completed", "cancelled", "noShows"]);
  const invoiced = sum(clinic, "invoiced");
  const collected = sum(clinic, "collected");
  const processed = sum(clinic, "processed");
  const outstanding = sum(clinic, "outstanding");
  const transactions = sum(clinic, "transactions");
  const completedTransactions = sum(clinic, "completedTransactions");
  const completedTransactionValue = sum(clinic, "completedTransactionValue");
  const appointments = sum(clinic, "appointments");
  const completed = sum(clinic, "completed");
  const cancelled = sum(clinic, "cancelled");
  const noShows = sum(clinic, "noShows");
  const refunds = sum(clinic, "refunds");
  const fees = sum(clinic, "fees");
  const completionRate = appointments ? completed / appointments : 0;
  const collectionRate = invoiced ? collected / invoiced : 0;
  const averageTransaction = completedTransactions ? completedTransactionValue / completedTransactions : 0;
  const cohortWindow = retentionCohortWindow(range);
  const selectedCohorts = data.cohortRows.filter((row) => row.cohortMonth >= cohortWindow.start && row.cohortMonth <= cohortWindow.end);
  const selectedClinicCohorts = selectedCohorts.filter((row) => row.entity === "clinic");
  const mature90 = selectedClinicCohorts.reduce((total, row) => total + row.eligible90, 0);
  const historyAvailable = data.cohortRows.length > 0;
  const appointmentsHref = queryFor(range, { view: "data", tab: "Appointments" });
  const transactionsHref = queryFor(range, { view: "data", tab: "Transactions" });
  const salesHref = queryFor(range, { view: "data", tab: "Sales" });

  if (view === "overview") {
    return <>
      <Cards items={[
        { label: "Total invoiced", value: rows.length ? cad.format(invoiced) : "Refresh needed", detail: range.label, unavailable: !rows.length, href: salesHref },
        { label: "Appointments", value: rows.length ? integer.format(appointments) : "Refresh needed", detail: rows.length ? `${pct(completionRate)} completed` : "Publish the historical Jane package", unavailable: !rows.length, href: appointmentsHref },
        { label: "Patient retention", value: mature90 ? pct(weightedRate(selectedClinicCohorts, "retained90", "eligible90")) : historyAvailable ? "Cohorts maturing" : "Needs history", detail: mature90 ? `Six-month cohort ending ${cohortWindow.end}` : historyAvailable ? "No mature 90-day cohort is available" : "Historical appointments required", unavailable: !mature90, href: queryFor(range, { view: "retention", tab: "overview" }) },
        { label: "Avg. transaction value", value: completedTransactions ? cad.format(averageTransaction) : "Refresh needed", detail: completedTransactions ? `Across ${integer.format(completedTransactions)} completed transactions` : "Sales history required", unavailable: !completedTransactions, href: salesHref },
      ]} />
      <div className="ttg-af-grid">
        <Panel title="Clinic performance" note="Invoiced and collected revenue across the selected range" action={<Link href={queryFor(range, { view: "financial", tab: "trends" })}>View financial trends</Link>}>
          <InteractiveTrendChart currency data={trend} series={[
            { key: "invoiced", label: "Invoiced", color: "#2f86ba" },
            { key: "collected", label: "Collected", color: "#61b08b", type: "line" },
          ]} />
        </Panel>
        <Panel title="Appointment mix" note={`${integer.format(appointments)} appointments in ${range.label}`}>
          <InteractiveDonut data={[
            { label: "Completed", value: completed },
            { label: "Cancelled", value: cancelled },
            { label: "No show", value: noShows },
            { label: "Other / pending", value: Math.max(0, appointments - completed - cancelled - noShows) },
          ].filter((item) => item.value > 0)} />
        </Panel>
      </div>
    </>;
  }

  if (view === "financial") {
    const tabs = ["Overview", "Trends", "Services", "Collections", "Receivables", "Cash Flow"];
    const services = ranked(rows, "service", "invoiced");
    const payers = ranked(rows, "payer", "invoiced");
    const methods = ranked(rows, "payment_method", "processed");
    const receivables = [
      { label: "0–30 days", value: 0 },
      { label: "31–60 days", value: 0 },
      { label: "61–90 days", value: 0 },
      { label: "90+ days", value: 0 },
    ];
    clinic.forEach((row) => {
      if (!row.outstanding) return;
      const age = Math.max(0, Math.floor((Date.parse(`${range.end}T12:00:00Z`) - Date.parse(`${row.date}T12:00:00Z`)) / 86_400_000));
      const index = age <= 30 ? 0 : age <= 60 ? 1 : age <= 90 ? 2 : 3;
      receivables[index].value += row.outstanding;
    });
    return <><Tabs active={tab} range={range} tabs={tabs} view={view} />
      {tab === "overview" && <><Cards items={[
        { label: "Total invoiced", value: cad.format(invoiced), detail: range.label, href: salesHref },
        { label: "Collected", value: cad.format(collected), detail: `${pct(collectionRate)} of invoiced`, href: salesHref },
        { label: "Outstanding", value: cad.format(outstanding), detail: "Current open balance on selected invoices", href: salesHref },
        { label: "Avg. transaction", value: completedTransactions ? cad.format(averageTransaction) : "—", detail: `${integer.format(completedTransactions)} completed transactions`, href: salesHref },
      ]} /><div className="ttg-af-grid"><Panel title="Revenue movement" note="Daily invoiced and collected totals"><InteractiveTrendChart currency data={trend} series={[{ key: "invoiced", label: "Invoiced", color: "#2f86ba" }, { key: "collected", label: "Collected", color: "#61b08b", type: "line" }]} /></Panel><Panel title="Collection health" note="Collected revenue divided by invoiced revenue"><strong className="ttg-af-big">{pct(collectionRate)}</strong><p>{cad.format(collected)} collected against {cad.format(invoiced)} invoiced.</p></Panel></div></>}
      {tab === "trends" && <Panel title="Financial trends" note="Hover for exact daily values"><InteractiveTrendChart currency data={trend} series={[{ key: "invoiced", label: "Invoiced", color: "#2f86ba" }, { key: "collected", label: "Collected", color: "#61b08b", type: "line" }, { key: "processed", label: "Payments processed", color: "#e2a256", type: "line", dashed: true }]} /></Panel>}
      {tab === "services" && <><Cards items={[{ label: "Services invoiced", value: cad.format(invoiced), detail: range.label }, { label: "Service lines", value: integer.format(services.length), detail: "Distinct Jane service labels" }, { label: "Top service", value: services[0]?.label ?? "—", detail: services[0] ? cad.format(services[0].value) : "No activity" }, { label: "Appointments", value: integer.format(appointments), detail: "Across all services" }]} /><Panel title="Revenue by service" note="Highest invoiced services first"><InteractiveBarChart currency data={services.slice(0, 12)} horizontal /></Panel></>}
      {tab === "collections" && <><Cards items={[{ label: "Payments processed", value: cad.format(processed), detail: range.label }, { label: "Transactions", value: integer.format(transactions), detail: "Payments & Refunds" }, { label: "Refunds", value: cad.format(refunds), detail: "Absolute refund value" }, { label: "Processing fees", value: cad.format(fees), detail: "Rows identified as fees" }]} /><div className="ttg-af-grid"><Panel title="Payment methods" note="Net processed value by Jane payment method"><InteractiveDonut currency data={methods.slice(0, 8)} /></Panel><Panel title="Payer mix" note="Invoiced revenue by payer category"><InteractiveBarChart currency data={payers.slice(0, 8)} horizontal /></Panel></div></>}
      {tab === "receivables" && <><Cards items={[{ label: "Total outstanding", value: cad.format(outstanding), detail: "Open balances on selected invoice dates" }, { label: "0–30 days", value: cad.format(receivables[0].value), detail: "Current balance by invoice age" }, { label: "31–90 days", value: cad.format(receivables[1].value + receivables[2].value), detail: "Current balance by invoice age" }, { label: "90+ days", value: cad.format(receivables[3].value), detail: "Current balance by invoice age" }]} /><Panel title="Receivables aging" note="Open balance grouped by the age of its Jane invoice date"><InteractiveBarChart currency data={receivables} /></Panel></>}
      {tab === "cash-flow" && <><Cards items={[{ label: "Jane payments processed", value: cad.format(processed), detail: range.label }, { label: "Refunds", value: cad.format(refunds), detail: "Payments & Refunds" }, { label: "Fees", value: cad.format(fees), detail: "Payments & Refunds" }, { label: "Net processing activity", value: cad.format(processed), detail: "Jane only; excludes bank balances" }]} /><Panel title="Payment processing trend" note="This is Jane transaction activity, not corporate bank cash"><InteractiveLineChart currency data={trend} series={[{ key: "processed", label: "Payments processed", color: "#2f86ba" }]} /></Panel></>}
    </>;
  }

  if (view === "appointments") {
    const tabs = ["Overview", "Revenue Impact", "Scheduling"];
    const missed = cancelled + noShows;
    const recovered = sum(clinic, "recovered");
    const estimatedMissedValue = missed * (appointments ? invoiced / appointments : 0);
    const days = new Map<string, number>();
    clinic.forEach((row) => {
      const label = new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(new Date(`${row.date}T12:00:00Z`));
      days.set(label, (days.get(label) ?? 0) + row.appointments);
    });
    const dayRows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, value: days.get(label) ?? 0 }));
    const hours = ranked(rows, "hour", "appointments").sort((a, b) => a.label.localeCompare(b.label)).map((row) => ({ ...row, label: `${row.label}:00` }));
    return <><Tabs active={tab} range={range} tabs={tabs} view={view} />
      {tab === "overview" && <><Cards items={[{ label: "Appointments", value: integer.format(appointments), detail: range.label }, { label: "Completed", value: integer.format(completed), detail: pct(completionRate) }, { label: "Cancelled", value: integer.format(cancelled), detail: appointments ? pct(cancelled / appointments) : "—" }, { label: "No shows", value: integer.format(noShows), detail: appointments ? pct(noShows / appointments) : "—" }]} /><Panel title="Appointment volume and outcomes" note="Hover for exact daily counts"><InteractiveStackedChart data={trend} series={[{ key: "completed", label: "Completed", color: "#55b88b" }, { key: "cancelled", label: "Cancelled", color: "#efaa59" }, { key: "noShows", label: "No show", color: "#df6d76" }]} /></Panel></>}
      {tab === "revenue-impact" && <><Cards items={[{ label: "Missed visits", value: integer.format(missed), detail: "Cancelled + no-show" }, { label: "Estimated missed value", value: cad.format(estimatedMissedValue), detail: "Missed visits × average invoiced appointment" }, { label: "Later appointments", value: integer.format(recovered), detail: "Patients seen again after a missed visit" }, { label: "Recovery rate", value: missed ? pct(recovered / missed) : "—", detail: "Later appointment ÷ missed visits" }]} /><Panel title="Missed and recovered appointments" note="Recovery means a later completed appointment exists in the supplied history"><InteractiveBarChart data={[{ label: "Cancelled", value: cancelled }, { label: "No show", value: noShows }, { label: "Later appointment", value: recovered }]} /></Panel></>}
      {tab === "scheduling" && <div className="ttg-af-grid"><Panel title="Appointments by weekday" note="Selected date range"><InteractiveBarChart data={dayRows} /></Panel><Panel title="Appointments by start hour" note="Jane appointment start time"><InteractiveBarChart data={hours} /></Panel></div>}
    </>;
  }

  if (view === "team") {
    const tabs = ["Overview", "Efficiency", "Revenue", "Cancellations", "Details"];
    const practitioners = [...groupRows(rows, "practitioner")].map(([label, values]) => ({
      label,
      appointments: sum(values, "appointments"),
      completed: sum(values, "completed"),
      cancelled: sum(values, "cancelled"),
      noShows: sum(values, "noShows"),
      invoiced: sum(values, "invoiced"),
      collected: sum(values, "collected"),
      commission: sum(values, "commission"),
      bookedMinutes: sum(values, "bookedMinutes"),
    })).filter((row) => row.appointments || row.invoiced || row.commission).sort((a, b) => b.invoiced - a.invoiced);
    const active = practitioners.length;
    const chartKey = tab === "cancellations" ? "missed" : tab === "efficiency" ? "completion" : "invoiced";
    const chartRows = practitioners.map((row) => ({ label: row.label, invoiced: row.invoiced, missed: row.cancelled + row.noShows, completion: row.appointments ? row.completed / row.appointments * 100 : 0 }));
    return <><Tabs active={tab} range={range} tabs={tabs} view={view} /><Cards items={[{ label: "Active practitioners", value: integer.format(active), detail: range.label }, { label: "Avg. invoiced / practitioner", value: active ? cad.format(invoiced / active) : "—", detail: "Jane Sales" }, { label: "Team completion", value: pct(completionRate), detail: `${integer.format(completed)} completed` }, { label: "Missed appointments", value: integer.format(cancelled + noShows), detail: "Cancelled + no-show" }]} />
      {tab === "details" ? <Panel title="Practitioner details" note="Sortable presentation follows the same selected range"><DataTable rows={practitioners} columns={[
        { label: "Practitioner", value: (row) => String(row.label) },
        { label: "Appointments", value: (row) => integer.format(Number(row.appointments)) },
        { label: "Completion", value: (row) => Number(row.appointments) ? pct(Number(row.completed) / Number(row.appointments)) : "—" },
        { label: "Invoiced", value: (row) => cad.format(Number(row.invoiced)) },
        { label: "Collected", value: (row) => cad.format(Number(row.collected)) },
        { label: "Commission", value: (row) => cad.format(Number(row.commission)) },
        { label: "Avg. appointment", value: (row) => Number(row.appointments) ? cad.format(Number(row.invoiced) / Number(row.appointments)) : "—" },
      ]} /></Panel> : <Panel title={tab === "cancellations" ? "Missed appointments by practitioner" : tab === "efficiency" ? "Completion rate by practitioner" : "Invoiced revenue by practitioner"} note="Hover for exact values"><InteractiveBarChart currency={chartKey === "invoiced"} data={chartRows} horizontal valueKey={chartKey} /></Panel>}
    </>;
  }

  if (view === "retention") {
    const tabs = ["Overview", "Patient Activity", "By Practitioner", "By Service", "Cohorts"];
    const cohorts = selectedCohorts;
    const clinicCohorts = cohorts.filter((row) => row.entity === "clinic");
    if (!historyAvailable) return <><Tabs active={tab} range={range} tabs={tabs} view={view} /><EmptyHistory /></>;
    const rate30 = weightedRate(clinicCohorts, "retained30", "eligible30");
    const rate60 = weightedRate(clinicCohorts, "retained60", "eligible60");
    const rate90 = weightedRate(clinicCohorts, "retained90", "eligible90");
    const cohortSize = clinicCohorts.reduce((total, row) => total + row.cohortSize, 0);
    const repeat = clinicCohorts.reduce((total, row) => total + row.repeatPatients, 0);
    const activity = clinicCohorts.map((row) => ({ label: row.cohortMonth, cohort: row.cohortSize, repeat: row.repeatPatients, retained30: row.eligible30 ? row.retained30 / row.eligible30 * 100 : 0, retained60: row.eligible60 ? row.retained60 / row.eligible60 * 100 : 0, retained90: row.eligible90 ? row.retained90 / row.eligible90 * 100 : 0 }));
    const dimension = tab === "by-practitioner" ? "practitioner" : "service";
    const breakdown = cohorts.filter((row) => row.entity === dimension).map((row) => ({ label: row.name, value: row.eligible90 ? row.retained90 / row.eligible90 * 100 : 0 })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
    return <><Tabs active={tab} range={range} tabs={tabs} view={view} />
      {(tab === "overview" || tab === "patient-activity") && <><Cards items={[{ label: "Cohort patients", value: integer.format(cohortSize), detail: `${cohortWindow.start} to ${cohortWindow.end}` }, { label: "30-day retention", value: pct(rate30), detail: "Mature eligible cohorts" }, { label: "60-day retention", value: pct(rate60), detail: "Mature eligible cohorts" }, { label: "90-day retention", value: pct(rate90), detail: "Mature eligible cohorts" }]} /><Panel title={tab === "patient-activity" ? "New and repeat patient activity" : "Retention by cohort month"} note="Rolling six-month cohort; only mature patients enter each denominator">{tab === "patient-activity" ? <InteractiveStackedChart data={activity} series={[{ key: "cohort", label: "New cohort", color: "#2f86ba" }, { key: "repeat", label: "Repeat patients", color: "#61b08b" }]} /> : <InteractiveLineChart data={activity} series={[{ key: "retained30", label: "30 day", color: "#2f86ba" }, { key: "retained60", label: "60 day", color: "#61b08b" }, { key: "retained90", label: "90 day", color: "#e2a256" }]} />}</Panel></>}
      {(tab === "by-practitioner" || tab === "by-service") && <><Cards items={[{ label: "Selected cohorts", value: integer.format(cohortSize), detail: range.label }, { label: "Repeat patients", value: integer.format(repeat), detail: "Two or more completed visits" }, { label: "90-day retention", value: pct(rate90), detail: "Clinic weighted rate" }, { label: "Breakdown rows", value: integer.format(breakdown.length), detail: dimension === "practitioner" ? "Practitioners" : "Services" }]} /><Panel title={`90-day retention by ${dimension}`} note="Only rows with mature eligible cohorts are shown"><InteractiveBarChart data={breakdown.slice(0, 15)} horizontal /></Panel></>}
      {tab === "cohorts" && <Panel title="Retention cohorts" note="Privacy-safe monthly aggregates; no patient identities are stored"><DataTable rows={activity} columns={[
        { label: "Cohort", value: (row) => String(row.label) },
        { label: "Patients", value: (row) => integer.format(Number(row.cohort)) },
        { label: "Repeat", value: (row) => integer.format(Number(row.repeat)) },
        { label: "30 days", value: (row) => `${Number(row.retained30).toFixed(1)}%` },
        { label: "60 days", value: (row) => `${Number(row.retained60).toFixed(1)}%` },
        { label: "90 days", value: (row) => `${Number(row.retained90).toFixed(1)}%` },
      ]} /></Panel>}
    </>;
  }

  if (view === "funnel") {
    const tabs = ["Overview", "By Practitioner"];
    const consultations = sum(clinic, "consultations");
    const firstVisits = sum(clinic, "firstVisits");
    const subsequentVisits = sum(clinic, "subsequentVisits");
    const practitionerFunnel = [...groupRows(rows, "practitioner")].map(([label, values]) => ({ label, consultations: sum(values, "consultations"), firstVisits: sum(values, "firstVisits"), subsequentVisits: sum(values, "subsequentVisits") })).filter((row) => row.consultations || row.firstVisits || row.subsequentVisits);
    return <><Tabs active={tab} range={range} tabs={tabs} view={view} /><Cards items={[{ label: "Consultations", value: integer.format(consultations), detail: "Jane treatment labels containing consult" }, { label: "First visits", value: integer.format(firstVisits), detail: "First-visit flag excluding consultations" }, { label: "Subsequent visits", value: integer.format(subsequentVisits), detail: "Ongoing appointment activity" }, { label: "Total appointments", value: integer.format(appointments), detail: range.label }]} />{tab === "by-practitioner" ? <Panel title="Patient path by practitioner" note="This is an appointment-state path; Jane does not provide pre-booking inquiries"><InteractiveStackedChart data={practitionerFunnel} series={[{ key: "consultations", label: "Consultations", color: "#2f86ba" }, { key: "firstVisits", label: "First visits", color: "#61b08b" }, { key: "subsequentVisits", label: "Subsequent", color: "#e2a256" }]} /></Panel> : <Panel title="Jane appointment funnel" note="Inquiry-to-booking is intentionally excluded because no inquiry source is present"><InteractiveBarChart data={[{ label: "Consultations", value: consultations }, { label: "First visits", value: firstVisits }, { label: "Subsequent visits", value: subsequentVisits }]} horizontal /></Panel>}</>;
  }

  if (view === "insights") {
    const enoughDays = Math.max(0, Math.round((Date.parse(`${range.end}T12:00:00Z`) - Date.parse(`${range.start}T12:00:00Z`)) / 86_400_000)) >= 27;
    if (!rows.length || !enoughDays) {
      return <div className="ttg-af-empty"><strong>Not Enough Data for This Period</strong><p>Choose a longer date range after the historical imports mature. The dashboard will not substitute a different period or invent an insight.</p></div>;
    }
    const signals = [
      { label: "Collection health", value: pct(collectionRate), detail: collectionRate >= 0.95 ? "Collections are keeping pace with invoicing." : "Outstanding balances merit review." },
      { label: "Appointment completion", value: pct(completionRate), detail: `${integer.format(cancelled + noShows)} missed appointments in the selected range.` },
      { label: "Revenue per appointment", value: appointments ? cad.format(invoiced / appointments) : "—", detail: "Invoiced revenue divided by total appointments." },
      { label: "30-day retention", value: selectedClinicCohorts.some((row) => row.eligible30) ? pct(weightedRate(selectedClinicCohorts, "retained30", "eligible30")) : "Cohorts maturing", detail: "Only eligible patients enter the denominator." },
    ];
    return <><Cards items={signals} /><Panel title="Operating intelligence" note="Derived from the selected period and its mature historical cohorts"><div className="ttg-quality-list">{signals.map((signal) => <div className="ttg-quality-row" key={signal.label}><span className="is-pass">Signal</span><div><strong>{signal.label}: {signal.value}</strong><p>{signal.detail}</p></div></div>)}</div></Panel></>;
  }

  if (view === "marketing") {
    const tabs = ["Performance", "Campaigns", "Trends"];
    const marketingTab = tab === "overview" ? "performance" : tab;
    const newPatients = sum(clinic, "newPatients");
    const marketingSpend = 0;
    const acquisitionRevenue = invoiced;
    const cac = newPatients ? marketingSpend / newPatients : 0;
    const roas = marketingSpend ? acquisitionRevenue / marketingSpend : 0;
    const marketingTrend = daily(rows, ["newPatients", "invoiced"]).map((row) => ({ ...row, spend: 0 }));
    return <><Tabs active={marketingTab} range={range} tabs={tabs} view={view} />
      {marketingTab === "performance" && <><Cards items={[
        { label: "Marketing spend", value: cad.format(marketingSpend), detail: "No manual campaign spend in the selected range", unavailable: !marketingSpend },
        { label: "New patients", value: integer.format(newPatients), detail: "Jane first-visit activity" },
        { label: "CAC", value: marketingSpend ? cad.format(cac) : "Needs spend", detail: "Marketing spend ÷ new patients", unavailable: !marketingSpend },
        { label: "ROAS", value: marketingSpend ? `${roas.toFixed(2)}×` : "Needs spend", detail: "Invoiced revenue ÷ marketing spend", unavailable: !marketingSpend },
      ]} /><Panel title="Marketing performance" note="Jane acquisition activity is live; campaign spend is maintained manually"><InteractiveTrendChart data={marketingTrend} series={[{ key: "newPatients", label: "New patients", color: "#2f86ba" }]} /></Panel></>}
      {marketingTab === "campaigns" && <><Cards items={[
        { label: "Active campaigns", value: "0", detail: "No campaign records in Supabase" },
        { label: "Campaign spend", value: cad.format(0), detail: range.label },
        { label: "New patients", value: integer.format(newPatients), detail: "Jane first visits" },
        { label: "Confidence", value: "Needs mapping", detail: "Add campaign dates and spend to calculate attribution" },
      ]} /><div className="ttg-af-empty"><strong>No campaigns in this period</strong><p>Add the same manual campaign inputs used in AdminFlow to calculate CAC, ROAS, and payback without changing the Jane importer.</p></div></>}
      {marketingTab === "trends" && <Panel title="Acquisition trends" note="New patients from Jane; spend remains zero until campaigns are entered"><InteractiveLineChart data={marketingTrend} series={[{ key: "newPatients", label: "New patients", color: "#2f86ba" }]} /></Panel>}
    </>;
  }

  if (view === "custom") {
    const commission = sum(clinic, "commission");
    const practitionerCount = groupRows(rows, "practitioner").size;
    return <><div className="ttg-af-tabs"><strong>Main Sheets</strong></div><Cards items={[
      { label: "Total Revenue", value: cad.format(invoiced), detail: range.label, href: salesHref },
      { label: "Total Commission", value: cad.format(commission), detail: "Compensation detail", href: transactionsHref },
      { label: "New KPI Card", value: "Not configured", detail: "Matches the saved AdminFlow widget", unavailable: true },
      { label: "Avg Revenue per Practitioner", value: practitionerCount ? cad.format(invoiced / practitionerCount) : "—", detail: `${practitionerCount} active practitioners`, href: queryFor(range, { view: "team", tab: "revenue" }) },
    ]} /><Panel title="Main Sheets" note="Saved custom dashboard · 1 of 10"><InteractiveBarChart currency horizontal data={ranked(rows, "practitioner", "invoiced").slice(0, 12)} /></Panel></>;
  }

  if (view === "imports") {
    const coverageTable = data.dataTables?.find((table) => table.name === "Source Coverage");
    return <><Cards items={[
      { label: "Jane data through", value: data.source.janeDataThrough, detail: "Latest published Jane date" },
      { label: "Historical aggregates", value: data.analyticsRows.length ? integer.format(data.analyticsRows.length) : "Refresh needed", detail: "Privacy-safe daily rows", unavailable: !data.analyticsRows.length },
      { label: "Retention cohorts", value: data.cohortRows.length ? integer.format(data.cohortRows.length) : "Needs history", detail: "Privacy-safe cohort rows", unavailable: !data.cohortRows.length },
      { label: "Refresh status", value: data.source.refreshStatus, detail: data.source.refreshNotes ?? "Latest database refresh" },
    ]} /><Panel title="Data imports" note="AdminFlow's four-report workflow, with historical overlap handled automatically"><div className="ttg-af-import"><div><strong>Appointments · Compensation · Sales · Payments & Refunds</strong><p>Upload one or several exports per report. The importer recognizes each structure, combines historical segments, removes repeated rows, and publishes Jane analytics without requiring bank files. Retention cohorts refresh only when the Appointments package includes at least 90 days of history, so a short incremental upload cannot erase mature cohorts.</p></div><Link href="/portal/ttg/refresh">Open data imports</Link></div>{coverageTable && <DataTable rows={coverageTable.rows.slice(0, 12)} columns={coverageTable.columns.slice(0, 5).map((column) => ({ label: column, value: (row) => String(row[column] ?? "") }))} />}</Panel></>;
  }

  if (view === "data") {
    const tables = data.dataTables ?? [];
    const selected = tables.find((table) => table.name === tab) ?? tables[0];
    const page = dataPage && dataPage.name === selected?.name ? dataPage : undefined;
    const columns = page?.columns ?? selected?.columns ?? [];
    const displayRows = page?.rows ?? selected?.rows.slice(0, 250) ?? [];
    const pageHref = (updates: Partial<{ page: number; size: number; sort: string; direction: "asc" | "desc"; search: string }>) => queryFor(range, {
      view: "data",
      tab: page?.name ?? selected?.name ?? "Appointments",
      dataPage: String(updates.page ?? page?.page ?? 1),
      dataSize: String(updates.size ?? page?.pageSize ?? 20),
      dataSort: updates.sort ?? page?.sort ?? columns[0] ?? "",
      dataDir: updates.direction ?? page?.direction ?? "desc",
      dataSearch: updates.search ?? page?.search ?? "",
    });
    const firstRow = page?.rowCount ? (page.page - 1) * page.pageSize + 1 : 0;
    const lastRow = page ? Math.min(page.page * page.pageSize, page.rowCount) : displayRows.length;
    return <div className="ttg-af-data">
      <nav>{tables.map((table) => <Link className={selected?.name === table.name ? "is-active" : ""} href={queryFor(range, { view: "data", tab: table.name })} key={table.name}><strong>{table.name}</strong><span>{page?.tableCounts[table.name] ?? table.rowCount ?? table.rows.length} rows</span></Link>)}</nav>
      <Panel title={selected?.name ?? "My data"} note="Read-only privacy-safe values from the secure reporting database">
        {page && <form className="ttg-af-table-controls" method="get">
          <input name="view" type="hidden" value="data" />
          <input name="tab" type="hidden" value={page.name} />
          {range.kind === "custom" ? <><input name="from" type="hidden" value={range.start} /><input name="to" type="hidden" value={range.end} /></> : <><input name="period" type="hidden" value={range.kind} /><input name="offset" type="hidden" value={range.offset} /></>}
          <input name="dataPage" type="hidden" value="1" />
          <input name="dataSort" type="hidden" value={page.sort} />
          <input name="dataDir" type="hidden" value={page.direction} />
          <label><span>Search this table</span><input defaultValue={page.search} name="dataSearch" placeholder={`Search ${page.name.toLowerCase()}`} type="search" /></label>
          <label><span>Rows per page</span><select defaultValue={String(page.pageSize)} name="dataSize">{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <button type="submit">Apply</button>
          {page.search && <Link href={pageHref({ page: 1, search: "" })}>Clear search</Link>}
        </form>}
        {selected ? <><div className="ttg-af-table-meta"><strong>{page ? `${integer.format(firstRow)}–${integer.format(lastRow)} of ${integer.format(page.rowCount)}` : `${displayRows.length} rows`}</strong><span>{range.label}</span></div><div className="ttg-af-table-wrap"><table><thead><tr>{columns.map((column) => {
          const activeSort = page?.sort === column;
          const direction = activeSort && page?.direction === "asc" ? "desc" : "asc";
          return <th key={column}>{page ? <Link aria-label={`Sort by ${column} ${direction === "asc" ? "ascending" : "descending"}`} href={pageHref({ page: 1, sort: column, direction })}>{column}{activeSort ? page.direction === "asc" ? " ↑" : " ↓" : ""}</Link> : column}</th>;
        })}</tr></thead><tbody>{displayRows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div>{page && <nav aria-label={`${page.name} pagination`} className="ttg-af-pagination">
          <Link aria-disabled={page.page === 1} className={page.page === 1 ? "is-disabled" : ""} href={pageHref({ page: 1 })}>First</Link>
          <Link aria-disabled={page.page === 1} className={page.page === 1 ? "is-disabled" : ""} href={pageHref({ page: Math.max(1, page.page - 1) })}>Previous</Link>
          <span>Page {page.page} of {page.pageCount}</span>
          <Link aria-disabled={page.page === page.pageCount} className={page.page === page.pageCount ? "is-disabled" : ""} href={pageHref({ page: Math.min(page.pageCount, page.page + 1) })}>Next</Link>
          <Link aria-disabled={page.page === page.pageCount} className={page.page === page.pageCount ? "is-disabled" : ""} href={pageHref({ page: page.pageCount })}>Last</Link>
        </nav>}</> : <div className="ttg-af-empty">No reporting tables are available.</div>}
      </Panel>
    </div>;
  }

  return null;
}
