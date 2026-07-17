import assert from "node:assert/strict";
import test from "node:test";

import type { ConsultingOpportunityRecord } from "./acquisition";
import { opportunityInputErrors } from "./consulting-validation";

const validOpportunity: Partial<ConsultingOpportunityRecord> = {
  opportunityType: "direct_client",
  stage: "qualified",
  name: "Buyer",
  organization: "Firm",
  estimatedValueCents: 125_000,
  probabilityPercent: 50,
  nextAction: "Reply",
  nextActionDueAt: "2026-07-18T13:00:00Z",
};

test("accepts boundary numeric values and a complete active opportunity", () => {
  assert.deepEqual(opportunityInputErrors({
    ...validOpportunity,
    estimatedValueCents: 0,
    probabilityPercent: 0,
  }), []);
  assert.deepEqual(opportunityInputErrors({ ...validOpportunity, probabilityPercent: 100 }), []);
});

test("rejects non-finite or fractional values that would corrupt pipeline metrics", () => {
  for (const estimatedValueCents of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    assert.match(
      opportunityInputErrors({ ...validOpportunity, estimatedValueCents }).join(" "),
      /whole number of cents/,
    );
  }
  for (const probabilityPercent of [Number.NaN, Number.NEGATIVE_INFINITY, 50.5]) {
    assert.match(
      opportunityInputErrors({ ...validOpportunity, probabilityPercent }).join(" "),
      /whole number between 0 and 100/,
    );
  }
});

test("rejects malformed workflow dates before they reach persistence", () => {
  assert.match(
    opportunityInputErrors({ ...validOpportunity, nextActionDueAt: "tomorrow-ish" }).join(" "),
    /valid next-action due date/,
  );
  assert.match(
    opportunityInputErrors({
      ...validOpportunity,
      stage: "proposal_sent",
      proposalSentAt: "not-a-date",
      currencyCode: "CAD",
      primaryOfferId: "custom",
      proposalReference: "proposal-1",
    }).join(" "),
    /valid proposal sent date/,
  );
});
