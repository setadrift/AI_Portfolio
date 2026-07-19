import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSourceType, validateExtraction } from "./receipt-extraction";

const validPayload = {
  source_type: "receipt",
  vendor: " Corner Store ",
  date: "2026-07-17",
  amount: 12.34,
  property: null,
  work_description: "Supplies",
  line_items: ["  Paint  ", "", 17],
  recommended_destination: "Expenses",
  confidence: "high",
  recommended_action: " Review receipt ",
  missing_or_uncertain: ["  property  "],
  raw_summary: " Store receipt ",
};

test("normalizes a valid extraction without retaining dirty array values", () => {
  const result = validateExtraction(validPayload);
  assert.equal(result.vendor, "Corner Store");
  assert.deepEqual(result.line_items, ["Paint"]);
  assert.deepEqual(result.missing_or_uncertain, ["property"]);
  assert.equal(result.recommended_action, "Review receipt");
});

test("rejects invalid enums and required text while defaulting unknown form sources", () => {
  assert.equal(normalizeSourceType("unsupported"), "receipt");
  assert.throws(() => validateExtraction({ ...validPayload, confidence: "certain" }), /Invalid confidence/);
  assert.throws(() => validateExtraction({ ...validPayload, raw_summary: "   " }), /raw_summary/);
});

test("drops non-finite amounts instead of persisting poisoned numeric state", () => {
  assert.equal(validateExtraction({ ...validPayload, amount: Number.NaN }).amount, null);
  assert.equal(validateExtraction({ ...validPayload, amount: Number.POSITIVE_INFINITY }).amount, null);
});
