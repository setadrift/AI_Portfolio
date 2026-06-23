import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  promoteSandboxReviewItem,
  type AlexReceiptPromotionDestination,
} from "@/lib/portal/alex/airtable-review-queue";

export const runtime = "nodejs";
export const maxDuration = 30;

const DESTINATIONS = new Set(["maintenance_history", "expenses", "both", "review_only"]);

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const destination = stringField(body.destination);
    if (!DESTINATIONS.has(destination)) {
      return NextResponse.json({ error: "Choose a valid destination." }, { status: 400 });
    }

    const result = await promoteSandboxReviewItem({
      reviewRecordId: requiredString(body.reviewRecordId, "reviewRecordId"),
      destination: destination as AlexReceiptPromotionDestination,
      propertyRecordId: nullableString(body.propertyRecordId),
      workType: nullableString(body.workType),
      category: nullableString(body.category),
      paidBy: nullableString(body.paidBy),
      approvedFields: normalizeApprovedFields(body.approvedFields),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receipt promotion failed." },
      { status: 500 },
    );
  }
}

function normalizeApprovedFields(value: unknown) {
  const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    vendor: nullableString(obj.vendor),
    date: nullableString(obj.date),
    amount: nullableNumber(obj.amount),
    property: nullableString(obj.property),
    workDescription: nullableString(obj.workDescription),
    lineItems: stringArray(obj.lineItems),
    rawSummary: nullableString(obj.rawSummary),
    sourceType: nullableString(obj.sourceType),
    invoiceNumber: nullableString(obj.invoiceNumber),
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${field}`);
  }
  return value.trim();
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: unknown): string | null {
  const text = stringField(value);
  return text ? text : null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}
