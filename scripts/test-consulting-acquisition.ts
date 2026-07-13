import assert from "node:assert/strict";
import { opportunityInputErrors } from "../src/lib/portal/admin/consulting-validation";
import {
  followUpDueAt,
  followUpGuidance,
  nextFollowUpStep,
} from "../src/lib/portal/admin/consulting-cadence";
import { acquisitionMetrics } from "../src/lib/portal/admin/consulting-metrics";
import type {
  AcquisitionData,
  ConsultingOpportunityRecord,
} from "../src/lib/portal/admin/acquisition";

const base: ConsultingOpportunityRecord = {
  id: "1",
  legacyId: null,
  opportunityType: "direct_client",
  stage: "qualified",
  name: "Buyer",
  organization: "Firm",
  contactEmail: null,
  contactUrl: null,
  painPoint: "Manual work",
  evidenceSummary: "Explicit request",
  messageAngle: "Offer one concrete implementation observation",
  sourceFamily: "reddit",
  sourceId: null,
  sourceLeadKey: null,
  primaryOfferId: null,
  estimatedValueCents: null,
  currencyCode: null,
  probabilityPercent: null,
  nextAction: "Reply",
  nextActionDueAt: "2026-07-14T13:00:00Z",
  lastContactAt: null,
  discoveryAt: null,
  proposalSentAt: null,
  proposalReference: null,
  closedAt: null,
  lossReason: null,
  notes: "",
  createdAt: "2026-07-13T12:00:00Z",
  updatedAt: "2026-07-13T12:00:00Z",
};
assert.deepEqual(opportunityInputErrors(base), []);
assert.match(
  opportunityInputErrors({ ...base, nextAction: null })[0],
  /next action/,
);
assert.match(
  opportunityInputErrors({
    ...base,
    stage: "proposal_sent",
    primaryOfferId: null,
  }).join(" "),
  /Proposal sent date/,
);
assert.match(
  opportunityInputErrors({ ...base, stage: "lost", lossReason: null })[0],
  /loss reason/,
);
assert.equal(nextFollowUpStep(3), 7);
assert.equal(nextFollowUpStep(14), null);
assert.equal(
  followUpDueAt("2026-07-13T12:00:00Z", 3).slice(0, 10),
  "2026-07-16",
);
assert.doesNotMatch(followUpGuidance(7), /just checking in/i);

const data: AcquisitionData = {
  configured: true,
  opportunities: [
    base,
    {
      ...base,
      id: "2",
      stage: "contacted",
      estimatedValueCents: 100_000,
      currencyCode: "USD",
    },
    {
      ...base,
      id: "3",
      stage: "proposal_sent",
      proposalSentAt: "2026-07-13T13:00:00Z",
      estimatedValueCents: 200_000,
      currencyCode: "CAD",
      primaryOfferId: "offer",
    },
  ],
  activities: [
    {
      id: "a",
      opportunityId: "2",
      partnerId: null,
      activityType: "email",
      channel: "email",
      occurredAt: "2026-07-13T14:00:00Z",
      summary: "Sent",
      outcome: null,
      externalReference: null,
      createdBy: "duncan",
    },
  ],
  commitments: [],
  partners: [],
  proofAssets: [],
  offers: [],
  programs: [],
  projects: [],
  assetUses: [],
  weeklySnapshots: [],
};
const metrics = acquisitionMetrics(data, new Date("2026-07-13T16:00:00Z"));
assert.equal(
  metrics.funnel.find((row) => row.from === "qualified")?.denominator,
  3,
);
assert.equal(
  metrics.funnel.find((row) => row.to === "contacted")?.numerator,
  2,
);
assert.deepEqual(metrics.pipelineByCurrency, { USD: 100_000, CAD: 200_000 });
console.log("consulting acquisition unit tests passed");
