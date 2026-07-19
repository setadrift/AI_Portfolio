import assert from "node:assert/strict";
import test from "node:test";

import { acquisitionMetrics, startOfTorontoWeek } from "./consulting-metrics";
import type { AcquisitionData, ConsultingOpportunityRecord } from "./acquisition";

test("computes Toronto Monday boundaries independently of the server timezone", () => {
  const previous = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    assert.equal(
      startOfTorontoWeek(new Date("2026-07-13T02:00:00Z")).toISOString(),
      "2026-07-06T04:00:00.000Z",
    );
    assert.equal(
      startOfTorontoWeek(new Date("2026-01-05T15:00:00Z")).toISOString(),
      "2026-01-05T05:00:00.000Z",
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("keeps early Monday UTC activity in the preceding Toronto week", () => {
  assert.equal(
    startOfTorontoWeek(new Date("2026-07-13T02:00:00Z")).toISOString(),
    "2026-07-06T04:00:00.000Z",
  );
  assert.equal(
    startOfTorontoWeek(new Date("2026-07-13T05:00:00Z")).toISOString(),
    "2026-07-13T04:00:00.000Z",
  );
});

test("counts funnel progress and keeps mixed-currency pipeline values separate", () => {
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
    messageAngle: "Offer one observation",
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
        estimatedValueCents: 200_000,
        currencyCode: "CAD",
      },
    ],
    activities: [{
      id: "activity-1",
      opportunityId: "2",
      partnerId: null,
      activityType: "email",
      channel: "email",
      occurredAt: "2026-07-13T14:00:00Z",
      summary: "Sent",
      outcome: null,
      externalReference: null,
      createdBy: "duncan",
    }],
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
  assert.equal(metrics.funnel.find((row) => row.from === "qualified")?.denominator, 3);
  assert.equal(metrics.funnel.find((row) => row.to === "contacted")?.numerator, 2);
  assert.deepEqual(metrics.pipelineByCurrency, { USD: 100_000, CAD: 200_000 });
});

test("classifies commitment due dates using Toronto's calendar day", () => {
  const commitment = {
    id: "commitment",
    legacyId: null,
    opportunityId: null,
    partnerId: null,
    assetId: null,
    projectId: null,
    commitmentType: "follow_up",
    title: "Follow up",
    status: "todo" as const,
    sequenceStep: null,
    completedAt: null,
    notes: "",
    createdAt: "2026-07-11T12:00:00Z",
    updatedAt: "2026-07-11T12:00:00Z",
  };
  const emptyData: AcquisitionData = {
    configured: true,
    opportunities: [],
    activities: [],
    commitments: [
      { ...commitment, id: "overdue", dueAt: "2026-07-11T12:00:00Z" },
      { ...commitment, id: "today", dueAt: "2026-07-12T12:00:00Z" },
      { ...commitment, id: "tomorrow", dueAt: "2026-07-13T12:00:00Z" },
    ],
    partners: [],
    proofAssets: [],
    offers: [],
    programs: [],
    projects: [],
    assetUses: [],
    weeklySnapshots: [],
  };

  const metrics = acquisitionMetrics(emptyData, new Date("2026-07-13T02:00:00Z"));
  assert.equal(metrics.overdueCommitments, 1);
  assert.equal(metrics.dueToday, 1);
});
