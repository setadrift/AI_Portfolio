import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  createContractorShareLog,
  isTurnRepairAirtableConfigured,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  if (!isTurnRepairAirtableConfigured()) {
    return NextResponse.json(
      { error: "Airtable sandbox review queue is not configured for contractor share logs." },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createContractorShareLog({
      property: stringField(body.property),
      contractor: stringField(body.contractor),
      itemCount: numberField(body.itemCount),
      shareType: stringField(body.shareType) || "email_draft",
      body: stringField(body.body),
      itemIds: stringArray(body.itemIds),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Contractor share log could not be created." },
      { status: 500 },
    );
  }
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
