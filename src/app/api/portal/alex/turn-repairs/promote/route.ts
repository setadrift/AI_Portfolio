import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import { promoteTurnRepairCaptureReview } from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { reviewRecordId?: unknown };
    const reviewRecordId =
      typeof body.reviewRecordId === "string" ? body.reviewRecordId.trim() : "";
    if (!reviewRecordId) {
      return NextResponse.json({ error: "Missing reviewRecordId." }, { status: 400 });
    }

    const result = await promoteTurnRepairCaptureReview(reviewRecordId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair capture could not be promoted." },
      { status: 500 },
    );
  }
}
