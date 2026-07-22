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
  return new SignJWT({ stage, purpose: "ttg-dashboard-refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(stageSecret());
}

export async function verifyRefreshStage(token: string): Promise<RefreshStage> {
  const { payload } = await jwtVerify(token, stageSecret(), { algorithms: ["HS256"] });
  if (payload.purpose !== "ttg-dashboard-refresh" || !payload.stage || typeof payload.stage !== "object") throw new Error("Invalid refresh preview");
  return payload.stage as RefreshStage;
}
