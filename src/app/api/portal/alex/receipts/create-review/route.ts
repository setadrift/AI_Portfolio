import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import { createSandboxReviewQueueItem } from "@/lib/portal/alex/airtable-review-queue";
import { validateExtraction } from "@/lib/portal/alex/receipt-extraction";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      extraction?: unknown;
      rawInput?: unknown;
      propertyContext?: unknown;
      repairContext?: unknown;
    };

    const extraction = validateExtraction(body.extraction);
    const record = await createSandboxReviewQueueItem({
      extraction,
      rawInput: typeof body.rawInput === "string" ? body.rawInput : "",
      propertyContext: typeof body.propertyContext === "string" ? body.propertyContext : "",
      repairContext: typeof body.repairContext === "string" ? body.repairContext : "",
    });

    return NextResponse.json({ recordId: record.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Extraction worked, but the sandbox review row could not be created.",
      },
      { status: 500 },
    );
  }
}
