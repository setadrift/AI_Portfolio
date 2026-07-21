import assert from "node:assert/strict";
import test from "node:test";
import { ttgDashboardFixture } from "./dashboard-fixture";
import { validateDashboardData } from "./dashboard";

test("TTG fixture reconciles its source totals", () => {
  assert.equal(validateDashboardData(ttgDashboardFixture), ttgDashboardFixture);
});

test("TTG validation rejects therapist revenue mismatches", () => {
  const invalid = structuredClone(ttgDashboardFixture);
  invalid.therapists[0].revenue += 1;
  assert.throws(() => validateDashboardData(invalid), /does not reconcile/);
});
