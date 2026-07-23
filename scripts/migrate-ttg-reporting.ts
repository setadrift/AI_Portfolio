import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { buildRefreshPayload } from "../src/lib/portal/ttg/dashboard-refresh";
import { publishStagedRefresh, stageRefresh } from "../src/lib/portal/ttg/ttg-reporting-db";

const downloads = process.env.TTG_MIGRATION_SOURCE_DIR || "/Users/duncananderson/Downloads";
const dryRun = process.argv.includes("--dry-run");
const migrationRpc = process.argv.includes("--migration-rpc");
const factsOnly = process.argv.includes("--facts-only");

const exact = new Set([
  "TheTraumaTherapyGroup_Appointments_20250101_20251231.csv",
  "TheTraumaTherapyGroup_Appointments_20260101_20260723.csv",
  "Compensation_Report_Details_20260723.csv",
  "Compensation_Report_Details_20260723 (1).csv",
  "Sales_20250101_20251231.csv",
  "Sales_20260101_20260723.csv",
]);

async function main() {
  const names = (await readdir(downloads))
    .filter((name) => exact.has(name) || /^Daily_Transaction_Report_20260723_(?:074\d{3}|082748)\.csv$/.test(name))
    .sort();

  if (names.length !== 18) {
    throw new Error(`Expected 18 historical Jane CSV segments, found ${names.length}: ${names.join(", ")}`);
  }

  const files = await Promise.all(names.map(async (name) => ({
    name: basename(name),
    text: await readFile(join(downloads, name), "utf8"),
  })));
  const payload = buildRefreshPayload(files);
  if (factsOnly) {
    const importId = process.env.TTG_MIGRATION_IMPORT_ID;
    if (!importId) throw new Error("TTG_MIGRATION_IMPORT_ID is required for --facts-only.");
    payload.refreshId = importId;
  }
  const summary = {
    files: payload.fileSummaries.length,
    period: payload.periodLabel,
    periodEnd: payload.periodEnd,
    analyticsRows: payload.analyticsRows.length,
    cohortRows: payload.cohortRows.length,
    sourceCoverage: payload.sourceCoverage.map((row) => ({
      source: row.label,
      start: row.start,
      end: row.end,
      status: row.status,
    })),
    issues: payload.issues,
    checks: payload.checks,
    payloadBytes: Buffer.byteLength(JSON.stringify(payload)),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (dryRun) return;
  if (payload.issues.some((issue) => issue.status === "FAIL")) {
    throw new Error("Historical migration has blocking source issues.");
  }
  const preparedBy = "duncan@duncananderson.ca (historical migration)";
  if (migrationRpc) {
    const url = process.env.TTG_MIGRATION_SUPABASE_URL;
    const apiKey = process.env.TTG_MIGRATION_PUBLISHABLE_KEY;
    const token = process.env.TTG_MIGRATION_TOKEN;
    if (!url || !apiKey || !token) throw new Error("One-time migration RPC credentials are missing.");
    const call = async (table: string, rows: Array<Record<string, unknown>>) => {
      for (let index = 0; index < rows.length; index += 350) {
        const response = await fetch(`${url}/rest/v1/rpc/ttg_migration_ingest`, {
          method: "POST",
          headers: {
            apikey: apiKey,
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ p_token: token, p_table: table, p_rows: rows.slice(index, index + 350) }),
        });
        if (!response.ok) throw new Error(`${table} migration failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
      }
    };
    const now = new Date().toISOString();
    const analyticsDates = payload.analyticsRows.map((row) => row.date).sort();
    if (!factsOnly) await call("import_runs", [{
      id: payload.refreshId,
      created_at: now,
      refreshed_by: preparedBy,
      refresh_type: payload.refreshType,
      period_key: payload.periodKey,
      period_label: payload.periodLabel,
      period_start: payload.periodStart,
      period_end: payload.periodEnd,
      period_status: payload.periodStatus,
      analytics_start: analyticsDates[0] ?? payload.periodStart,
      analytics_end: analyticsDates.at(-1) ?? payload.periodEnd,
      status: "WARNING",
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
      rolled_back_at: now,
      rolled_back_by: "historical-migration-in-progress",
    }]);
    if (!factsOnly) await call("source_coverage", payload.sourceCoverage.map((row) => ({
      import_id: payload.refreshId,
      kind: row.kind,
      label: row.label,
      role: row.role,
      coverage_start: row.start || null,
      coverage_end: row.end || null,
      status: row.status,
      note: row.note,
    })));
    if (!factsOnly) await call("analytics_daily", payload.analyticsRows.map((row) => ({
      import_id: payload.refreshId,
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
    })));
    if (!factsOnly) await call("retention_cohorts", payload.cohortRows.map((row) => ({
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
    if (!factsOnly) await call("monthly_metrics", [{
      import_id: payload.refreshId,
      period_key: payload.periodKey,
      status: payload.periodStatus,
      data_through: payload.periodEnd,
      gross_revenue: payload.monthly.grossRevenue,
      collected_revenue: payload.monthly.collectedRevenue,
      collection_rate: payload.monthly.grossRevenue ? payload.monthly.collectedRevenue / payload.monthly.grossRevenue : 0,
      outstanding_balance: Math.max(0, payload.monthly.grossRevenue - payload.monthly.collectedRevenue),
      operating_expenses: 0,
      operating_profit: payload.monthly.collectedRevenue,
      profit_margin: payload.monthly.collectedRevenue ? 1 : 0,
      net_cash_flow: 0,
      marketing_spend: 0,
      marketing_ratio: 0,
      uncategorized_expenses: 0,
    }]);
    if (!factsOnly) await call("therapist_metrics", payload.therapists.map((row) => ({
      import_id: payload.refreshId,
      period_key: payload.periodKey,
      name: row.name,
      owner: row.owner,
      invoices: row.invoices,
      invoiced: row.invoiced,
      collected: row.collected,
      scheduled_hours: row.scheduledHours,
      booked_hours: row.bookedHours,
      bookings: row.bookings,
      compensation: row.compensation,
    })));
    if (!factsOnly) await call("quality_checks", payload.checks.map((row, ordinal) => ({
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
    await call("appointment_facts", (payload.privateFacts?.appointments ?? []).map((row) => ({
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
    await call("transaction_facts", (payload.privateFacts?.transactions ?? []).map((row) => ({
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
    await call("sales_facts", (payload.privateFacts?.sales ?? []).map((row) => ({
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
    await call("collection_facts", (payload.privateFacts?.collections ?? []).map((row) => ({
      import_id: payload.refreshId,
      record_key: row.recordKey,
      date: row.date,
      method: row.method,
      amount: row.amount,
      transaction_count: row.transactionCount,
    })));
    if (!factsOnly) await call("activate", [{ id: payload.refreshId }]);
    process.stdout.write(`${JSON.stringify({ refreshId: payload.refreshId, status: "WARNING", period: payload.periodLabel, publishedAt: now }, null, 2)}\n`);
    return;
  }
  const stored = await stageRefresh(payload, preparedBy);
  const receipt = await publishStagedRefresh({ ...stored, preparedBy }, preparedBy, true);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
