import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { getRefreshHistory } from "@/lib/portal/ttg/google-sheets-refresh";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ history: await getRefreshHistory() });
  } catch (error) {
    console.error("TTG refresh history failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load refresh history." }, { status: 400 });
  }
}
