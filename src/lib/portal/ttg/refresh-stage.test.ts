import assert from "node:assert/strict";
import test from "node:test";
import { signRefreshStage, verifyRefreshStage } from "./refresh-stage";

test("refresh stage tokens contain only a short private-stage reference", async () => {
  const previousSecret = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  try {
    const stage = {
      stageId: "7f68dff9-3306-4fe6-b7de-683a54b9197a",
      payloadSha256: "a".repeat(64),
      preparedBy: "duncan@duncananderson.ca",
    };
    const token = await signRefreshStage(stage);
    assert.ok(token.length < 2_000, `expected reference token, received ${token.length} characters`);
    assert.deepEqual(await verifyRefreshStage(token), stage);
  } finally {
    if (previousSecret === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previousSecret;
  }
});
