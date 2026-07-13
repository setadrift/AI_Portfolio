import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PORTAL_COOKIE, verifySession, type PortalSession } from "@/lib/portal/session";

type MinaAuthResult =
  | { ok: true; session: PortalSession }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function requireMinaPortalSession(): Promise<MinaAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.client !== "mina") {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, session };
}
