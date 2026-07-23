import type {
  CustomDashboard,
  DashboardSource,
  ExpenseMetric,
  MarketingCampaign,
  MonthlyMetric,
  TherapistMetric,
  TtgDashboardData,
} from "./dashboard";
import type { AnalyticsDailyRow, RetentionCohortRow } from "./dashboard-refresh";
import { ttgDashboardFixture } from "./dashboard-fixture";
import { ttgReportingClient } from "./ttg-reporting-db";

type DbRow = Record<string, unknown>;

export type SupabaseDataPage = {
  name: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
  tableCounts: Record<string, number>;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: string;
  direction: "asc" | "desc";
  search: string;
};

type DataPageConfig = {
  table: string;
  select: string;
  dateColumn?: string;
  defaultSort: string;
  searchColumns: string[];
  columns: Array<{ label: string; field: string; format?: "currency" | "minutes" }>;
};

const DATA_PAGE_CONFIG: Record<string, DataPageConfig> = {
  Appointments: {
    table: "appointment_facts_current",
    select: "occurred_at,service,practitioner,state,duration_minutes,booking_source",
    dateColumn: "date",
    defaultSort: "occurred_at",
    searchColumns: ["service", "practitioner", "state", "booking_source"],
    columns: [
      { label: "Date / Time", field: "occurred_at" },
      { label: "Service", field: "service" },
      { label: "Staff", field: "practitioner" },
      { label: "Status", field: "state" },
      { label: "Duration", field: "duration_minutes", format: "minutes" },
      { label: "Booking Source", field: "booking_source" },
    ],
  },
  Transactions: {
    table: "transaction_facts_current",
    select: "date,practitioner,service,revenue,collected,commission,status",
    dateColumn: "date",
    defaultSort: "date",
    searchColumns: ["practitioner", "service", "status"],
    columns: [
      { label: "Date", field: "date" },
      { label: "Practitioner", field: "practitioner" },
      { label: "Service", field: "service" },
      { label: "Revenue", field: "revenue", format: "currency" },
      { label: "Collected", field: "collected", format: "currency" },
      { label: "Commission", field: "commission", format: "currency" },
      { label: "Status", field: "status" },
    ],
  },
  Sales: {
    table: "sales_facts_current",
    select: "date,item,practitioner,payer_category,total,collected,outstanding,status",
    dateColumn: "date",
    defaultSort: "date",
    searchColumns: ["item", "practitioner", "payer_category", "status"],
    columns: [
      { label: "Invoice Date", field: "date" },
      { label: "Item", field: "item" },
      { label: "Practitioner", field: "practitioner" },
      { label: "Payer", field: "payer_category" },
      { label: "Total", field: "total", format: "currency" },
      { label: "Collected", field: "collected", format: "currency" },
      { label: "Outstanding", field: "outstanding", format: "currency" },
      { label: "Status", field: "status" },
    ],
  },
  Collections: {
    table: "collection_facts_current",
    select: "date,method,amount,transaction_count",
    dateColumn: "date",
    defaultSort: "date",
    searchColumns: ["method"],
    columns: [
      { label: "Date", field: "date" },
      { label: "Method", field: "method" },
      { label: "Amount", field: "amount", format: "currency" },
      { label: "Transactions", field: "transaction_count" },
    ],
  },
  "Source Coverage": {
    table: "source_coverage_current",
    select: "label,role,coverage_start,coverage_end,status",
    defaultSort: "coverage_end",
    searchColumns: ["label", "role", "status"],
    columns: [
      { label: "Report", field: "label" },
      { label: "Role", field: "role" },
      { label: "Coverage Start", field: "coverage_start" },
      { label: "Coverage End", field: "coverage_end" },
      { label: "Status", field: "status" },
    ],
  },
};

const pageCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export async function fetchSupabaseDataPage(input: {
  name?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  direction?: string;
  search?: string;
  start: string;
  end: string;
}): Promise<SupabaseDataPage> {
  const name = DATA_PAGE_CONFIG[input.name ?? ""] ? input.name! : "Appointments";
  const config = DATA_PAGE_CONFIG[name];
  const pageSize = [10, 20, 50, 100].includes(Number(input.pageSize)) ? Number(input.pageSize) : 20;
  const page = Math.max(1, Number.parseInt(input.page ?? "1", 10) || 1);
  const direction = input.direction === "asc" ? "asc" : "desc";
  const sortColumn = config.columns.find((column) => column.label === input.sort);
  const sort = sortColumn?.label ?? config.columns.find((column) => column.field === config.defaultSort)?.label ?? config.columns[0].label;
  const sortField = sortColumn?.field ?? config.defaultSort;
  const search = (input.search ?? "").trim().slice(0, 100);
  const safeSearch = search.replace(/[,().]/g, " ").replace(/\s+/g, " ").trim();
  const from = (page - 1) * pageSize;
  let query = ttgReportingClient()
    .from(config.table)
    .select(config.select, { count: "exact" });
  if (config.dateColumn) query = query.gte(config.dateColumn, input.start).lte(config.dateColumn, input.end);
  if (safeSearch) query = query.or(config.searchColumns.map((column) => `${column}.ilike.%${safeSearch}%`).join(","));
  const { data, error, count } = await query
    .order(sortField, { ascending: direction === "asc", nullsFirst: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(`TTG ${name} data read failed: ${error.message}`);
  const rowCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  if (page > pageCount) {
    return fetchSupabaseDataPage({ ...input, name, page: String(pageCount), pageSize: String(pageSize) });
  }
  const rows = ((data ?? []) as unknown as DbRow[]).map((row) => Object.fromEntries(config.columns.map((column) => {
    const raw = row[column.field];
    const value = column.format === "currency"
      ? pageCurrency.format(number(raw))
      : column.format === "minutes"
        ? `${number(raw)} min`
        : text(raw);
    return [column.label, value];
  })));
  const tableCounts = Object.fromEntries(await Promise.all(Object.entries(DATA_PAGE_CONFIG).map(async ([tableName, tableConfig]) => {
    let countQuery = ttgReportingClient()
      .from(tableConfig.table)
      .select(tableConfig.columns[0].field, { count: "exact", head: true });
    if (tableConfig.dateColumn) countQuery = countQuery.gte(tableConfig.dateColumn, input.start).lte(tableConfig.dateColumn, input.end);
    const { error: countError, count: tableCount } = await countQuery;
    if (countError) throw new Error(`TTG ${tableName} count failed: ${countError.message}`);
    return [tableName, tableCount ?? 0];
  })));
  return {
    name,
    columns: config.columns.map((column) => column.label),
    rows,
    rowCount,
    tableCounts,
    page,
    pageSize,
    pageCount,
    sort,
    direction,
    search,
  };
}

async function allRows(table: string, order: string) {
  const rows: DbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await ttgReportingClient()
      .from(table)
      .select("*")
      .order(order, { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`TTG ${table} read failed: ${error.message}`);
    rows.push(...((data ?? []) as DbRow[]));
    if ((data ?? []).length < 1000) return rows;
  }
}

async function previewRows(table: string, order: string) {
  const { data, error, count } = await ttgReportingClient()
    .from(table)
    .select("*", { count: "exact" })
    .order(order, { ascending: false })
    .limit(250);
  if (error) throw new Error(`TTG ${table} preview failed: ${error.message}`);
  return { rows: (data ?? []) as DbRow[], count: count ?? (data ?? []).length };
}

const number = (value: unknown) => Number(value ?? 0);
const text = (value: unknown) => String(value ?? "");

function analyticsRow(row: DbRow): AnalyticsDailyRow {
  return {
    date: text(row.date),
    entity: text(row.entity) as AnalyticsDailyRow["entity"],
    name: text(row.name),
    appointments: number(row.appointments),
    completed: number(row.completed),
    cancelled: number(row.cancelled),
    noShows: number(row.no_shows),
    pending: number(row.pending),
    invoiced: number(row.invoiced),
    collected: number(row.collected),
    processed: number(row.processed),
    outstanding: number(row.outstanding),
    commission: number(row.commission),
    transactions: number(row.transactions),
    completedTransactions: number(row.completed_transactions),
    completedTransactionValue: number(row.completed_transaction_value),
    fees: number(row.fees),
    refunds: number(row.refunds),
    patients: number(row.patients),
    newPatients: number(row.new_patients),
    consultations: number(row.consultations),
    firstVisits: number(row.first_visits),
    subsequentVisits: number(row.subsequent_visits),
    bookedMinutes: number(row.booked_minutes),
    recovered: number(row.recovered),
    paymentLagDays: number(row.payment_lag_days),
    paymentLagSamples: number(row.payment_lag_samples),
  };
}

function cohortRow(row: DbRow): RetentionCohortRow {
  return {
    cohortMonth: text(row.cohort_month).slice(0, 7),
    entity: text(row.entity) as RetentionCohortRow["entity"],
    name: text(row.name),
    cohortSize: number(row.cohort_size),
    eligible30: number(row.eligible_30),
    retained30: number(row.retained_30),
    eligible60: number(row.eligible_60),
    retained60: number(row.retained_60),
    eligible90: number(row.eligible_90),
    retained90: number(row.retained_90),
    repeatPatients: number(row.repeat_patients),
    visitGapDays: number(row.visit_gap_days),
    visitGapSamples: number(row.visit_gap_samples),
  };
}

function monthlyFromAnalytics(
  analyticsRows: AnalyticsDailyRow[],
  stored: Map<string, DbRow>,
  latestPeriod: string,
) {
  const clinic = analyticsRows.filter((row) => row.entity === "clinic");
  const periods = new Map<string, AnalyticsDailyRow[]>();
  clinic.forEach((row) => {
    const key = row.date.slice(0, 7);
    periods.set(key, [...(periods.get(key) ?? []), row]);
  });
  return [...periods].sort(([left], [right]) => left.localeCompare(right)).map(([period, rows]): MonthlyMetric => {
    const aggregate = (key: keyof AnalyticsDailyRow) => rows.reduce((sum, row) => sum + number(row[key]), 0);
    const grossRevenue = aggregate("invoiced");
    const collectedRevenue = aggregate("collected");
    const backing = stored.get(period);
    const operatingExpenses = number(backing?.operating_expenses);
    const operatingProfit = backing ? number(backing.operating_profit) : collectedRevenue - operatingExpenses;
    const periodEnd = rows.map((row) => row.date).sort().at(-1) ?? `${period}-01`;
    return {
      period,
      status: period === latestPeriod ? "Partial" : "Complete",
      dataThrough: periodEnd,
      grossRevenue,
      collectedRevenue,
      collectionRate: grossRevenue ? collectedRevenue / grossRevenue : 0,
      outstandingBalance: aggregate("outstanding"),
      operatingExpenses,
      operatingProfit,
      profitMargin: collectedRevenue ? operatingProfit / collectedRevenue : 0,
      netCashFlow: number(backing?.net_cash_flow),
      marketingSpend: number(backing?.marketing_spend),
      marketingRatio: grossRevenue ? number(backing?.marketing_spend) / grossRevenue : 0,
      uncategorizedExpenses: number(backing?.uncategorized_expenses),
    };
  });
}

export async function fetchSupabaseDashboard(): Promise<TtgDashboardData> {
  const [
    analyticsDb,
    cohortsDb,
    monthlyDb,
    therapistsDb,
    expensesDb,
    runsDb,
    coverageDb,
    appointmentPreview,
    transactionPreview,
    salesPreview,
    collectionPreview,
    marketingDb,
    customDashboardDb,
    customWidgetDb,
    marketingNewClientDb,
  ] = await Promise.all([
    allRows("analytics_daily_current", "date"),
    allRows("retention_cohorts_current", "cohort_month"),
    allRows("monthly_metrics_current", "period_key"),
    allRows("therapist_metrics_current", "period_key"),
    allRows("expense_metrics_current", "period_key"),
    allRows("import_runs", "created_at"),
    allRows("source_coverage_current", "coverage_start"),
    previewRows("appointment_facts_current", "occurred_at"),
    previewRows("transaction_facts_current", "date"),
    previewRows("sales_facts_current", "date"),
    previewRows("collection_facts_current", "date"),
    allRows("marketing_campaigns", "start_date"),
    allRows("custom_dashboards", "created_at"),
    allRows("custom_widgets", "position"),
    allRows("marketing_new_clients_current", "date"),
  ]);
  const activeRuns = runsDb.filter((row) => !row.rolled_back_at);
  const latestRun = activeRuns.at(-1);
  if (!latestRun || !analyticsDb.length) throw new Error("TTG Supabase reporting has no published Jane history");
  const latestBankRun = [...activeRuns].reverse().find((row) => (
    number(row.bank_rows) > 0
    && text(row.bank_coverage) !== "Bank data unchanged"
  ));

  const analyticsRows = analyticsDb.map(analyticsRow);
  const cohortRows = cohortsDb.map(cohortRow);
  const latestPeriod = analyticsRows.map((row) => row.date.slice(0, 7)).sort().at(-1)!;
  const monthlyStored = new Map(monthlyDb.map((row) => [text(row.period_key), row]));
  const months = monthlyFromAnalytics(analyticsRows, monthlyStored, latestPeriod);
  const completeMonths = months.filter((row) => row.status === "Complete");
  const reportingPeriod = (completeMonths.at(-1) ?? months.at(-1))!.period;
  const capacityPeriod = therapistsDb
    .filter((row) => number(row.scheduled_hours) > 0)
    .map((row) => text(row.period_key))
    .sort()
    .at(-1) ?? latestPeriod;
  const currentTherapistRows = therapistsDb.filter((row) => text(row.period_key) === capacityPeriod);
  const therapistStored = new Map(currentTherapistRows.map((row) => [text(row.name), row]));
  const practitionerRows = analyticsRows.filter((row) => row.entity === "practitioner" && row.date.startsWith(capacityPeriod));
  const practitionerNames = new Set(practitionerRows.map((row) => row.name));
  const therapists: TherapistMetric[] = [...practitionerNames].map((name) => {
    const rows = practitionerRows.filter((row) => row.name === name);
    const aggregate = (key: keyof AnalyticsDailyRow) => rows.reduce((sum, row) => sum + number(row[key]), 0);
    const stored = therapistStored.get(name);
    const scheduledHours = number(stored?.scheduled_hours);
    const bookedHours = scheduledHours ? number(stored?.booked_hours) : aggregate("bookedMinutes") / 60;
    return {
      name,
      owner: Boolean(stored?.owner) || name.toLowerCase().includes("gabriella evans"),
      revenue: aggregate("invoiced"),
      collectedRevenue: aggregate("collected"),
      scheduledHours,
      bookedHours,
      availableHours: Math.max(0, scheduledHours - bookedHours),
      utilization: scheduledHours ? bookedHours / scheduledHours : 0,
      appointments: aggregate("appointments"),
      appointmentsPerWeek: aggregate("appointments") / (30 / 7),
    };
  }).filter((row) => row.revenue || row.appointments).sort((left, right) => right.revenue - left.revenue);
  const expenseRows = expensesDb.filter((row) => text(row.period_key) === reportingPeriod);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + number(row.amount), 0);
  const expenses: ExpenseMetric[] = expenseRows.map((row) => ({
    category: text(row.category),
    amount: number(row.amount),
    share: expenseTotal ? number(row.amount) / expenseTotal : 0,
  }));
  const latestChecks = Array.isArray(latestRun.checks) ? latestRun.checks as Array<Record<string, unknown>> : [];
  const latestBankChecks = latestBankRun && Array.isArray(latestBankRun.checks)
    ? (latestBankRun.checks as Array<Record<string, unknown>>).filter((row) => /bank|payout/i.test(text(row.check)))
    : [];
  const combinedChecks = new Map<string, Record<string, unknown>>();
  [...latestChecks, ...latestBankChecks].forEach((row) => combinedChecks.set(text(row.check), row));
  const qualityChecks = [...combinedChecks.values()].map((row) => ({
    check: text(row.check),
    status: text(row.status) as "PASS" | "WARNING" | "FAIL",
    actual: number(row.actual),
    expected: number(row.expected),
    difference: number(row.difference),
    notes: text(row.notes),
  }));
  const latestPayloadMeta = (latestRun.payload_meta ?? {}) as Record<string, unknown>;
  const analytics = latestPayloadMeta.analytics as TtgDashboardData["analytics"];
  const source: DashboardSource = {
    mode: "live",
    label: "Secure Supabase reporting store",
    refreshedAt: text(latestRun.created_at),
    fetchedAt: new Date().toISOString(),
    refreshedBy: text(latestRun.refreshed_by),
    refreshStatus: text(latestRun.status) as DashboardSource["refreshStatus"],
    refreshNotes: text((latestRun.issues as Array<Record<string, unknown>> | undefined)?.map((row) => row.title).join("; ")),
    janeDataThrough: text(latestRun.period_end),
    bankDataThrough: text(latestBankRun?.bank_coverage).match(/20\d{2}-\d{2}-\d{2}/g)?.at(-1) ?? "",
    bankCoverage: text(latestBankRun?.bank_coverage),
    bankRows: number(latestBankRun?.bank_rows),
  };
  const bookedHours = therapists.reduce((sum, item) => sum + item.bookedHours, 0);
  const scheduledHours = therapists.reduce((sum, item) => sum + item.scheduledHours, 0);
  const bookedAppointments = therapists.reduce((sum, item) => sum + item.appointments, 0);
  const ownerRevenue = therapists.filter((item) => item.owner).reduce((sum, item) => sum + item.revenue, 0);
  const clinicalMonth = months.find((row) => row.period === capacityPeriod) ?? months.at(-1)!;
  const payoutCheck = qualityChecks.find((check) => check.check.toLowerCase().includes("payout count"));
  const payoutValue = qualityChecks.find((check) => check.check.toLowerCase().includes("payout value"))?.actual ?? 0;
  const marketingCampaigns: MarketingCampaign[] = marketingDb
    .filter((row) => !row.archived_at)
    .map((row) => ({
      id: text(row.id),
      name: text(row.name),
      channel: text(row.channel),
      status: text(row.status),
      startDate: text(row.start_date),
      endDate: text(row.end_date),
      spend: number(row.spend),
      impressions: row.impressions == null ? undefined : number(row.impressions),
      clicks: row.clicks == null ? undefined : number(row.clicks),
      source: text(row.source),
    }))
    .sort((left, right) => right.startDate.localeCompare(left.startDate));
  const customDashboards: CustomDashboard[] = customDashboardDb
    .filter((row) => !row.deleted_at)
    .map((row) => ({
      id: text(row.id),
      name: text(row.name),
      description: text(row.description),
      isDefault: Boolean(row.is_default),
      pinned: Boolean(row.pinned),
      updatedAt: text(row.updated_at),
      widgets: customWidgetDb
        .filter((widget) => text(widget.dashboard_id) === text(row.id))
        .map((widget) => ({
          id: text(widget.id),
          position: number(widget.position),
          widgetType: text(widget.widget_type),
          title: text(widget.title),
          metricKey: text(widget.metric_key) || undefined,
          configuration: (widget.configuration ?? {}) as Record<string, unknown>,
        }))
        .sort((left, right) => left.position - right.position),
    }));
  const marketingNewClients = marketingNewClientDb.map((row) => ({
    date: text(row.date),
    channel: text(row.channel),
    clients: number(row.new_clients),
  }));

  return {
    ...ttgDashboardFixture,
    source,
    reportingPeriod,
    clinicalPeriod: capacityPeriod,
    months,
    therapists,
    expenses,
    qualityChecks,
    analytics,
    analyticsRows,
    cohortRows,
    marketingCampaigns,
    marketingNewClients,
    customDashboards,
    dataTables: [
      {
        name: "Appointments",
        columns: ["Date / Time", "Service", "Staff", "Status", "Duration", "Booking Source"],
        rowCount: appointmentPreview.count,
        rows: appointmentPreview.rows.map((row) => ({
          "Date / Time": text(row.occurred_at),
          Service: text(row.service),
          Staff: text(row.practitioner),
          Status: text(row.state),
          Duration: `${number(row.duration_minutes)} min`,
          "Booking Source": text(row.booking_source),
        })),
      },
      {
        name: "Transactions",
        columns: ["Date", "Practitioner", "Service", "Revenue", "Collected", "Commission", "Status"],
        rowCount: transactionPreview.count,
        rows: transactionPreview.rows.map((row) => ({
          Date: text(row.date),
          Practitioner: text(row.practitioner),
          Service: text(row.service),
          Revenue: String(number(row.revenue)),
          Collected: String(number(row.collected)),
          Commission: String(number(row.commission)),
          Status: text(row.status),
        })),
      },
      {
        name: "Sales",
        columns: ["Invoice Date", "Item", "Practitioner", "Payer", "Total", "Collected", "Status"],
        rowCount: salesPreview.count,
        rows: salesPreview.rows.map((row) => ({
          "Invoice Date": text(row.date),
          Item: text(row.item),
          Practitioner: text(row.practitioner),
          Payer: text(row.payer_category),
          Total: String(number(row.total)),
          Collected: String(number(row.collected)),
          Status: text(row.status),
        })),
      },
      {
        name: "Collections",
        columns: ["Date", "Method", "Amount", "Transactions"],
        rowCount: collectionPreview.count,
        rows: collectionPreview.rows.map((row) => ({
          Date: text(row.date),
          Method: text(row.method),
          Amount: String(number(row.amount)),
          Transactions: String(number(row.transaction_count)),
        })),
      },
      {
        name: "Source Coverage",
        columns: ["Report", "Role", "Coverage Start", "Coverage End", "Status"],
        rowCount: coverageDb.length,
        rows: coverageDb.map((row) => ({
          Report: text(row.label),
          Role: text(row.role),
          "Coverage Start": text(row.coverage_start),
          "Coverage End": text(row.coverage_end),
          Status: text(row.status),
        })),
      },
    ],
    summary: {
      activeTherapists: therapists.length,
      weightedUtilization: scheduledHours ? bookedHours / scheduledHours : 0,
      bookedHours,
      availableHours: Math.max(0, scheduledHours - bookedHours),
      revenuePerTherapist: therapists.length ? clinicalMonth.grossRevenue / therapists.length : 0,
      ownerRevenueShare: clinicalMonth.grossRevenue ? ownerRevenue / clinicalMonth.grossRevenue : 0,
      revenueWithoutOwner: clinicalMonth.grossRevenue - ownerRevenue,
      contractorCommissions: practitionerRows.reduce((sum, row) => sum + row.commission, 0),
      bookedAppointments,
      appointmentsPerTherapistWeek: therapists.length ? bookedAppointments / therapists.length / (30 / 7) : 0,
      payoutReconciliation: payoutCheck?.expected ? payoutCheck.actual / payoutCheck.expected : 0,
      payoutsMatched: payoutCheck?.actual ?? 0,
      payoutsExpected: payoutCheck?.expected ?? 0,
      payoutValue,
      outstandingBalance: clinicalMonth.outstandingBalance,
    },
  };
}
