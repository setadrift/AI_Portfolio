import assert from "node:assert/strict";
import test from "node:test";
import { buildRefreshGuidance } from "./refresh-guidance";

test("TTG refresh guidance uses the full month through yesterday in Toronto", () => {
  const guidance = buildRefreshGuidance(
    { janeDataThrough: "2026-07-20", bankDataThrough: "2026-07-17" },
    new Date("2026-07-22T16:00:00Z"),
  );
  assert.deepEqual(guidance, {
    recommendedStart: "2026-07-01",
    recommendedEnd: "2026-07-21",
    janeThrough: "2026-07-20",
    bankThrough: "2026-07-17",
    janeGapStart: "2026-07-21",
    bankGapStart: "2026-07-18",
  });
});

test("TTG refresh guidance does not invent a freshness gap without source dates", () => {
  const guidance = buildRefreshGuidance(undefined, new Date("2026-08-01T03:00:00Z"));
  assert.equal(guidance.recommendedStart, "2026-07-01");
  assert.equal(guidance.recommendedEnd, "2026-07-30");
  assert.equal(guidance.janeGapStart, undefined);
  assert.equal(guidance.bankGapStart, undefined);
});
