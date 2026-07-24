import assert from "node:assert/strict";
import test from "node:test";
import type { RefreshPayload } from "./dashboard-refresh";
import { buildMonthlyPublishRow, buildTherapistPublishRows, hasRetentionHistory } from "./google-sheets-refresh";

const header = ["Period Start", "Period", "Period Status", "Data Through", "Gross Revenue", "Outstanding Balance", "Collected Revenue", "Operating Expenses", "Estimated Operating Profit", "Estimated Profit Margin", "Cash Inflows", "Cash Outflows", "Net Cash Flow", "Uncategorized Expenses", "Payout Reconciliation", "Notes"];
const existing = ["2026-07-01", "July 2026 MTD", "Partial", "2026-07-17", 55_817, 4_162.41, 51_654.59, 69_329.01, -17_674.42, -0.342166, 60_000, 86_061.68, -26_061.68, 2_160.11, 0.75, "Prior full refresh"];

function payload(refreshType: "jane" | "full"): RefreshPayload {
  return {
    refreshId: "refresh-1", refreshType, periodKey: "2026-07", periodLabel: "July 2026 MTD", periodStart: "2026-07-01", periodEnd: "2026-07-21", periodStatus: "Partial",
    analyticsRows: [], cohortRows: [], fileSummaries: [], sourceCoverage: [], coverageCalendar: [], issues: [], bankRows: 0, bankCoverage: "Bank data unchanged",
    monthly: { grossRevenue: 70_000, collectedRevenue: 65_000, contractorCompensation: 0, grossProfit: 70_000, operatingExpenses: 0, operatingProfit: 0, cashInflows: 0, cashOutflows: 0, netCashFlow: 0, uncategorizedExpenses: 0, payoutReconciliation: 0 },
    therapists: [], expenses: [], payouts: [], reconciliation: [], checks: [],
  };
}

test("Jane-only monthly publishing preserves every bank-backed value", () => {
  const row = buildMonthlyPublishRow([header, existing], payload("jane"));
  assert.equal(row[header.indexOf("Gross Revenue")], 70_000);
  assert.equal(row[header.indexOf("Collected Revenue")], 65_000);
  assert.equal(row[header.indexOf("Operating Expenses")], 69_329.01);
  assert.equal(row[header.indexOf("Estimated Operating Profit")], -17_674.42);
  assert.equal(row[header.indexOf("Net Cash Flow")], -26_061.68);
  assert.equal(row[header.indexOf("Payout Reconciliation")], 0.75);
  assert.match(String(row[header.indexOf("Notes")]), /bank-backed values unchanged/);
});

test("core Jane publishing retains supplemental capacity until an Hours export is supplied", () => {
  const therapistHeader = ["Period Start", "Period Status", "Therapist", "Invoices", "Gross Revenue", "Collected Revenue", "Outstanding", "Scheduled Hours", "Booked Hours", "Utilization", "Booked Appointments", "Contractor Commission", "Owner Flag", "Revenue per Booked Hour", "Notes"];
  const existingTherapist = ["2026-07-01", "Partial", "Therapist A", 10, 1_500, 1_300, 200, 80, 52, 0.65, 10, 750, false, 28.85, "Prior refresh"];
  const next = payload("jane");
  next.sourceCoverage = [{ kind: "hours", label: "Hours Scheduled / Booked", role: "supplemental", start: "", end: "", status: "missing", note: "Not supplied" }];
  next.therapists = [{ name: "Therapist A", invoices: 12, invoiced: 1_800, collected: 1_600, scheduledHours: 0, bookedHours: 0, bookings: 12, compensation: 900, owner: false }];
  const [row] = buildTherapistPublishRows([therapistHeader, existingTherapist], next);
  assert.equal(row[therapistHeader.indexOf("Scheduled Hours")], 80);
  assert.equal(row[therapistHeader.indexOf("Booked Hours")], 52);
  assert.equal(row[therapistHeader.indexOf("Booked Appointments")], 12);
  assert.equal(row[therapistHeader.indexOf("Gross Revenue")], 1_800);
  assert.equal(row[therapistHeader.indexOf("Outstanding")], 200);
  assert.match(String(row[therapistHeader.indexOf("Notes")]), /retained/);
});

test("therapist publishing supports the live workbook's legacy column aliases", () => {
  const therapistHeader = ["Period Start", "Period Status", "Therapist", "Invoices", "Total Invoiced", "Collected In Period", "Collected As Of Today", "Outstanding", "Available Hours", "Scheduled Hours", "Booked Hours", "Utilization", "Total Bookings", "Compensation", "Owner Flag", "Revenue per Booked Hour", "Notes"];
  const next = payload("jane");
  next.sourceCoverage = [{ kind: "hours", label: "Hours Scheduled / Booked", role: "supplemental", start: "2026-07-01", end: "2026-07-21", status: "complete", note: "Supplied" }];
  next.therapists = [{ name: "Therapist A", invoices: 12, invoiced: 1_800, collected: 1_600, scheduledHours: 80, bookedHours: 52, bookings: 12, compensation: 900, owner: false }];
  const [row] = buildTherapistPublishRows([therapistHeader], next);
  assert.equal(row[therapistHeader.indexOf("Total Invoiced")], 1_800);
  assert.equal(row[therapistHeader.indexOf("Collected In Period")], 1_600);
  assert.equal(row[therapistHeader.indexOf("Collected As Of Today")], 1_600);
  assert.equal(row[therapistHeader.indexOf("Available Hours")], 80);
  assert.equal(row[therapistHeader.indexOf("Total Bookings")], 12);
  assert.equal(row[therapistHeader.indexOf("Compensation")], 900);
});

test("incremental appointment uploads cannot replace mature retention cohorts", () => {
  const next = payload("jane");
  next.cohortRows = [{ cohortMonth: "2026-07", entity: "clinic", name: "Clinic", cohortSize: 1, eligible30: 0, retained30: 0, eligible60: 0, retained60: 0, eligible90: 0, retained90: 0, repeatPatients: 0, visitGapDays: 0, visitGapSamples: 0 }];
  next.sourceCoverage = [{ kind: "appointments", label: "Appointments", role: "core", start: "2026-07-20", end: "2026-07-21", status: "complete", note: "Incremental refresh" }];
  assert.equal(hasRetentionHistory(next), false);
  next.sourceCoverage[0].start = "2025-01-01";
  assert.equal(hasRetentionHistory(next), true);
});
