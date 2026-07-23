import type {
  DashboardSource,
  ExpenseMetric,
  MonthlyMetric,
  TherapistMetric,
  TtgDashboardData,
} from "./dashboard";
import type { AnalyticsDailyRow, RetentionCohortRow } from "./dashboard-refresh";
import { ttgDashboardFixture } from "./dashboard-fixture";
import { ttgReportingClient } from "./ttg-reporting-db";

type DbRow = Record<string, unknown>;

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
  ]);
  const activeRuns = runsDb.filter((row) => !row.rolled_back_at);
  const latestRun = activeRuns.at(-1);
  if (!latestRun || !analyticsDb.length) throw new Error("TTG Supabase reporting has no published Jane history");
  const latestBankRun = [...activeRuns].reverse().find((row) => (
    text(row.refresh_type) === "full"
    && number(row.bank_rows) > 0
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
