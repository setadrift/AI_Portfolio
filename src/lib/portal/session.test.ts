import assert from "node:assert/strict";
import test from "node:test";

import { signSession, verifySession } from "./session";

const SECRET = "unit-test-secret-that-is-at-least-32-characters";

test("round-trips a valid session and rejects tampering", async () => {
  const previous = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = SECRET;
  try {
    const token = await signSession({ sub: "duncan", client: "admin" });
    assert.deepEqual(await verifySession(token), { sub: "duncan", client: "admin" });
    const tamperAt = Math.floor(token.length / 2);
    const replacement = token[tamperAt] === "a" ? "b" : "a";
    assert.equal(await verifySession(`${token.slice(0, tamperAt)}${replacement}${token.slice(tamperAt + 1)}`), null);
  } finally {
    if (previous === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previous;
  }
});

test("refuses empty identity claims instead of creating an ambiguous session", async () => {
  const previous = process.env.PORTAL_SESSION_SECRET;
  process.env.PORTAL_SESSION_SECRET = SECRET;
  try {
    await assert.rejects(() => signSession({ sub: "   ", client: "admin" }), /non-empty/);
    await assert.rejects(() => signSession({ sub: "duncan", client: "" }), /non-empty/);
  } finally {
    if (previous === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previous;
  }
});

test("fails safely when the secret is missing or too short", async () => {
  const previous = process.env.PORTAL_SESSION_SECRET;
  delete process.env.PORTAL_SESSION_SECRET;
  try {
    await assert.rejects(() => signSession({ sub: "duncan", client: "admin" }), />= 32 chars/);
    assert.equal(await verifySession("not-a-token"), null);
  } finally {
    if (previous === undefined) delete process.env.PORTAL_SESSION_SECRET;
    else process.env.PORTAL_SESSION_SECRET = previous;
  }
});
