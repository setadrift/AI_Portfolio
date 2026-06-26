import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  HELPER_UPLOAD_TOKEN_PARAM,
  validateHelperUploadToken,
} from "@/lib/portal/alex/helper-upload-access";
import {
  createTurnRepairCaptureReview,
  isTurnRepairAirtableConfigured,
  type TurnRepairCaptureInput,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const helperAccess = validateHelperUploadToken(req.nextUrl.searchParams.get(HELPER_UPLOAD_TOKEN_PARAM));
  if (!helperAccess) {
    const auth = await requireAlexPortalSession();
    if (!auth.ok) return auth.response;
  }

  if (!isTurnRepairAirtableConfigured()) {
    return NextResponse.json(
      { error: "Airtable sandbox review queue is not configured for turn repair capture." },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const input: TurnRepairCaptureInput = {
      propertyId: stringField(form.get("propertyId")),
      propertyLabel: stringField(form.get("propertyLabel")),
      sessionType: stringField(form.get("sessionType")) || "Initial turn inspection",
      sessionDate: stringField(form.get("sessionDate")),
      area: stringField(form.get("area")),
      contractor: stringField(form.get("contractor")),
      repair: stringField(form.get("repair")),
      notes: stringField(form.get("notes")),
      materialsNeeded: stringField(form.get("materialsNeeded")),
      materialStatus: stringField(form.get("materialStatus")),
      priority: stringField(form.get("priority")),
      targetDate: stringField(form.get("targetDate")),
      nextAction: stringField(form.get("nextAction")),
      waitingOn: stringField(form.get("waitingOn")),
      majorItem: form.get("majorItem") === "true",
      promotePreference:
        form.get("promotePreference") === "draft_turn_repair" ? "draft_turn_repair" : "review",
      uploadedBy: stringField(form.get("uploadedBy")) || "Alex",
    };

    if (helperAccess) {
      if (
        helperAccess.allowedPropertyIds.length &&
        !helperAccess.allowedPropertyIds.includes(input.propertyId)
      ) {
        return NextResponse.json({ error: "This helper upload link is not assigned to that property." }, { status: 403 });
      }

      input.sessionType = "Helper inspection";
      input.contractor = "";
      input.materialsNeeded = "";
      input.materialStatus = "";
      input.priority = "";
      input.targetDate = "";
      input.nextAction = "Alex review helper upload";
      input.waitingOn = "Alex";
      input.majorItem = false;
      input.promotePreference = "review";
      input.uploadedBy = helperAccess.helperName || input.uploadedBy || "Helper";
      input.repair = `Helper upload${input.area ? ` - ${input.area}` : ""}`;
    }

    if (!input.propertyId || !input.propertyLabel) {
      return NextResponse.json({ error: "Choose a property before creating a capture item." }, { status: 400 });
    }

    if (!input.repair && !input.notes && !input.materialsNeeded && !form.getAll("photos").length) {
      return NextResponse.json(
        { error: "Add a repair title, note, material list, or photo before saving." },
        { status: 400 },
      );
    }

    const files = form
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const result = await createTurnRepairCaptureReview(input, files);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair capture could not be saved." },
      { status: 500 },
    );
  }
}

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
