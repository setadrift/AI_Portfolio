import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  listTurnRepairCaptureReviews,
  updateTurnRepairCaptureReview,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const reviewItems = await listTurnRepairCaptureReviews();
    return NextResponse.json({ reviewItems });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair review items could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const reviewRecordId = requiredString(body.reviewRecordId, "reviewRecordId");
    const action = stringField(body.action) === "skip" ? "skip" : "save";
    const result = await updateTurnRepairCaptureReview({
      reviewRecordId,
      action,
      repair: stringField(body.repair),
      area: stringField(body.area),
      contractor: stringField(body.contractor),
      notes: stringField(body.notes),
      materialsNeeded: stringField(body.materialsNeeded),
      materialStatus: stringField(body.materialStatus),
      priority: stringField(body.priority),
      targetDate: stringField(body.targetDate),
      nextAction: stringField(body.nextAction),
      waitingOn: stringField(body.waitingOn),
      majorItem: body.majorItem === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair review item could not be updated." },
      { status: 500 },
    );
  }
}

function requiredString(value: unknown, field: string): string {
  const text = stringField(value);
  if (!text) throw new Error(`Missing ${field}`);
  return text;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
