import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  createTurnRepairQuickUpdateReview,
  isTurnRepairAirtableConfigured,
  uploadTurnRepairUpdatePhotos,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  if (!isTurnRepairAirtableConfigured()) {
    return NextResponse.json(
      { error: "Airtable sandbox review queue is not configured for turn repair updates." },
      { status: 503 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const parsed = contentType.includes("multipart/form-data")
      ? await parseMultipartUpdate(req)
      : await parseJsonUpdate(req);

    const result = await createTurnRepairQuickUpdateReview({
      repairId: parsed.repairId,
      repair: parsed.repair,
      property: parsed.property,
      updateType: parsed.updateType,
      note: parsed.note,
      photoUrls: parsed.photoUrls,
      fileNames: parsed.fileNames,
      materialStatus: parsed.materialStatus,
      status: parsed.status,
      targetDate: parsed.targetDate,
      scheduledDate: parsed.scheduledDate,
      nextAction: parsed.nextAction,
      waitingOn: parsed.waitingOn,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turn repair update could not be staged." },
      { status: 500 },
    );
  }
}

async function parseJsonUpdate(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  return {
    repairId: requiredString(body.repairId, "repairId"),
    repair: requiredString(body.repair, "repair"),
    property: requiredString(body.property, "property"),
    updateType: requiredString(body.updateType, "updateType"),
    note: stringField(body.note),
    materialStatus: stringField(body.materialStatus),
    status: stringField(body.status),
    targetDate: stringField(body.targetDate),
    scheduledDate: stringField(body.scheduledDate),
    nextAction: stringField(body.nextAction),
    waitingOn: stringField(body.waitingOn),
    photoUrls: [] as string[],
    fileNames: [] as string[],
  };
}

async function parseMultipartUpdate(req: NextRequest) {
  const form = await req.formData();
  const property = requiredString(form.get("property"), "property");
  const files = form
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const upload = await uploadTurnRepairUpdatePhotos(files, property);

  return {
    repairId: requiredString(form.get("repairId"), "repairId"),
    repair: requiredString(form.get("repair"), "repair"),
    property,
    updateType: requiredString(form.get("updateType"), "updateType"),
    note: stringField(form.get("note")),
    materialStatus: stringField(form.get("materialStatus")),
    status: stringField(form.get("status")),
    targetDate: stringField(form.get("targetDate")),
    scheduledDate: stringField(form.get("scheduledDate")),
    nextAction: stringField(form.get("nextAction")),
    waitingOn: stringField(form.get("waitingOn")),
    photoUrls: upload.urls,
    fileNames: upload.fileNames,
  };
}

function requiredString(value: unknown, field: string): string {
  const text = stringField(value);
  if (!text) throw new Error(`Missing ${field}`);
  return text;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
