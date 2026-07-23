import assert from "node:assert/strict";
import test from "node:test";
import {
  rangeContains,
  resolveDashboardRange,
  retentionCohortWindow,
  retentionDisplayWindow,
} from "./dashboard-period";

test("dashboard month range follows the latest published Jane date", () => {
  const range = resolveDashboardRange({ period: "month" }, "2026-07-23");
  assert.deepEqual(range, {
    kind: "month",
    start: "2026-07-01",
    end: "2026-07-23",
    label: "July 2026",
    offset: 0,
  });
  assert.equal(rangeContains("2026-07-23", range), true);
  assert.equal(rangeContains("2026-08-01", range), false);
});

test("dashboard navigation moves through complete calendar quarters", () => {
  const range = resolveDashboardRange({ period: "quarter", offset: "1" }, "2026-07-23");
  assert.equal(range.start, "2026-04-01");
  assert.equal(range.end, "2026-06-30");
  assert.equal(range.label, "Q2 2026");
});

test("dashboard accepts an explicit custom range", () => {
  const range = resolveDashboardRange({ from: "2025-03-10", to: "2025-04-12" }, "2026-07-23");
  assert.equal(range.kind, "custom");
  assert.equal(range.start, "2025-03-10");
  assert.equal(range.end, "2025-04-12");
});

test("retention uses AdminFlow's six fully mature cohort windows", () => {
  const range = resolveDashboardRange({ from: "2026-07-01", to: "2026-07-16" }, "2026-07-23");
  assert.deepEqual(retentionCohortWindow(range, 30), { start: "2025-12", end: "2026-05" });
  assert.deepEqual(retentionCohortWindow(range, 60), { start: "2025-11", end: "2026-04" });
  assert.deepEqual(retentionCohortWindow(range, 90), { start: "2025-10", end: "2026-03" });
  assert.deepEqual(retentionDisplayWindow(range), { start: "2025-07", end: "2026-06" });
});
