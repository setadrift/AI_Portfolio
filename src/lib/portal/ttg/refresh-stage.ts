import { deflateRawSync, inflateRawSync } from "node:zlib";
import { SignJWT, jwtVerify } from "jose";
import type { RefreshPayload } from "./dashboard-refresh";

export type RefreshStage = {
  payload: RefreshPayload;
  workbookFingerprint: string;
  preparedBy: string;
};

function stageSecret() {
  const raw = process.env.PORTAL_SESSION_SECRET;
  if (!raw || raw.length < 32) throw new Error("PORTAL_SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(raw);
}

export async function signRefreshStage(stage: RefreshStage) {
  const compressedStage = deflateRawSync(Buffer.from(JSON.stringify(stage))).toString("base64url");
  return new SignJWT({ compressedStage, purpose: "ttg-dashboard-refresh", version: 2 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(stageSecret());
}

export async function verifyRefreshStage(token: string): Promise<RefreshStage> {
  const { payload } = await jwtVerify(token, stageSecret(), { algorithms: ["HS256"] });
  if (payload.purpose !== "ttg-dashboard-refresh") throw new Error("Invalid refresh preview");
  if (typeof payload.compressedStage === "string") {
    try {
      return JSON.parse(inflateRawSync(Buffer.from(payload.compressedStage, "base64url")).toString("utf8")) as RefreshStage;
    } catch {
      throw new Error("Invalid refresh preview");
    }
  }
  if (!payload.stage || typeof payload.stage !== "object") throw new Error("Invalid refresh preview");
  return payload.stage as RefreshStage;
}
