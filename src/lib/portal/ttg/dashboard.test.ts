import assert from "node:assert/strict";
import test from "node:test";
import { ttgDashboardFixture } from "./dashboard-fixture";
import { selectReportingMonth, validateDashboardData } from "./dashboard";
import { dashboardVisualIndex, gabbyMetricCoverage, getDashboardCopy, getOwnerActions, getSourceHealth, periodLabel } from "./dashboard-copy";

test("TTG fixture reconciles its source totals", () => {
  assert.equal(validateDashboardData(ttgDashboardFixture), ttgDashboardFixture);
});

test("TTG validation rejects therapist revenue mismatches", () => {
  const invalid = structuredClone(ttgDashboardFixture);
  invalid.therapists[0].revenue += 1;
  assert.throws(() => validateDashboardData(invalid), /does not reconcile/);
});

test("TTG reporting period ignores a newer partial month", () => {
  assert.equal(selectReportingMonth(ttgDashboardFixture.months).period, "June 2026");
});

test("TTG dashboard narrative is derived from the active data", () => {
  const copy = getDashboardCopy(ttgDashboardFixture);
  assert.match(copy.practice.title, /June/);
  assert.match(copy.practice.intro, /1\.9%/);
  assert.match(copy.capacity.intro, /35\.5%/);
  assert.match(copy.controls.title, /2 items to review/);
  assert.equal(copy.passes, 6);
  assert.equal(copy.warnings.length, 2);
});

test("TTG narrative changes when the underlying result changes", () => {
  const changed = structuredClone(ttgDashboardFixture);
  const june = changed.months.find((month) => month.period === changed.reportingPeriod)!;
  june.grossRevenue = 80_000;
  june.operatingProfit = -2_000;
  june.netCashFlow = -5_000;
  const copy = getDashboardCopy(changed);
  assert.equal(copy.practice.title, "June performance at a glance.");
  assert.match(copy.practice.intro, /-\$2K/);
});

test("partial periods are labelled as directional instead of compared with a full month", () => {
  const copy = getDashboardCopy(ttgDashboardFixture, "July 2026 MTD");
  assert.equal(copy.current.status, "Partial");
  assert.equal(copy.hasComparablePrior, false);
  assert.match(copy.practice.title, /through Jul 17, 2026/);
  assert.match(copy.practice.intro, /directional/i);
});

test("failed controls block reliance on the close", () => {
  const failed = structuredClone(ttgDashboardFixture);
  failed.qualityChecks[0].status = "FAIL";
  const copy = getDashboardCopy(failed);
  assert.equal(copy.failures.length, 1);
  assert.match(copy.controls.title, /Do not rely/);
  assert.equal(copy.passes, 5);
});

test("source health uses workbook cutoffs rather than page-fetch time", () => {
  const health = getSourceHealth(ttgDashboardFixture, new Date("2026-07-22T12:00:00Z"));
  assert.equal(health.gapDays, 3);
  assert.equal(health.ageDays, 5);
  assert.equal(health.tone, "attention");
});

test("owner review prioritizes source alignment, classification, and open capacity", () => {
  const actions = getOwnerActions(ttgDashboardFixture, new Date("2026-07-22T12:00:00Z"));
  assert.ok(actions.some((action) => /Align Jane and bank cutoffs/.test(action.title)));
  assert.ok(actions.some((action) => /Classify/.test(action.title)));
  assert.ok(actions.some((action) => /open capacity/.test(action.title)));
});

test("TTG source index covers Gabby's complete request", () => {
  const metrics = gabbyMetricCoverage.flatMap((group) => group.items);
  assert.equal(metrics.length, 53);
  assert.equal(new Set(metrics.map((item) => item.metric)).size, 53);
  assert.equal(dashboardVisualIndex.length, 10);
  assert.equal(metrics.find((item) => item.metric === "Current Cash Position")?.status, "not-available");
  assert.equal(metrics.find((item) => item.metric === "Gross Revenue")?.status, "shown");
  assert.equal(metrics.find((item) => item.metric === "Contractor Commissions / Therapist Payouts")?.status, "shown");
  assert.equal(metrics.find((item) => item.metric === "Total Appointments")?.status, "shown");
});

test("period labels do not depend on a fixed reporting year", () => {
  assert.equal(periodLabel("June 2026"), "June");
  assert.equal(periodLabel("January 2027 MTD"), "January MTD");
});
