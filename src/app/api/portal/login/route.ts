import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/portal/users";
import { signSession, PORTAL_COOKIE } from "@/lib/portal/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Missing username or password" }, { status: 400 });
  }
  const user = authenticate(body.username, body.password);
  if (!user) {
    // Constant-time-ish delay to slow down brute force attempts
    await new Promise((r) => setTimeout(r, 350));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const token = await signSession({ sub: user.username, client: user.client });
  const res = NextResponse.json({ ok: true, client: user.client });
  res.cookies.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
