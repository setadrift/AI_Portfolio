import { SignJWT, jwtVerify } from "jose";

export const PORTAL_COOKIE = "portal_session";
const SESSION_TTL_HOURS = 24 * 7; // 1 week

export interface PortalSession {
  sub: string; // username (e.g. "gabby", "duncan")
  client: string; // client slug they have access to (e.g. "ttg")
}

function secret() {
  const raw = process.env.PORTAL_SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("PORTAL_SESSION_SECRET must be set (>= 32 chars)");
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(session: PortalSession): Promise<string> {
  return await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.client !== "string") {
      return null;
    }
    return { sub: payload.sub, client: payload.client };
  } catch {
    return null;
  }
}
