import assert from "node:assert/strict";
import test from "node:test";
import { ttgDashboardFixture } from "./dashboard-fixture";
import { validateDashboardData } from "./dashboard";
import { dashboardVisualIndex, gabbyMetricCoverage, getDashboardCopy, periodLabel } from "./dashboard-copy";

test("TTG fixture reconciles its source totals", () => {
  assert.equal(validateDashboardData(ttgDashboardFixture), ttgDashboardFixture);
});

test("TTG validation rejects therapist revenue mismatches", () => {
  const invalid = structuredClone(ttgDashboardFixture);
  invalid.therapists[0].revenue += 1;
  assert.throws(() => validateDashboardData(invalid), /does not reconcile/);
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

test("TTG source index covers Gabby's complete request", () => {
  const metrics = gabbyMetricCoverage.flatMap((group) => group.items);
  assert.equal(metrics.length, 53);
  assert.equal(new Set(metrics.map((item) => item.metric)).size, 53);
  assert.equal(dashboardVisualIndex.length, 8);
  assert.equal(metrics.find((item) => item.metric === "Current Cash Position")?.status, "not-available");
  assert.equal(metrics.find((item) => item.metric === "Gross Revenue")?.status, "shown");
});

test("period labels do not depend on a fixed reporting year", () => {
  assert.equal(periodLabel("June 2026"), "June");
  assert.equal(periodLabel("January 2027 MTD"), "January MTD");
});
