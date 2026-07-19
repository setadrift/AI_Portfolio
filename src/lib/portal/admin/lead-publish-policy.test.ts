import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLeadSourceIsNotOlder,
  automationRefreshMode,
  freshestLeadSource,
  isLeadReadyToPursue,
} from "./lead-publish-policy";

test("production refreshes published research instead of bundled local files", () => {
  assert.equal(automationRefreshMode("production"), "published");
  assert.equal(automationRefreshMode("development"), "local");
  assert.equal(automationRefreshMode("test"), "local");
});

test("older and undated lead sources cannot replace current research", () => {
  assert.throws(
    () =>
      assertLeadSourceIsNotOlder({
        sourceId: "automation",
        incomingGeneratedAt: "2026-07-13T13:20:35Z",
        existingGeneratedAt: "2026-07-15T13:20:23Z",
      }),
    /older research/,
  );
  assert.throws(
    () =>
      assertLeadSourceIsNotOlder({
        sourceId: "automation",
        incomingGeneratedAt: null,
        existingGeneratedAt: "2026-07-15T13:20:23Z",
      }),
    /undated digest/,
  );
  assert.doesNotThrow(() =>
    assertLeadSourceIsNotOlder({
      sourceId: "automation",
      incomingGeneratedAt: "2026-07-15T13:20:23Z",
      existingGeneratedAt: "2026-07-15T13:20:23Z",
    }),
  );
  assert.throws(
    () =>
      assertLeadSourceIsNotOlder({
        sourceId: "automation",
        incomingGeneratedAt: "2026-07-16T13:20:23Z",
        existingGeneratedAt: "corrupt-timestamp",
      }),
    /invalid existing timestamp/,
  );
  assert.throws(
    () =>
      assertLeadSourceIsNotOlder({
        sourceId: "automation",
        incomingGeneratedAt: "1970-01-01T00:00:00.000Z",
        existingGeneratedAt: "1970-01-02T00:00:00.000Z",
      }),
    /older research/,
  );
});

test("the portal selects the freshest durable source", () => {
  const source = freshestLeadSource([
    { id: "database", digest: { generatedAt: "2026-07-13T13:20:35Z" } },
    { id: "blob", status: { generatedAt: "2026-07-15T13:20:23Z" } },
  ]);
  assert.equal(source?.id, "blob");
  assert.equal(freshestLeadSource([null, undefined]), null);
});

test("Reddit discussions require verified paid-help intent before Ready", () => {
  assert.equal(
    isLeadReadyToPursue({
      sourceKind: "reddit",
      buyerQueue: "warm_reply",
      intent: "asking_how_to_solve_own_problem",
      consultingFit: "yes",
      askQuote: "How do you handle this?",
      replyAngle: "Offer a useful workflow pattern.",
      score: "4/5",
    }),
    false,
  );
  assert.equal(
    isLeadReadyToPursue({
      sourceKind: "reddit",
      buyerQueue: "active_lead",
      intent: "hiring_or_paid_help",
      consultingFit: "yes",
      askQuote: "I need someone to build this.",
      replyAngle: "Offer a paid workflow audit.",
      score: "5/5",
    }),
    true,
  );
  assert.equal(
    isLeadReadyToPursue({
      sourceKind: "automation",
      buyerQueue: "active_lead",
      recommendedAction: "apply",
      score: "5/5",
    }),
    true,
  );
});
