import Link from "next/link";
import type { TtgDashboardData } from "@/lib/portal/ttg/dashboard";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

function Cards({ items }: { items: Array<{ label: string; value: string; detail: string; unavailable?: boolean }> }) {
  return <div className="ttg-af-cards">{items.map((item) => <div className={item.unavailable ? "is-unavailable" : ""} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div>)}</div>;
}

function Bars({ rows, value, label }: { rows: Array<Record<string, unknown>>; value: string; label: string }) {
  const values = rows.map((row) => Number(row[value] ?? 0));
  const max = Math.max(...values, 1);
  return <div className="ttg-af-bars">{rows.slice(0, 12).map((row, index) => <div key={`${String(row[label])}-${index}`}><span>{String(row[label])}</span><i><b style={{ width: `${(Number(row[value] ?? 0) / max) * 100}%` }} /></i><strong>{number.format(Number(row[value] ?? 0))}</strong></div>)}</div>;
}

function Tabs({ view, active, tabs }: { view: string; active: string; tabs: string[] }) {
  return <nav className="ttg-af-tabs" aria-label={`${view} sections`}>{tabs.map((tab) => <Link className={active === tab.toLowerCase().replace(/\s+/g, "-") ? "is-active" : ""} href={`?view=${view}&tab=${tab.toLowerCase().replace(/\s+/g, "-")}`} key={tab}>{tab}</Link>)}</nav>;
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="ttg-af-panel"><div><h2>{title}</h2>{note && <p>{note}</p>}</div>{children}</section>;
}

function MissingHistory() {
  return <div className="ttg-af-empty"><strong>Historical appointment coverage is needed.</strong><p>Upload an initial Appointments export covering at least the prior 90 days. The portal will then calculate retention and cohorts without storing patient identities.</p><Link href="/portal/ttg/refresh">Refresh appointment history</Link></div>;
}

export function AdminFlowView({ data, view, tab = "overview" }: { data: TtgDashboardData; view: string; tab?: string }) {
  const month = data.months.find((item) => item.period === data.clinicalPeriod) ?? data.months.at(-1)!;
  const analytics = data.analytics;
  const appointments = analytics?.appointments;
  const financial = analytics?.financial;
  const patient = analytics?.patients;
  const team = analytics?.team ?? data.therapists.map((item) => ({ name: item.name, appointments: item.appointments, completed: 0, cancelled: 0, noShows: 0, patients: 0, revenue: item.revenue, commission: 0 }));
  const completionRate = appointments?.total ? appointments.completed / appointments.total : 0;
  const averageVisit = financial?.invoiceCount ? month.grossRevenue / financial.invoiceCount : 0;

  if (view === "overview") return <>
    <Cards items={[
      { label: "Total invoiced", value: cad.format(month.grossRevenue), detail: month.period },
      { label: "Appointments", value: appointments ? number.format(appointments.total) : "Refresh needed", detail: appointments ? `${pct(completionRate)} completion` : "Publish a new Jane refresh", unavailable: !appointments },
      { label: "Patient retention", value: patient?.historyAvailable ? "Available" : "Needs history", detail: patient?.historyAvailable ? "30, 60 and 90 day cohorts" : "Initial 90-day appointment export", unavailable: !patient?.historyAvailable },
      { label: "Avg. transaction value", value: financial ? cad.format(financial.averageTransactionValue) : "Refresh needed", detail: financial ? `${financial.invoiceCount} invoices` : "New aggregate snapshot required", unavailable: !financial },
    ]} />
    <div className="ttg-af-grid">
      <Panel title="Clinic overview" note="Jane-backed operating snapshot"><Bars rows={team.map((row) => ({ label: row.name, value: row.revenue }))} label="label" value="value" /></Panel>
      <Panel title="Attention needed" note="Only source-backed review items are shown"><div className="ttg-af-alerts">{data.qualityChecks.filter((check) => check.status !== "PASS").slice(0, 5).map((check) => <div key={check.check}><span>{check.status === "FAIL" ? "Action" : "Review"}</span><p><strong>{check.check}</strong><small>{check.notes}</small></p></div>)}</div></Panel>
    </div>
  </>;

  if (view === "financial") {
    const tabs = ["Overview", "Trends", "Services", "Collections", "Receivables", "Cash Flow"];
    const services = financial?.services ?? [];
    const payers = financial?.payers ?? [];
    const methods = financial?.paymentMethods ?? [];
    return <><Tabs view={view} active={tab} tabs={tabs} />
      {tab === "overview" && <><Cards items={[
        { label: "Total invoiced", value: cad.format(month.grossRevenue), detail: month.period },
        { label: "Commission paid", value: cad.format(data.summary.contractorCommissions), detail: "Compensation export" },
        { label: "Net revenue", value: cad.format(month.grossRevenue - data.summary.contractorCommissions), detail: "After commissions" },
        { label: "Commission rate", value: month.grossRevenue ? pct(data.summary.contractorCommissions / month.grossRevenue) : "—", detail: "Management reporting" },
      ]} /><div className="ttg-af-grid"><Panel title="Sales summary"><dl className="ttg-af-summary"><div><dt>Invoices</dt><dd>{financial?.invoiceCount ?? "Refresh needed"}</dd></div><div><dt>Invoiced</dt><dd>{cad.format(month.grossRevenue)}</dd></div><div><dt>Collected</dt><dd>{cad.format(month.collectedRevenue)}</dd></div><div><dt>Outstanding</dt><dd>{cad.format(month.outstandingBalance)}</dd></div></dl></Panel><Panel title="Collection health"><strong className="ttg-af-big">{pct(month.collectionRate)}</strong><p>{cad.format(month.collectedRevenue)} collected against {cad.format(month.grossRevenue)} invoiced.</p></Panel></div></>}
      {tab === "trends" && <Panel title="Revenue trends" note="Complete and partial reporting periods"><Bars rows={data.months.map((item) => ({ label: item.period, value: item.grossRevenue }))} label="label" value="value" /></Panel>}
      {tab === "services" && <><Cards items={[{ label: "Total invoiced", value: cad.format(month.grossRevenue), detail: month.period }, { label: "Total visits", value: financial ? String(services.reduce((sum, row) => sum + row.visits, 0)) : "Refresh needed", detail: "Distinct service invoices", unavailable: !financial }, { label: "Top service", value: services[0]?.name ?? "Refresh needed", detail: services[0] ? cad.format(services[0].revenue) : "New aggregate snapshot", unavailable: !financial }, { label: "Avg. service price", value: services.length ? cad.format(month.grossRevenue / Math.max(1, services.reduce((sum, row) => sum + row.visits, 0))) : "—", detail: "Across billed services" }]} /><Panel title="Revenue by service"><Bars rows={services.map((row) => ({ label: row.name, value: row.revenue }))} label="label" value="value" /></Panel></>}
      {tab === "collections" && <><Cards items={[{ label: "Invoiced", value: cad.format(month.grossRevenue), detail: month.period }, { label: "Collected", value: cad.format(month.collectedRevenue), detail: "Jane Sales" }, { label: "Outstanding", value: cad.format(month.outstandingBalance), detail: "Open invoice balance" }, { label: "Collection rate", value: pct(month.collectionRate), detail: "Collected ÷ invoiced" }]} /><Panel title="Payer mix"><Bars rows={payers.map((row) => ({ label: row.name, value: row.invoiced }))} label="label" value="value" /></Panel></>}
      {tab === "receivables" && <><Cards items={[{ label: "Total outstanding", value: cad.format(month.outstandingBalance), detail: "Jane Sales balance" }, { label: "Overdue 90+", value: "Unavailable", detail: "Invoice payment dates by invoice required", unavailable: true }, { label: "Median days to pay", value: "Unavailable", detail: "Not present in current aggregates", unavailable: true }, { label: "Slow payments", value: "Unavailable", detail: "Not present in current aggregates", unavailable: true }]} /><Panel title="A/R aging"><div className="ttg-af-empty"><strong>Aging is not derivable from the current Jane exports.</strong><p>The balance is accurate; age buckets need invoice-level due and settlement dates.</p></div></Panel></>}
      {tab === "cash-flow" && <><Cards items={[{ label: "Net deposits", value: cad.format(month.netCashFlow), detail: "Bank-backed external cash movement" }, { label: "Processing methods", value: methods.length ? String(methods.length) : "Refresh needed", detail: "Payments & Refunds" }, { label: "Payout reconciliation", value: pct(data.summary.payoutReconciliation), detail: `${data.summary.payoutsMatched} of ${data.summary.payoutsExpected} matched` }, { label: "Bank cutoff", value: data.source.bankDataThrough, detail: data.source.bankCoverage ?? "Corporate exports" }]} /><Panel title="Payment processing breakdown"><Bars rows={methods.map((row) => ({ label: row.name, value: row.amount }))} label="label" value="value" /></Panel></>}
    </>;
  }

  if (view === "appointments") {
    const tabs = ["Overview", "Revenue Impact", "Scheduling"];
    const missed = (appointments?.cancelled ?? 0) + (appointments?.noShows ?? 0);
    return <><Tabs view={view} active={tab} tabs={tabs} />
      <Cards items={tab === "revenue-impact" ? [
        { label: "Missed visits", value: appointments ? String(missed) : "Refresh needed", detail: "Cancelled + no-show", unavailable: !appointments },
        { label: "Estimated leakage", value: appointments ? cad.format(missed * averageVisit) : "Refresh needed", detail: "Missed visits × average billed visit", unavailable: !appointments },
        { label: "Cancellations", value: String(appointments?.cancelled ?? "—"), detail: "Jane appointment state" },
        { label: "No shows", value: String(appointments?.noShows ?? "—"), detail: "Jane appointment state" },
      ] : [
        { label: "Total appointments", value: appointments ? String(appointments.total) : "Refresh needed", detail: data.clinicalPeriod, unavailable: !appointments },
        { label: "Completion", value: appointments ? pct(completionRate) : "—", detail: `${appointments?.completed ?? 0} arrived/completed` },
        { label: "Cancellation", value: appointments?.total ? pct(appointments.cancelled / appointments.total) : "—", detail: `${appointments?.cancelled ?? 0} cancelled` },
        { label: "No-show", value: appointments?.total ? pct(appointments.noShows / appointments.total) : "—", detail: `${appointments?.noShows ?? 0} no shows` },
      ]} />
      {tab === "scheduling" ? <div className="ttg-af-grid"><Panel title="Appointments by day"><Bars rows={(appointments?.days ?? []).map((row) => ({ label: row.label, value: row.count }))} label="label" value="value" /></Panel><Panel title="Booking sources"><Bars rows={(appointments?.bookingSources ?? []).map((row) => ({ label: row.label, value: row.count }))} label="label" value="value" /></Panel></div> : <Panel title={tab === "revenue-impact" ? "Potential revenue impact" : "Appointment status mix"}><Bars rows={[{ label: "Completed", value: appointments?.completed ?? 0 }, { label: "Cancelled", value: appointments?.cancelled ?? 0 }, { label: "No show", value: appointments?.noShows ?? 0 }, { label: "Pending", value: appointments?.pending ?? 0 }]} label="label" value="value" /></Panel>}
    </>;
  }

  if (view === "team") {
    const tabs = ["Overview", "Efficiency", "Revenue", "Cancellations", "Details"];
    const total = team.reduce((sum, row) => sum + row.appointments, 0);
    const completed = team.reduce((sum, row) => sum + row.completed, 0);
    return <><Tabs view={view} active={tab} tabs={tabs} /><Cards items={[
      { label: "Active practitioners", value: String(team.length), detail: data.clinicalPeriod },
      { label: "Avg. revenue / practitioner", value: cad.format(team.length ? month.grossRevenue / team.length : 0), detail: "Jane Sales" },
      { label: "Team completion", value: total ? pct(completed / total) : "Refresh needed", detail: `${completed} of ${total}`, unavailable: !analytics },
      { label: "No-show", value: total ? pct(team.reduce((sum, row) => sum + row.noShows, 0) / total) : "—", detail: "Team-wide" },
    ]} />{tab === "details" ? <Panel title="Practitioner details"><div className="ttg-af-table-wrap"><table><thead><tr><th>Practitioner</th><th>Appointments</th><th>Completion</th><th>Revenue</th><th>Commission</th><th>Avg value</th><th>Patients</th></tr></thead><tbody>{team.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.appointments}</td><td>{row.appointments ? pct(row.completed / row.appointments) : "—"}</td><td>{cad.format(row.revenue)}</td><td>{cad.format(row.commission)}</td><td>{cad.format(row.appointments ? row.revenue / row.appointments : 0)}</td><td>{row.patients || "—"}</td></tr>)}</tbody></table></div></Panel> : <Panel title={tab === "cancellations" ? "Cancellations by practitioner" : tab === "efficiency" ? "Appointments by practitioner" : "Revenue by practitioner"}><Bars rows={team.map((row) => ({ label: row.name, value: tab === "cancellations" ? row.cancelled + row.noShows : tab === "efficiency" ? row.appointments : row.revenue }))} label="label" value="value" /></Panel>}</>;
  }

  if (view === "retention") return <><Tabs view={view} active={tab} tabs={["Overview", "Patient Activity", "By Practitioner", "By Service", "Cohorts"]} />{patient?.historyAvailable ? <Cards items={[{ label: "Total patients", value: String(patient.total), detail: data.clinicalPeriod }, { label: "New", value: String(patient.newPatients), detail: "First-visit flag" }, { label: "Returning", value: String(patient.returningPatients), detail: "Seen in period" }, { label: "Repeat visit", value: pct(patient.repeatVisitRate), detail: "Patients with 2+ visits" }]} /> : <MissingHistory />}</>;

  if (view === "funnel") {
    const funnel = analytics?.funnel;
    return <><Tabs view={view} active={tab} tabs={["Funnel", "By Practitioner"]} /><Cards items={[
      { label: "Consultations", value: funnel ? String(funnel.consultations) : "Refresh needed", detail: `${funnel?.consultationPatients ?? 0} patients`, unavailable: !funnel },
      { label: "First visits", value: funnel ? String(funnel.firstVisits) : "Refresh needed", detail: "Non-consult first visits", unavailable: !funnel },
      { label: "Subsequent visits", value: funnel ? String(funnel.subsequentVisits) : "Refresh needed", detail: "Ongoing appointments", unavailable: !funnel },
      { label: "Unique patients", value: funnel ? String(funnel.uniquePatients) : "Refresh needed", detail: data.clinicalPeriod, unavailable: !funnel },
    ]} /><Panel title="Patient funnel"><Bars rows={[{ label: "Consultations", value: funnel?.consultations ?? 0 }, { label: "First visits", value: funnel?.firstVisits ?? 0 }, { label: "Subsequent visits", value: funnel?.subsequentVisits ?? 0 }]} label="label" value="value" /></Panel></>;
  }

  if (view === "imports") return <><Cards items={[
    { label: "Jane data", value: data.source.janeDataThrough, detail: "Appointments, Compensation, Sales, Payments" },
    { label: "Bank data", value: data.source.bankDataThrough, detail: data.source.bankCoverage ?? "Corporate exports" },
    { label: "Refresh status", value: data.source.refreshStatus, detail: data.source.refreshNotes ?? "Latest workbook refresh" },
    { label: "Bank rows", value: String(data.source.bankRows ?? 0), detail: "No account numbers retained" },
  ]} /><Panel title="Data imports" note="Guided CSV importing with date coverage, validation and rollback"><div className="ttg-af-import"><div><strong>Appointments · Compensation · Sales · Payments & Refunds</strong><p>AdminFlow core reports. Hours Scheduled and Jane Payouts remain because Gabby’s custom dashboard also uses utilization and bank reconciliation.</p></div><Link href="/portal/ttg/refresh">Open data imports</Link></div></Panel></>;

  if (view === "data") {
    const tables = data.dataTables ?? [];
    const selected = tables.find((table) => table.name === tab) ?? tables[0];
    return <div className="ttg-af-data"><nav>{tables.map((table) => <Link className={selected?.name === table.name ? "is-active" : ""} href={`?view=data&tab=${encodeURIComponent(table.name)}`} key={table.name}><strong>{table.name}</strong><span>{table.rows.length} rows</span></Link>)}</nav><Panel title={selected?.name ?? "My data"} note="Safe aggregate values read directly from the reporting workbook">{selected ? <div className="ttg-af-table-wrap"><table><thead><tr>{selected.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{selected.rows.slice(0, 100).map((row, index) => <tr key={index}>{selected.columns.map((column) => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div> : <div className="ttg-af-empty">No reporting tables are available.</div>}</Panel></div>;
  }
  return null;
}
