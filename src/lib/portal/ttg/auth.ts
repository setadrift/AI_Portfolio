import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_COOKIE, verifySession, type PortalSession } from "@/lib/portal/session";

type TtgAuthResult =
  | { ok: true; session: PortalSession }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function requireTtgPortalSession(): Promise<TtgAuthResult> {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || !["ttg", "admin"].includes(session.client)) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}
