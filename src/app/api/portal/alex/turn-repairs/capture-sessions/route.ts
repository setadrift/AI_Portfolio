import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  createTurnRepairCaptureSession,
  isTurnRepairAirtableConfigured,
  type TurnRepairCaptureInput,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  if (!isTurnRepairAirtableConfigured()) {
    return NextResponse.json(
      { error: "Airtable sandbox capture sessions are not configured." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input: TurnRepairCaptureInput = {
      propertyId: requiredString(body.propertyId, "propertyId"),
      propertyLabel: requiredString(body.propertyLabel, "propertyLabel"),
      sessionType: stringField(body.sessionType) || "Initial turn inspection",
      sessionDate: stringField(body.sessionDate) || new Date().toISOString().slice(0, 10),
      area: stringField(body.area),
      contractor: stringField(body.contractor),
      repair: "",
      notes: stringField(body.notes),
      materialsNeeded: "",
      materialStatus: "",
      priority: "",
      targetDate: "",
      nextAction: "",
      waitingOn: "",
      majorItem: false,
      promotePreference: "review",
      uploadedBy: stringField(body.uploadedBy) || "Alex",
    };

    const result = await createTurnRepairCaptureSession(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Capture session could not be created." },
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
