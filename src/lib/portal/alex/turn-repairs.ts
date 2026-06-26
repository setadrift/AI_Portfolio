import { put } from "@vercel/blob";

export type TurnRepairStatus = "Open" | "In Progress" | "Done" | "";
export type MaterialStatus = "Need to Buy" | "Purchased" | "On Hand" | "Not Needed" | "";

export interface TurnRepairProperty {
  id: string;
  name: string;
  address: string;
  label: string;
}

export interface TurnRepairRecord {
  id: string;
  repair: string;
  property: string;
  propertyId?: string;
  area: string;
  contractor: string;
  notes: string;
  materialStatus: MaterialStatus | string;
  materialsNeeded: string;
  priority: string;
  status: TurnRepairStatus | string;
  photos: string[];
  targetDate?: string;
  scheduledDate?: string;
  nextAction?: string;
  waitingOn?: string;
  moveInDeadline?: string;
  majorItem?: boolean;
}

export interface TurnRepairCaptureInput {
  propertyId: string;
  propertyLabel: string;
  sessionType: string;
  sessionDate: string;
  area: string;
  contractor: string;
  repair: string;
  notes: string;
  materialsNeeded: string;
  materialStatus: string;
  priority: string;
  targetDate: string;
  nextAction: string;
  waitingOn: string;
  majorItem: boolean;
  promotePreference: "review" | "draft_turn_repair";
  uploadedBy: string;
}

export interface TurnRepairReviewItem {
  id: string;
  title: string;
  status: string;
  property: string;
  repair: string;
  area: string;
  contractor: string;
  notes: string;
  materialStatus: string;
  materialsNeeded: string;
  priority: string;
  targetDate: string;
  nextAction: string;
  waitingOn: string;
  majorItem: boolean;
  uploadedPhotoUrls: string[];
  createdTime?: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records?: AirtableRecord[];
  offset?: string;
}

interface AirtableCreateResponse {
  id: string;
  fields?: Record<string, unknown>;
}

const TABLE_IDS = {
  properties: "tblbmjduxvEAehDba",
  turnRepairs: "tblRd922G2nOlmlmO",
  captureSessions: "tblh79vzPoitFWE1w",
  captureItems: "tblj5i12XvVtzQd2J",
  contractorShareLogs: "tblqtWrfY51fUeP3H",
} as const;

export const SAMPLE_PROPERTIES: TurnRepairProperty[] = [
  {
    id: "sample-125-westridge",
    name: "125 Westridge Dr",
    address: "125 Westridge Dr",
    label: "125 Westridge Dr",
  },
  {
    id: "sample-233-westridge",
    name: "233 Westridge Dr",
    address: "233 Westridge Dr",
    label: "233 Westridge Dr",
  },
  {
    id: "sample-property-hub",
    name: "Property selected in Airtable",
    address: "",
    label: "Property selected in Airtable",
  },
];

export const SAMPLE_TURN_REPAIRS: TurnRepairRecord[] = [
  {
    id: "sample-repair-1",
    repair: "Scrape and paint kitchen wall",
    property: "125 Westridge Dr",
    propertyId: "sample-125-westridge",
    area: "Kitchen",
    contractor: "Painter",
    notes: "Home Depot materials needed; inspect wall after scraping.",
    materialStatus: "Need to Buy",
    materialsNeeded: "SW7057 paint, spackle, roller cover",
    priority: "High",
    status: "Open",
    photos: [],
    targetDate: "2026-07-03",
    nextAction: "Buy paint and confirm painter schedule",
    waitingOn: "Alex",
    moveInDeadline: "2026-08-12",
    majorItem: false,
  },
  {
    id: "sample-repair-2",
    repair: "Price out Icynene upstairs bed",
    property: "233 Westridge Dr",
    propertyId: "sample-233-westridge",
    area: "Upstairs bedroom",
    contractor: "Insulation",
    notes: "Needs contractor quote before schedule is locked.",
    materialStatus: "",
    materialsNeeded: "",
    priority: "Major Item",
    status: "Open",
    photos: [],
    targetDate: "",
    nextAction: "Get quote",
    waitingOn: "Contractor",
    moveInDeadline: "2026-08-12",
    majorItem: true,
  },
  {
    id: "sample-repair-3",
    repair: "Condensate line broke",
    property: "125 Westridge Dr",
    propertyId: "sample-125-westridge",
    area: "HVAC / exterior",
    contractor: "HVAC",
    notes: "Check if repair affects move-in readiness.",
    materialStatus: "On Hand",
    materialsNeeded: "PVC coupling",
    priority: "High",
    status: "In Progress",
    photos: [],
    targetDate: "2026-06-30",
    nextAction: "Confirm repair complete",
    waitingOn: "Contractor",
    moveInDeadline: "2026-08-12",
    majorItem: true,
  },
];

export async function listTurnRepairProperties(): Promise<TurnRepairProperty[]> {
  if (!isAirtableConfigured()) return SAMPLE_PROPERTIES;

  const records = await listAirtableRecords(TABLE_IDS.properties, {
    fields: ["Property Name", "Address", "City"],
    maxRecords: 200,
  });

  const properties = records
    .map((record) => {
      const name = stringValue(record.fields["Property Name"]);
      const address = stringValue(record.fields.Address);
      const city = stringValue(record.fields.City);
      const label = [name || address || record.id, city].filter(Boolean).join(" - ");

      return {
        id: record.id,
        name,
        address,
        label,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return properties.length ? properties : SAMPLE_PROPERTIES;
}

export async function listTurnRepairRecords(): Promise<TurnRepairRecord[]> {
  if (!isAirtableConfigured()) return SAMPLE_TURN_REPAIRS;

  const records = await listAirtableRecords(TABLE_IDS.turnRepairs, {
    fields: [
      "Repair",
      "Property",
      "Area / Location",
      "Contractor",
      "Notes",
      "Material Status",
      "Materials Needed",
      "Priority",
      "Status",
      "Photos",
    ],
    maxRecords: 200,
  });

  const mapped = records.map(mapTurnRepairRecord).filter((record) => record.repair);
  return mapped.length ? mapped : SAMPLE_TURN_REPAIRS;
}

export async function createTurnRepairCaptureReview(
  input: TurnRepairCaptureInput,
  files: File[],
): Promise<{ recordId: string; sessionId?: string; uploadedPhotoUrls: string[]; storedFileNames: string[] }> {
  const uploadResult = await uploadCapturePhotos(files, {
    propertyLabel: input.propertyLabel,
    sessionDate: input.sessionDate,
    sessionType: input.sessionType,
  });

  try {
    const session = await createCaptureSession(input);
    const item = await createCaptureItem(input, uploadResult, session.id);
    await createGenericCaptureReview(input, uploadResult, item.id).catch(() => undefined);

    return {
      recordId: item.id,
      sessionId: session.id,
      uploadedPhotoUrls: uploadResult.urls,
      storedFileNames: uploadResult.fileNames,
    };
  } catch {
    const fallback = await createGenericCaptureReview(input, uploadResult);
    return {
      recordId: fallback.id,
      uploadedPhotoUrls: uploadResult.urls,
      storedFileNames: uploadResult.fileNames,
    };
  }
}

export async function createTurnRepairCaptureSession(input: TurnRepairCaptureInput): Promise<{ recordId: string }> {
  const session = await createCaptureSession(input);
  return { recordId: session.id };
}

async function createGenericCaptureReview(
  input: TurnRepairCaptureInput,
  uploadResult: { urls: string[]; fileNames: string[] },
  captureItemId?: string,
): Promise<AirtableCreateResponse> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const fields = buildCaptureReviewFields(input, uploadResult);
  if (captureItemId) fields["Related Record ID"] = `Turn Repair Capture Items: ${captureItemId}`;

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable turn repair capture review failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return a capture review record ID");
  return record;
}

async function createCaptureSession(input: TurnRepairCaptureInput): Promise<AirtableCreateResponse> {
  const fields = removeUndefined({
    "Session Name": `${input.propertyLabel} - ${input.sessionType || "Turn repair capture"} - ${input.sessionDate || new Date().toISOString().slice(0, 10)}`,
    "Property Label": input.propertyLabel,
    "Property Record ID": input.propertyId,
    "Session Date": input.sessionDate || new Date().toISOString().slice(0, 10),
    "Session Type": input.sessionType || "Initial turn inspection",
    "Default Area / Location": input.area || undefined,
    "Default Contractor": input.contractor || undefined,
    "Uploaded By": input.uploadedBy || "Alex",
    Status: "Needs Review",
    "Session Notes": input.notes || undefined,
    Source: input.uploadedBy === "Helper" || input.sessionType === "Helper inspection" ? "Helper Upload" : "Portal",
  });

  return createAirtableRecord(TABLE_IDS.captureSessions, fields);
}

async function createCaptureItem(
  input: TurnRepairCaptureInput,
  uploadResult: { urls: string[]; fileNames: string[] },
  sessionId: string,
): Promise<AirtableCreateResponse> {
  const title = input.repair || `${input.propertyLabel} ${input.area || input.sessionType}`.trim();
  const fields = removeUndefined({
    "Capture Item": title || "Turn repair capture",
    "Capture Session ID": sessionId,
    "Property Label": input.propertyLabel,
    "Property Record ID": input.propertyId,
    Repair: input.repair || undefined,
    "Area / Location": input.area || undefined,
    Contractor: input.contractor || undefined,
    Notes: input.notes || undefined,
    "Materials Needed": input.materialsNeeded || undefined,
    "Material Status": input.materialStatus || undefined,
    "Priority / Major Item": input.priority || (input.majorItem ? "Major Item" : undefined),
    "Target Date": input.targetDate || undefined,
    "Next Action": input.nextAction || undefined,
    "Waiting On": input.waitingOn || undefined,
    Photos: uploadResult.urls.length ? uploadResult.urls.map((url) => ({ url })) : undefined,
    "Photo URLs": uploadResult.urls.join("\n") || undefined,
    "Source Photo Count": uploadResult.fileNames.length,
    "Review Status": "Needs Review",
    "Created From": input.uploadedBy === "Helper" || input.sessionType === "Helper inspection" ? "Helper Upload" : "Portal",
    "Uploaded By": input.uploadedBy || "Alex",
  });

  return createAirtableRecord(TABLE_IDS.captureItems, fields);
}

export async function createTurnRepairQuickUpdateReview(input: {
  repairId: string;
  repair: string;
  property: string;
  updateType: string;
  note: string;
  photoUrls?: string[];
  fileNames?: string[];
  materialStatus?: string;
  status?: string;
  targetDate?: string;
  scheduledDate?: string;
  nextAction?: string;
  waitingOn?: string;
}): Promise<{ recordId: string }> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const fields = removeUndefined({
    "Review Item": `Turn repair update - ${input.repair}`,
    Status: "Needs Review",
    Category: "Repair",
    Confidence: "High",
    "Suggested Destination": "Turn Repairs",
    "AI Summary": [
      `Property: ${input.property}`,
      `Repair: ${input.repair}`,
      `Update type: ${input.updateType}`,
      input.note && `Note: ${input.note}`,
      input.fileNames?.length && `Uploaded files: ${input.fileNames.join(", ")}`,
      input.photoUrls?.length && `Photo URLs:\n${input.photoUrls.join("\n")}`,
      input.targetDate && `Target date: ${input.targetDate}`,
      input.scheduledDate && `Scheduled date: ${input.scheduledDate}`,
      input.nextAction && `Next action: ${input.nextAction}`,
      input.waitingOn && `Waiting on: ${input.waitingOn}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Recommended Action": "Review and apply this field update to the Turn Repairs item if correct.",
    "Extracted Data": JSON.stringify(input, null, 2),
    "Raw Input": JSON.stringify(input, null, 2),
    "Source Type": "field_note",
    "Work Description": input.repair,
    "Approval State": "ready_for_review",
  });

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable turn repair update review failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return an update review record ID");
  return { recordId: record.id };
}

export async function createTurnRepairMaintenanceCloseoutReview(input: {
  repairId: string;
  repair: string;
  property: string;
  area: string;
  contractor: string;
  notes: string;
  completedAt: string;
}): Promise<{ recordId: string }> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const fields = removeUndefined({
    "Review Item": `Maintenance closeout - ${input.repair}`,
    Status: "Needs Review",
    Category: "Repair",
    Confidence: "Medium",
    "Suggested Destination": "Maintenance History",
    "AI Summary": [
      `Property: ${input.property}`,
      `Repair: ${input.repair}`,
      input.area && `Area: ${input.area}`,
      input.contractor && `Contractor: ${input.contractor}`,
      `Completed at: ${input.completedAt}`,
      input.notes && `Notes: ${input.notes}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Recommended Action":
      "Review this completed Turn Repair and create a Maintenance History record only if the closeout details are accurate.",
    "Extracted Data": JSON.stringify(
      {
        source_type: "turn_repair_closeout",
        recommended_destination: "Maintenance History",
        ...input,
      },
      null,
      2,
    ),
    "Raw Input": JSON.stringify(input, null, 2),
    "Source Type": "field_note",
    "Work Description": input.repair,
    "Approval State": "ready_for_review",
  });

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable maintenance closeout review failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return a maintenance closeout review record ID");
  return { recordId: record.id };
}

export async function uploadTurnRepairUpdatePhotos(
  files: File[],
  propertyLabel: string,
): Promise<{ urls: string[]; fileNames: string[] }> {
  return uploadCapturePhotos(files, {
    propertyLabel,
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionType: "quick update",
  });
}

export function buildContractorSharePreview(input: {
  records: TurnRepairRecord[];
  property?: string;
  contractor?: string;
  excludedIds?: string[];
}): { body: string; records: TurnRepairRecord[]; itemCount: number } {
  const excluded = new Set(input.excludedIds ?? []);
  const records = input.records
    .filter((record) => !input.property || record.property === input.property)
    .filter((record) => !input.contractor || record.contractor === input.contractor)
    .filter((record) => !excluded.has(record.id));

  const body = [
    `Repair list for ${input.property || "selected property"}`,
    input.contractor ? `Contractor: ${input.contractor}` : "",
    "",
    ...records.flatMap((record, index) => [
      `${index + 1}. ${record.area ? `${record.area}: ` : ""}${record.repair}`,
      record.notes ? `   Notes: ${record.notes}` : "",
      record.materialsNeeded ? `   Materials: ${record.materialsNeeded}` : "",
      record.photos.length ? `   Photos: ${record.photos.join(", ")}` : "",
      "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");

  return { body, records, itemCount: records.length };
}

export async function createContractorShareLog(input: {
  property: string;
  contractor: string;
  itemCount: number;
  shareType: string;
  body: string;
  itemIds: string[];
}): Promise<{ recordId: string }> {
  const fields = removeUndefined({
    "Share Name": `${input.property || "Repairs"} - ${input.contractor || "Contractor"} - ${new Date().toISOString().slice(0, 10)}`,
    Property: input.property || undefined,
    Contractor: input.contractor || undefined,
    "Shared Items": input.body,
    "Item Count": input.itemCount,
    "Share Type": input.shareType === "email_draft" ? "Email Draft" : input.shareType,
    "Shared At": new Date().toISOString(),
    "Shared By": "Alex portal",
    Notes: "Generated from contractor share preview. No contractor edit access granted.",
  });

  try {
    const record = await createAirtableRecord(TABLE_IDS.contractorShareLogs, fields);
    return { recordId: record.id };
  } catch {
    return createContractorShareReviewFallback(input);
  }
}

async function createContractorShareReviewFallback(input: {
  property: string;
  contractor: string;
  itemCount: number;
  shareType: string;
  body: string;
  itemIds: string[];
}): Promise<{ recordId: string }> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const fields = removeUndefined({
    "Review Item": `Contractor share - ${input.property || "selected repairs"}`,
    Status: "Approved",
    Category: "Repair",
    Confidence: "High",
    "Suggested Destination": "Turn Repairs",
    "AI Summary": [
      `Property: ${input.property || "Not filtered"}`,
      `Contractor: ${input.contractor || "Not filtered"}`,
      `Share type: ${input.shareType}`,
      `Items: ${input.itemCount}`,
    ].join("\n"),
    "Recommended Action": "Contractor share list generated for Alex review/send. No contractor edit access granted.",
    "Extracted Data": JSON.stringify(input, null, 2),
    "Raw Input": input.body,
    "Source Type": "field_note",
    "Approval State": "share_preview_generated",
  });

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable contractor share log failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return a contractor share log ID");
  return { recordId: record.id };
}

export async function listTurnRepairCaptureReviews(): Promise<TurnRepairReviewItem[]> {
  if (!isAirtableConfigured()) return [];

  try {
    const records = await listAirtableRecords(TABLE_IDS.captureItems, {
      fields: [
        "Capture Item",
        "Property Label",
        "Property Record ID",
        "Repair",
        "Area / Location",
        "Contractor",
        "Notes",
        "Materials Needed",
        "Material Status",
        "Priority / Major Item",
        "Target Date",
        "Next Action",
        "Waiting On",
        "Photo URLs",
        "Review Status",
        "Uploaded By",
      ],
      maxRecords: 100,
    });

    return records.map(mapCaptureItemReview).filter((item) => item.status !== "Promoted");
  } catch {
    const { reviewTableId } = getAirtableConfig();
    const records = await listAirtableRecords(reviewTableId, {
      fields: ["Review Item", "Status", "Category", "Suggested Destination", "Extracted Data"],
      maxRecords: 100,
    });

    return records
      .map(mapReviewItem)
      .filter((item): item is TurnRepairReviewItem => Boolean(item))
      .filter((item) => item.status !== "Done");
  }
}

export async function updateTurnRepairCaptureReview(input: {
  reviewRecordId: string;
  action: "save" | "skip";
  repair?: string;
  area?: string;
  contractor?: string;
  notes?: string;
  materialsNeeded?: string;
  materialStatus?: string;
  priority?: string;
  targetDate?: string;
  nextAction?: string;
  waitingOn?: string;
  majorItem?: boolean;
}): Promise<{ recordId: string }> {
  validateRecordId(input.reviewRecordId, "reviewRecordId");

  try {
    if (input.action === "skip") {
      await updateAirtableRecord(TABLE_IDS.captureItems, input.reviewRecordId, {
        "Review Status": "Skipped",
      });
      return { recordId: input.reviewRecordId };
    }

    await updateAirtableRecord(TABLE_IDS.captureItems, input.reviewRecordId, removeUndefined({
      Repair: input.repair,
      "Area / Location": input.area,
      Contractor: input.contractor,
      Notes: input.notes,
      "Materials Needed": input.materialsNeeded,
      "Material Status": input.materialStatus,
      "Priority / Major Item": input.priority || (input.majorItem ? "Major Item" : undefined),
      "Target Date": input.targetDate,
      "Next Action": input.nextAction,
      "Waiting On": input.waitingOn,
      "Review Status": "Needs Review",
    }));
    return { recordId: input.reviewRecordId };
  } catch {
    const reviewRecord = await getReviewRecord(input.reviewRecordId);

    if (input.action === "skip") {
      await updateReviewRecord(input.reviewRecordId, {
        Status: "Done",
        "Approval State": "skipped",
        "Processed At": new Date().toISOString(),
      });
      return { recordId: input.reviewRecordId };
    }

    const extracted = {
      ...parseExtractedData(reviewRecord.fields["Extracted Data"]),
      repair: input.repair,
      area: input.area,
      contractor: input.contractor,
      notes: input.notes,
      materialsNeeded: input.materialsNeeded,
      materialStatus: input.materialStatus,
      priority: input.priority,
      targetDate: input.targetDate,
      nextAction: input.nextAction,
      waitingOn: input.waitingOn,
      majorItem: input.majorItem,
    };

    await updateReviewRecord(input.reviewRecordId, {
      "Review Item": input.repair || stringValue(reviewRecord.fields["Review Item"]) || "Turn repair capture",
      "Extracted Data": JSON.stringify(extracted, null, 2),
      "Raw Input": JSON.stringify(extracted, null, 2),
      "Work Description": input.repair || input.notes || undefined,
      "Approval State": "ready_for_review",
    });
    return { recordId: input.reviewRecordId };
  }
}

export async function promoteTurnRepairCaptureReview(reviewRecordId: string): Promise<{
  reviewRecordId: string;
  turnRepairRecordId: string;
}> {
  validateRecordId(reviewRecordId, "reviewRecordId");
  let reviewItem: TurnRepairReviewItem | null = null;
  let propertyId: string | null = null;
  let source: "capture-item" | "review-queue" = "capture-item";

  try {
    const captureRecord = await getAirtableRecord(TABLE_IDS.captureItems, reviewRecordId);
    reviewItem = mapCaptureItemReview(captureRecord);
    propertyId = stringValue(captureRecord.fields["Property Record ID"]);
  } catch {
    const reviewRecord = await getReviewRecord(reviewRecordId);
    reviewItem = mapReviewItem(reviewRecord);
    propertyId = extractPropertyId(reviewRecord);
    source = "review-queue";
  }

  if (!reviewItem) throw new Error("Review item is not a turn repair capture.");

  const fields = removeUndefined({
    Repair: reviewItem.repair || reviewItem.notes || reviewItem.title,
    Property: propertyId ? [propertyId] : undefined,
    "Area / Location": reviewItem.area || undefined,
    Contractor: reviewItem.contractor || undefined,
    Notes: buildPromotedTurnRepairNotes(reviewItem, reviewRecordId),
    "Material Status": reviewItem.materialStatus || undefined,
    "Materials Needed": reviewItem.materialsNeeded || undefined,
    Priority: reviewItem.priority || (reviewItem.majorItem ? "Major Item" : undefined),
    Status: "Open",
    Photos: reviewItem.uploadedPhotoUrls.length
      ? reviewItem.uploadedPhotoUrls.map((url) => ({ url }))
      : undefined,
  });

  if (!fields.Property) {
    throw new Error("Review item is missing a property record ID and cannot be promoted.");
  }

  const created = await createAirtableRecord(TABLE_IDS.turnRepairs, fields);
  if (source === "capture-item") {
    await updateAirtableRecord(TABLE_IDS.captureItems, reviewRecordId, {
      "Review Status": "Promoted",
      "Promoted Turn Repair ID": created.id,
    });
  } else {
    await updateReviewRecord(reviewRecordId, {
      Status: "Done",
      "Approval State": "approved_for_sandbox_write",
      "Approved For Write": true,
      "Processed At": new Date().toISOString(),
      "Related Record ID": `Turn Repairs: ${created.id}`,
      Error: "",
    });
  }

  return { reviewRecordId, turnRepairRecordId: created.id };
}

export function isTurnRepairAirtableConfigured(): boolean {
  return isAirtableConfigured();
}

function isAirtableConfigured(): boolean {
  return Boolean(
    process.env.AIRTABLE_API_KEY &&
      process.env.ALEX_SANDBOX_AIRTABLE_BASE_ID &&
      process.env.ALEX_GMAIL_REVIEW_QUEUE_TABLE_ID,
  );
}

function getAirtableConfig(): {
  apiKey: string;
  baseId: string;
  reviewTableId: string;
} {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.ALEX_SANDBOX_AIRTABLE_BASE_ID;
  const reviewTableId = process.env.ALEX_GMAIL_REVIEW_QUEUE_TABLE_ID;

  if (!apiKey || !baseId || !reviewTableId) {
    throw new Error("Airtable sandbox review queue is not configured");
  }

  return { apiKey, baseId, reviewTableId };
}

async function uploadCapturePhotos(
  files: File[],
  context: { propertyLabel: string; sessionDate?: string; sessionType?: string },
): Promise<{ urls: string[]; fileNames: string[] }> {
  const fileNames = files.map((file) => file.name).filter(Boolean);
  if (!files.length || !process.env.BLOB_READ_WRITE_TOKEN) return { urls: [], fileNames };

  const safeProperty = slugify(context.propertyLabel) || "property";
  const safeDate = slugify(context.sessionDate || new Date().toISOString().slice(0, 10));
  const safeSession = slugify(context.sessionType || "capture");
  const uploads = await Promise.all(
    files.map(async (file) => {
      const pathname = [
        "alex-turn-repairs",
        safeProperty,
        safeDate,
        safeSession,
        `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}`,
      ].join("/");
      const blob = await put(pathname, file, { access: "public" });
      return blob.url;
    }),
  );

  return { urls: uploads, fileNames };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildCaptureReviewFields(
  input: TurnRepairCaptureInput,
  uploadResult: { urls: string[]; fileNames: string[] },
): Record<string, unknown> {
  const reviewTitle = input.repair || `${input.propertyLabel} ${input.sessionType}`.trim();
  const extractedData = {
    source_type: "turn_repair_capture",
    propertyId: input.propertyId,
    property: input.propertyLabel,
    sessionType: input.sessionType,
    sessionDate: input.sessionDate,
    area: input.area,
    contractor: input.contractor,
    repair: input.repair,
    notes: input.notes,
    materialsNeeded: input.materialsNeeded,
    materialStatus: input.materialStatus,
    priority: input.priority,
    targetDate: input.targetDate,
    nextAction: input.nextAction,
    waitingOn: input.waitingOn,
    majorItem: input.majorItem,
    promotePreference: input.promotePreference,
    uploadedBy: input.uploadedBy,
    uploadedPhotoUrls: uploadResult.urls,
    uploadedFileNames: uploadResult.fileNames,
  };

  return removeUndefined({
    "Review Item": reviewTitle || "Turn repair capture",
    Status: "Needs Review",
    Category: "Repair",
    Confidence: "Medium",
    "Suggested Destination": "Turn Repairs",
    "AI Summary": [
      `Property: ${input.propertyLabel}`,
      `Session: ${input.sessionType || "Turn repair capture"} on ${input.sessionDate || "unspecified date"}`,
      input.area && `Area: ${input.area}`,
      input.contractor && `Contractor: ${input.contractor}`,
      input.materialsNeeded && `Materials needed: ${input.materialsNeeded}`,
      input.materialStatus && `Material status: ${input.materialStatus}`,
      input.targetDate && `Target date: ${input.targetDate}`,
      input.nextAction && `Next action: ${input.nextAction}`,
      input.waitingOn && `Waiting on: ${input.waitingOn}`,
      input.notes && `Notes: ${input.notes}`,
      uploadResult.fileNames.length && `Uploaded files: ${uploadResult.fileNames.join(", ")}`,
      uploadResult.urls.length && `Photo URLs:\n${uploadResult.urls.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Recommended Action":
      input.promotePreference === "draft_turn_repair"
        ? "Review and promote this capture into a Turn Repairs record if the details are accurate."
        : "Review this capture and decide whether it should become a Turn Repairs record.",
    "Extracted Data": JSON.stringify(extractedData, null, 2),
    "Raw Input": JSON.stringify(extractedData, null, 2),
    "Source Type": "field_note",
    "Work Description": input.repair || input.notes || undefined,
    "Line Items": input.materialsNeeded || undefined,
    "Approval State": "ready_for_review",
  });
}

async function getReviewRecord(recordId: string): Promise<AirtableRecord> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}/${recordId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable review row lookup failed: ${res.status} ${text.slice(0, 240)}`);
  }

  return (await res.json()) as AirtableRecord;
}

async function updateReviewRecord(
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${reviewTableId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ id: recordId, fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable review row update failed: ${res.status} ${text.slice(0, 240)}`);
  }
}

async function getAirtableRecord(tableId: string, recordId: string): Promise<AirtableRecord> {
  const { apiKey, baseId } = getAirtableConfig();
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable record lookup failed: ${res.status} ${text.slice(0, 240)}`);
  }

  return (await res.json()) as AirtableRecord;
}

async function updateAirtableRecord(
  tableId: string,
  recordId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const { apiKey, baseId } = getAirtableConfig();
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ id: recordId, fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable record update failed: ${res.status} ${text.slice(0, 240)}`);
  }
}

async function createAirtableRecord(
  tableId: string,
  fields: Record<string, unknown>,
): Promise<AirtableCreateResponse> {
  const { apiKey, baseId } = getAirtableConfig();
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable destination record failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return a destination record ID");
  return record;
}

async function listAirtableRecords(
  tableId: string,
  options: { fields?: string[]; maxRecords?: number } = {},
): Promise<AirtableRecord[]> {
  const { apiKey, baseId } = getAirtableConfig();
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    if (options.maxRecords) params.set("maxRecords", String(options.maxRecords));
    for (const field of options.fields ?? []) params.append("fields[]", field);
    if (offset) params.set("offset", offset);

    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Airtable list failed: ${res.status} ${text.slice(0, 240)}`);
    }

    const data = (await res.json()) as AirtableListResponse;
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset && (!options.maxRecords || records.length < options.maxRecords));

  return options.maxRecords ? records.slice(0, options.maxRecords) : records;
}

function mapTurnRepairRecord(record: AirtableRecord): TurnRepairRecord {
  const fields = record.fields;
  const property = linkedRecordLabel(fields.Property);
  return {
    id: record.id,
    repair: stringValue(fields.Repair),
    property,
    area: stringValue(fields["Area / Location"]),
    contractor: stringValue(fields.Contractor),
    notes: stringValue(fields.Notes),
    materialStatus: stringValue(fields["Material Status"]),
    materialsNeeded: stringValue(fields["Materials Needed"]),
    priority: stringValue(fields.Priority),
    status: stringValue(fields.Status),
    photos: attachmentUrls(fields.Photos),
    majorItem: stringValue(fields.Priority).toLowerCase().includes("major"),
  };
}

function mapCaptureItemReview(record: AirtableRecord): TurnRepairReviewItem {
  return {
    id: record.id,
    title: stringValue(record.fields["Capture Item"]),
    status: stringValue(record.fields["Review Status"]),
    property: stringValue(record.fields["Property Label"]),
    repair: stringValue(record.fields.Repair),
    area: stringValue(record.fields["Area / Location"]),
    contractor: stringValue(record.fields.Contractor),
    notes: stringValue(record.fields.Notes),
    materialStatus: stringValue(record.fields["Material Status"]),
    materialsNeeded: stringValue(record.fields["Materials Needed"]),
    priority: stringValue(record.fields["Priority / Major Item"]),
    targetDate: stringValue(record.fields["Target Date"]),
    nextAction: stringValue(record.fields["Next Action"]),
    waitingOn: stringValue(record.fields["Waiting On"]),
    majorItem: stringValue(record.fields["Priority / Major Item"]).toLowerCase().includes("major"),
    uploadedPhotoUrls: stringValue(record.fields["Photo URLs"])
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean),
  };
}

function mapReviewItem(record: AirtableRecord): TurnRepairReviewItem | null {
  const extracted = parseExtractedData(record.fields["Extracted Data"]);
  if (extracted.source_type !== "turn_repair_capture") return null;

  return {
    id: record.id,
    title: stringValue(record.fields["Review Item"]),
    status: stringValue(record.fields.Status),
    property: stringValue(extracted.property),
    repair: stringValue(extracted.repair),
    area: stringValue(extracted.area),
    contractor: stringValue(extracted.contractor),
    notes: stringValue(extracted.notes),
    materialStatus: stringValue(extracted.materialStatus),
    materialsNeeded: stringValue(extracted.materialsNeeded),
    priority: stringValue(extracted.priority),
    targetDate: stringValue(extracted.targetDate),
    nextAction: stringValue(extracted.nextAction),
    waitingOn: stringValue(extracted.waitingOn),
    majorItem: extracted.majorItem === true,
    uploadedPhotoUrls: Array.isArray(extracted.uploadedPhotoUrls)
      ? extracted.uploadedPhotoUrls.filter((url): url is string => typeof url === "string")
      : [],
    createdTime: stringValue(record.fields["Created Time"]),
  };
}

function extractPropertyId(record: AirtableRecord): string | null {
  const extracted = parseExtractedData(record.fields["Extracted Data"]);
  const propertyId = stringValue(extracted.propertyId);
  return /^rec[a-zA-Z0-9]{14,}$/.test(propertyId) ? propertyId : null;
}

function buildPromotedTurnRepairNotes(item: TurnRepairReviewItem, reviewRecordId: string): string {
  return [
    `[${new Date().toISOString().slice(0, 10)} Portal capture]`,
    `Review row: ${reviewRecordId}`,
    item.targetDate && `Target date: ${item.targetDate}`,
    item.nextAction && `Next action: ${item.nextAction}`,
    item.waitingOn && `Waiting on: ${item.waitingOn}`,
    item.notes && `Notes: ${item.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function attachmentUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const url = (item as { url?: unknown }).url;
      return typeof url === "string" ? url : "";
    })
    .filter(Boolean);
}

function linkedRecordLabel(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const name = (item as { name?: unknown }).name;
          return typeof name === "string" ? name : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  return stringValue(value);
}

function removeUndefined(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function parseExtractedData(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function validateRecordId(value: string, field: string): void {
  if (!/^rec[a-zA-Z0-9]{14,}$/.test(value)) {
    throw new Error(`Invalid ${field}`);
  }
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}
