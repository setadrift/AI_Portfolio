import { NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import { listTurnRepairProperties } from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const properties = await listTurnRepairProperties();
    return NextResponse.json({ properties });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair properties could not be loaded." },
      { status: 500 },
    );
  }
}
