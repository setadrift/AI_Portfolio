import assert from "node:assert/strict";
import test from "node:test";
import { assertLeadSourceIsNotOlder } from "./lead-source-freshness.mjs";

test("the standalone publisher rejects stale and undated research", () => {
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
});

test("the standalone publisher allows equal or newer research", () => {
  assert.doesNotThrow(() =>
    assertLeadSourceIsNotOlder({
      sourceId: "automation",
      incomingGeneratedAt: "2026-07-15T13:20:23Z",
      existingGeneratedAt: "2026-07-15T13:20:23Z",
    }),
  );
  assert.doesNotThrow(() =>
    assertLeadSourceIsNotOlder({
      sourceId: "automation",
      incomingGeneratedAt: "2026-07-16T13:20:23Z",
      existingGeneratedAt: "2026-07-15T13:20:23Z",
    }),
  );
});
