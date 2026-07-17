import assert from "node:assert/strict";
import test from "node:test";

import {
  followUpDueAt,
  followUpGuidance,
  nextFollowUpStep,
} from "./consulting-cadence";

test("advances the bounded follow-up sequence and stops after day 14", () => {
  assert.equal(nextFollowUpStep(0), 3);
  assert.equal(nextFollowUpStep(3), 7);
  assert.equal(nextFollowUpStep(7), 14);
  assert.equal(nextFollowUpStep(14), null);
});

test("adds follow-up intervals in UTC across month boundaries", () => {
  assert.equal(
    followUpDueAt("2026-07-31T23:30:00Z", 3),
    "2026-08-03T23:30:00.000Z",
  );
});

test("uses concrete guidance instead of a content-free check-in", () => {
  assert.doesNotMatch(followUpGuidance(3), /just checking in/i);
  assert.match(followUpGuidance(7), /proof asset/i);
  assert.match(followUpGuidance(14), /close-the-loop/i);
});
