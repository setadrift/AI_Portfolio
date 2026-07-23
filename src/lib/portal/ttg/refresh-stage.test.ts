import assert from "node:assert/strict";
import test from "node:test";
import type { RefreshPayload } from "./dashboard-refresh";
import { signRefreshStage, verifyRefreshStage } from "./refresh-stage";

test("large aggregate refresh stages are compressed and round-trip safely", async () => {
  const previousSecret = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  try {
    const payload = {
      refreshId: "refresh-history",
      analyticsRows: Array.from({ length: 15_000 }, (_, index) => ({
        date: `2026-07-${String(index % 22 + 1).padStart(2, "0")}`,
        entity: "clinic",
        name: "Clinic",
        appointments: index % 5,
        completed: index % 4,
      })),
      cohortRows: Array.from({ length: 300 }, (_, index) => ({
        cohortMonth: `2025-${String(index % 12 + 1).padStart(2, "0")}`,
        entity: "clinic",
        name: "Clinic",
        cohortSize: index % 20,
      })),
    } as unknown as RefreshPayload;
    const stage = { payload, workbookFingerprint: "fingerprint", preparedBy: "duncan@duncananderson.ca" };
    const token = await signRefreshStage(stage);
    assert.ok(token.length < 250_000, `expected compressed token, received ${token.length} characters`);
    assert.deepEqual(await verifyRefreshStage(token), stage);
  } finally {
    if (previousSecret === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previousSecret;
  }
});
