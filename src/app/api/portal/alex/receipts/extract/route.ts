import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  extractReceiptData,
  normalizeSourceType,
} from "@/lib/portal/alex/receipt-extraction";
import { isSandboxReviewQueueConfigured } from "@/lib/portal/alex/airtable-review-queue";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const form = await req.formData();
    const sourceType = normalizeSourceType(form.get("sourceType"));
    const rawText = stringField(form.get("rawText"));
    const propertyContext = stringField(form.get("propertyContext"));
    const repairContext = stringField(form.get("repairContext"));
    const file = form.get("file");

    let imageDataUrl: string | undefined;
    if (file instanceof File && file.size > 0) {
      imageDataUrl = await fileToDataUrl(file);
    }

    if (!rawText && !imageDataUrl) {
      return NextResponse.json(
        { error: "Upload a receipt image or paste receipt/invoice text." },
        { status: 400 },
      );
    }

    const extraction = await extractReceiptData({
      sourceType,
      rawText,
      propertyContext,
      repairContext,
      imageDataUrl,
    });

    return NextResponse.json({
      extraction,
      canCreateSandboxReview: isSandboxReviewQueueConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 },
    );
  }
}

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function fileToDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Upload a JPEG, PNG, WebP, or HEIC image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Receipt image must be 5 MB or smaller.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}
