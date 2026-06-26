import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  createTurnRepairMaintenanceCloseoutReview,
  isTurnRepairAirtableConfigured,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  if (!isTurnRepairAirtableConfigured()) {
    return NextResponse.json(
      { error: "Airtable sandbox review queue is not configured for maintenance closeout." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createTurnRepairMaintenanceCloseoutReview({
      repairId: requiredString(body.repairId, "repairId"),
      repair: requiredString(body.repair, "repair"),
      property: requiredString(body.property, "property"),
      area: stringField(body.area),
      contractor: stringField(body.contractor),
      notes: stringField(body.notes),
      completedAt: stringField(body.completedAt) || new Date().toISOString(),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Maintenance closeout could not be staged." },
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
