import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RefreshPayload } from "./dashboard-refresh";

const SCHEMA = "ttg_reporting";
const CHUNK_SIZE = 500;

type TtgClient = SupabaseClient;

function adminKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasTtgReportingDatabase() {
  return Boolean(process.env.SUPABASE_URL && adminKey());
}

function client(): TtgClient {
  const url = process.env.SUPABASE_URL;
  const key = adminKey();
  if (!url || !key) throw new Error("TTG Supabase reporting access is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function db() {
  return client().schema(SCHEMA);
}

function hashPayload(payload: RefreshPayload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function insertChunks(table: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const { error } = await db().from(table).insert(rows.slice(index, index + CHUNK_SIZE));
    if (error) throw new Error(`TTG ${table} write failed: ${error.message}`);
  }
}

export async function stageRefresh(payload: RefreshPayload, preparedBy: string) {
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  const payloadSha256 = hashPayload(payload);
  const { data, error } = await db()
    .from("staged_refreshes")
    .insert({
      prepared_by: preparedBy,
      payload,
      payload_sha256: payloadSha256,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`TTG refresh staging failed: ${error?.message ?? "no stage returned"}`);
  return { stageId: String(data.id), payloadSha256 };
}

export type StoredRefreshStage = {
  stageId: string;
  payloadSha256: string;
  preparedBy: string;
};

async function loadStage(stage: StoredRefreshStage) {
  const { data, error } = await db()
    .from("staged_refreshes")
    .select("id, prepared_by, payload, payload_sha256, expires_at, consumed_at")
    .eq("id", stage.stageId)
    .single();
  if (error || !data) throw new Error("This refresh preview is no longer available.");
  if (data.prepared_by !== stage.preparedBy || data.payload_sha256 !== stage.payloadSha256) {
    throw new Error("This refresh preview is invalid.");
  }
  if (data.consumed_at) throw new Error("This refresh preview has already been published.");
  if (Date.parse(data.expires_at) <= Date.now()) throw new Error("This refresh preview expired. Review the files again.");
  const payload = data.payload as RefreshPayload;
  if (hashPayload(payload) !== stage.payloadSha256) throw new Error("This refresh preview failed its integrity check.");
  return payload;
}

const overallStatus = (payload: RefreshPayload) => (
  payload.checks.some((row) => row.status === "FAIL") || payload.issues.some((row) => row.status === "FAIL")
    ? "FAIL"
    : payload.refreshType === "jane"
      || payload.checks.some((row) => row.status === "WARNING")
      || payload.issues.some((row) => row.status === "WARNING")
      ? "WARNING"
      : "PASS"
);

function analyticsRecord(importId: string, row: RefreshPayload["analyticsRows"][number]) {
  return {
    import_id: importId,
    date: row.date,
    entity: row.entity,
    name: row.name,
    appointments: row.appointments,
    completed: row.completed,
    cancelled: row.cancelled,
    no_shows: row.noShows,
    pending: row.pending,
    invoiced: row.invoiced,
    collected: row.collected,
    processed: row.processed,
    outstanding: row.outstanding,
    commission: row.commission,
    transactions: row.transactions,
    completed_transactions: row.completedTransactions,
    completed_transaction_value: row.completedTransactionValue,
    fees: row.fees,
    refunds: row.refunds,
    patients: row.patients,
    new_patients: row.newPatients,
    consultations: row.consultations,
    first_visits: row.firstVisits,
    subsequent_visits: row.subsequentVisits,
    booked_minutes: row.bookedMinutes,
    recovered: row.recovered,
    payment_lag_days: row.paymentLagDays,
    payment_lag_samples: row.paymentLagSamples,
  };
}

export async function publishStagedRefresh(
  stage: StoredRefreshStage,
  refreshedBy: string,
  acknowledgeWarnings = false,
) {
  const payload = await loadStage(stage);
  if (payload.issues.some((issue) => issue.status === "FAIL") || payload.checks.some((check) => check.status === "FAIL")) {
    throw new Error("Publishing is blocked until every failed check is fixed.");
  }
  if (
    (payload.issues.some((issue) => issue.status === "WARNING")
      || payload.checks.some((check) => check.status === "WARNING"))
    && !acknowledgeWarnings
  ) {
    throw new Error("Acknowledge the review items before publishing.");
  }
  const analyticsDates = payload.analyticsRows.map((row) => row.date).filter(Boolean).sort();
  const stagedAt = new Date().toISOString();
  const status = overallStatus(payload);
  const { error: runError } = await db().from("import_runs").insert({
    id: payload.refreshId,
    refreshed_by: refreshedBy,
    refresh_type: payload.refreshType,
    period_key: payload.periodKey,
    period_label: payload.periodLabel,
    period_start: payload.periodStart,
    period_end: payload.periodEnd,
    period_status: payload.periodStatus,
    analytics_start: analyticsDates[0] ?? payload.periodStart,
    analytics_end: analyticsDates.at(-1) ?? payload.periodEnd,
    status,
    file_summaries: payload.fileSummaries,
    issues: payload.issues,
    checks: payload.checks,
    bank_rows: payload.bankRows,
    bank_coverage: payload.bankCoverage,
    payload_meta: {
      analytics: payload.analytics,
      payouts: payload.payouts,
      reconciliation: payload.reconciliation,
      coverageCalendar: payload.coverageCalendar,
    },
    rolled_back_at: stagedAt,
    rolled_back_by: "publish-in-progress",
  });
  if (runError) throw new Error(`TTG import run write failed: ${runError.message}`);

  try {
    let priorBank: Record<string, number> | undefined;
    const hoursSupplied = payload.sourceCoverage.some((source) => source.kind === "hours" && source.status !== "missing");
    const priorTherapists = new Map<string, Record<string, unknown>>();
    if (payload.refreshType === "jane") {
      const { data } = await db()
        .from("monthly_metrics_current")
        .select("operating_expenses, operating_profit, profit_margin, net_cash_flow, marketing_spend, marketing_ratio, uncategorized_expenses")
        .eq("period_key", payload.periodKey)
        .maybeSingle();
      priorBank = data as Record<string, number> | undefined;
    }
    if (!hoursSupplied) {
      const { data, error } = await db()
        .from("therapist_metrics_current")
        .select("name, scheduled_hours, booked_hours")
        .eq("period_key", payload.periodKey);
      if (error) throw new Error(`TTG prior capacity read failed: ${error.message}`);
      (data ?? []).forEach((row) => priorTherapists.set(row.name.toLowerCase(), row));
    }

    await insertChunks("source_coverage", payload.sourceCoverage.map((row) => ({
      import_id: payload.refreshId,
      kind: row.kind,
      label: row.label,
      role: row.role,
      coverage_start: row.start || null,
      coverage_end: row.end || null,
      status: row.status,
      note: row.note,
    })));
    await insertChunks("analytics_daily", payload.analyticsRows.map((row) => analyticsRecord(payload.refreshId, row)));
    await insertChunks("retention_cohorts", payload.cohortRows.map((row) => ({
      import_id: payload.refreshId,
      cohort_month: `${row.cohortMonth}-01`,
      entity: row.entity,
      name: row.name,
      cohort_size: row.cohortSize,
      eligible_30: row.eligible30,
      retained_30: row.retained30,
      eligible_60: row.eligible60,
      retained_60: row.retained60,
      eligible_90: row.eligible90,
      retained_90: row.retained90,
      repeat_patients: row.repeatPatients,
      visit_gap_days: row.visitGapDays,
      visit_gap_samples: row.visitGapSamples,
    })));

    const grossRevenue = payload.monthly.grossRevenue;
    const collectedRevenue = payload.monthly.collectedRevenue;
    const bankValue = (key: string, fallback: number) => payload.refreshType === "jane"
      ? Number(priorBank?.[key] ?? fallback)
      : fallback;
    await insertChunks("monthly_metrics", [{
      import_id: payload.refreshId,
      period_key: payload.periodKey,
      status: payload.periodStatus,
      data_through: payload.periodEnd,
      gross_revenue: grossRevenue,
      collected_revenue: collectedRevenue,
      collection_rate: grossRevenue ? collectedRevenue / grossRevenue : 0,
      outstanding_balance: Math.max(0, grossRevenue - collectedRevenue),
      operating_expenses: bankValue("operating_expenses", 0),
      operating_profit: bankValue("operating_profit", collectedRevenue),
      profit_margin: bankValue("profit_margin", collectedRevenue ? 1 : 0),
      net_cash_flow: bankValue("net_cash_flow", 0),
      marketing_spend: bankValue("marketing_spend", 0),
      marketing_ratio: bankValue("marketing_ratio", 0),
      uncategorized_expenses: bankValue("uncategorized_expenses", 0),
    }]);
    await insertChunks("therapist_metrics", payload.therapists.map((row) => {
      const prior = priorTherapists.get(row.name.toLowerCase());
      return {
        import_id: payload.refreshId,
        period_key: payload.periodKey,
        name: row.name,
        owner: row.owner,
        invoices: row.invoices,
        invoiced: row.invoiced,
        collected: row.collected,
        scheduled_hours: hoursSupplied ? row.scheduledHours : Number(prior?.scheduled_hours ?? 0),
        booked_hours: hoursSupplied ? row.bookedHours : Number(prior?.booked_hours ?? 0),
        bookings: row.bookings,
        compensation: row.compensation,
      };
    }));
    if (payload.refreshType === "full") {
      await insertChunks("expense_metrics", payload.expenses.map((row) => ({
        import_id: payload.refreshId,
        period_key: payload.periodKey,
        category: row.category,
        amount: row.amount,
      })));
    }
    await insertChunks("quality_checks", payload.checks.map((row, ordinal) => ({
      import_id: payload.refreshId,
      ordinal,
      check_name: row.check,
      actual: row.actual,
      expected: row.expected,
      difference: row.difference,
      tolerance: row.tolerance,
      status: row.status,
      notes: row.notes,
    })));
    await insertChunks("appointment_facts", (payload.privateFacts?.appointments ?? []).map((row) => ({
      import_id: payload.refreshId,
      record_key: row.recordKey,
      occurred_at: row.occurredAt,
      date: row.date,
      service: row.service,
      practitioner: row.practitioner,
      state: row.state,
      duration_minutes: row.durationMinutes,
      booking_source: row.bookingSource,
      patient_key: row.patientKey,
      first_visit: row.firstVisit,
      consultation: row.consultation,
      recovered: row.recovered,
    })));
    await insertChunks("transaction_facts", (payload.privateFacts?.transactions ?? []).map((row) => ({
      import_id: payload.refreshId,
      record_key: row.recordKey,
      date: row.date,
      practitioner: row.practitioner,
      service: row.service,
      revenue: row.revenue,
      collected: row.collected,
      commission: row.commission,
      payment_method: row.paymentMethod,
      status: row.status,
      patient_key: row.patientKey,
    })));
    await insertChunks("sales_facts", (payload.privateFacts?.sales ?? []).map((row) => ({
      import_id: payload.refreshId,
      record_key: row.recordKey,
      date: row.date,
      invoice_key: row.invoiceKey,
      item: row.item,
      practitioner: row.practitioner,
      payer_category: row.payerCategory,
      status: row.status,
      subtotal: row.subtotal,
      total: row.total,
      collected: row.collected,
      outstanding: row.outstanding,
    })));
    await insertChunks("collection_facts", (payload.privateFacts?.collections ?? []).map((row) => ({
      import_id: payload.refreshId,
      record_key: row.recordKey,
      date: row.date,
      method: row.method,
      amount: row.amount,
      transaction_count: row.transactionCount,
    })));

    const { error: activateError } = await db()
      .from("import_runs")
      .update({ rolled_back_at: null, rolled_back_by: null })
      .eq("id", payload.refreshId);
    if (activateError) throw new Error(`TTG import activation failed: ${activateError.message}`);
    const { error: consumedError } = await db()
      .from("staged_refreshes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", stage.stageId);
    if (consumedError) throw new Error(`TTG staged refresh cleanup failed: ${consumedError.message}`);
    return {
      refreshId: payload.refreshId,
      status,
      period: payload.periodLabel,
      publishedAt: new Date().toISOString(),
    };
  } catch (error) {
    await db().from("import_runs").delete().eq("id", payload.refreshId);
    throw error;
  }
}

export type RefreshHistoryItem = {
  refreshId: string;
  publishedAt: string;
  refreshedBy: string;
  period: string;
  status: string;
  active: boolean;
};

export async function getSupabaseRefreshHistory(): Promise<RefreshHistoryItem[]> {
  const { data, error } = await db()
    .from("import_runs")
    .select("id, created_at, refreshed_by, period_key, status, rolled_back_at")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(`TTG refresh history read failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    refreshId: row.id,
    publishedAt: row.created_at,
    refreshedBy: row.refreshed_by,
    period: row.period_key,
    status: row.status,
    active: !row.rolled_back_at,
  }));
}

export async function rollbackSupabaseRefresh(refreshId: string, refreshedBy: string) {
  const { data: target, error: targetError } = await db()
    .from("import_runs")
    .select("id, period_key, created_at")
    .eq("id", refreshId)
    .single();
  if (targetError || !target) throw new Error("That refresh snapshot is no longer available.");
  const now = new Date().toISOString();
  const { error: newerError } = await db()
    .from("import_runs")
    .update({ rolled_back_at: now, rolled_back_by: `${refreshedBy} (restore ${refreshId})` })
    .eq("period_key", target.period_key)
    .gt("created_at", target.created_at)
    .is("rolled_back_at", null);
  if (newerError) throw new Error(`TTG restore failed: ${newerError.message}`);
  const { error: targetRestoreError } = await db()
    .from("import_runs")
    .update({ rolled_back_at: null, rolled_back_by: null })
    .eq("id", refreshId);
  if (targetRestoreError) throw new Error(`TTG restore failed: ${targetRestoreError.message}`);
  return {
    refreshId,
    status: "WARNING",
    period: target.period_key,
    publishedAt: now,
  };
}

export function ttgReportingClient() {
  return db();
}
