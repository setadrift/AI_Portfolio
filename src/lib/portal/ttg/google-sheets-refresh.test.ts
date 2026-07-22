import assert from "node:assert/strict";
import test from "node:test";
import type { RefreshPayload } from "./dashboard-refresh";
import { buildMonthlyPublishRow } from "./google-sheets-refresh";

const header = ["Period Start", "Period", "Period Status", "Data Through", "Gross Revenue", "Outstanding Balance", "Collected Revenue", "Operating Expenses", "Estimated Operating Profit", "Estimated Profit Margin", "Cash Inflows", "Cash Outflows", "Net Cash Flow", "Uncategorized Expenses", "Payout Reconciliation", "Notes"];
const existing = ["2026-07-01", "July 2026 MTD", "Partial", "2026-07-17", 55_817, 4_162.41, 51_654.59, 69_329.01, -17_674.42, -0.342166, 60_000, 86_061.68, -26_061.68, 2_160.11, 0.75, "Prior full refresh"];

function payload(refreshType: "jane" | "full"): RefreshPayload {
  return {
    refreshId: "refresh-1", refreshType, periodKey: "2026-07", periodLabel: "July 2026 MTD", periodStart: "2026-07-01", periodEnd: "2026-07-21", periodStatus: "Partial",
    fileSummaries: [], sourceCoverage: [], coverageCalendar: [], issues: [], bankRows: 0, bankCoverage: "Bank data unchanged",
    monthly: { grossRevenue: 70_000, collectedRevenue: 65_000, operatingExpenses: 0, operatingProfit: 0, cashInflows: 0, cashOutflows: 0, netCashFlow: 0, uncategorizedExpenses: 0, payoutReconciliation: 0 },
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
