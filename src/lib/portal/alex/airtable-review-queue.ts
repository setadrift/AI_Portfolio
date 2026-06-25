import type { AlexReceiptExtraction } from "@/lib/portal/alex/receipt-extraction";

export type AlexReceiptPromotionDestination =
  | "maintenance_history"
  | "expenses"
  | "both"
  | "review_only";

interface CreateReviewInput {
  extraction: AlexReceiptExtraction;
  rawInput: string;
  propertyContext: string;
  repairContext: string;
}

export interface SandboxPropertyOption {
  id: string;
  name: string;
  address: string;
  label: string;
}

interface PromoteReviewInput {
  reviewRecordId: string;
  destination: AlexReceiptPromotionDestination;
  propertyRecordId: string | null;
  workType: string | null;
  category: string | null;
  paidBy: string | null;
  approvedFields: {
    vendor: string | null;
    date: string | null;
    amount: number | null;
    property: string | null;
    workDescription: string | null;
    lineItems: string[];
    rawSummary: string | null;
    sourceType: string | null;
    invoiceNumber?: string | null;
  };
}

interface AirtableCreateResponse {
  id: string;
  fields?: Record<string, unknown>;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records?: AirtableRecord[];
  offset?: string;
}

const TABLE_IDS = {
  properties: "tblbmjduxvEAehDba",
  maintenanceHistory: "tblnp3n6sy6v1vn63",
  expenses: "tblEDS0U0I3T9TJgQ",
} as const;

export async function createSandboxReviewQueueItem(
  input: CreateReviewInput,
): Promise<AirtableCreateResponse> {
  const { apiKey, baseId, reviewTableId } = getAirtableConfig();

  const fields = buildReviewQueueFields(input);
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
    throw new Error(`Airtable review row failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = (await res.json()) as { records?: AirtableCreateResponse[] };
  const record = data.records?.[0];
  if (!record?.id) throw new Error("Airtable did not return a created record ID");
  return record;
}

export async function listSandboxProperties(): Promise<SandboxPropertyOption[]> {
  const records = await listAirtableRecords(TABLE_IDS.properties, {
    fields: ["Property Name", "Address", "City"],
    maxRecords: 200,
  });

  return records
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
}

export function findBestPropertyMatch(
  properties: SandboxPropertyOption[],
  propertyText: string | null,
  contextText: string,
): SandboxPropertyOption | null {
  const propertyNeedle = normalizeMatchText(propertyText ?? "");
  const contextNeedle = normalizeMatchText(contextText);
  if (!propertyNeedle && !contextNeedle) return null;

  const scored = properties
    .map((property) => {
      const name = normalizeMatchText(property.name);
      const address = normalizeMatchText(property.address);
      const label = normalizeMatchText(property.label);
      const score = Math.max(
        propertyMatchScore(propertyNeedle, name),
        propertyMatchScore(propertyNeedle, address),
        propertyMatchScore(propertyNeedle, label),
        propertyMatchScore(contextNeedle, name),
        propertyMatchScore(contextNeedle, address),
        propertyMatchScore(contextNeedle, label),
      );

      return { property, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.property ?? null;
}

export async function promoteSandboxReviewItem(input: PromoteReviewInput): Promise<{
  maintenanceHistoryRecordId?: string;
  expenseRecordId?: string;
  reviewRecordId: string;
}> {
  validateRecordId(input.reviewRecordId, "reviewRecordId");

  const properties = await listSandboxProperties();
  if (input.destination !== "review_only") {
    if (!input.propertyRecordId) {
      throw new Error("Choose a property before creating Airtable records.");
    }
    validateRecordId(input.propertyRecordId, "propertyRecordId");
    if (!properties.some((property) => property.id === input.propertyRecordId)) {
      throw new Error("Selected property was not found in the sandbox base.");
    }
  }

  const created: {
    maintenanceHistoryRecordId?: string;
    expenseRecordId?: string;
  } = {};

  const reviewRecord = await getReviewRecord(input.reviewRecordId);
  const extractedData = parseExtractedData(reviewRecord.fields["Extracted Data"]);

  try {
    if (input.destination === "maintenance_history" || input.destination === "both") {
      const maintenance = await createMaintenanceHistoryRecord(input);
      created.maintenanceHistoryRecordId = maintenance.id;
    }

    if (input.destination === "expenses" || input.destination === "both") {
      const expense = await createExpenseRecord(input);
      created.expenseRecordId = expense.id;
    }

    await updateReviewRecord(input.reviewRecordId, {
      Status: input.destination === "review_only" ? "Approved" : "Done",
      "Approval State": "approved_for_sandbox_write",
      "Approved For Write": true,
      "Processed At": new Date().toISOString(),
      "Related Record ID": [
        created.maintenanceHistoryRecordId &&
          `Maintenance History: ${created.maintenanceHistoryRecordId}`,
        created.expenseRecordId && `Expenses: ${created.expenseRecordId}`,
        input.destination === "review_only" && "Review only - no downstream record",
      ]
        .filter(Boolean)
        .join("\n"),
      "Extracted Data": JSON.stringify(
        {
          ...extractedData,
          promotion: {
            destination: input.destination,
            propertyRecordId: input.propertyRecordId,
            maintenanceHistoryRecordId: created.maintenanceHistoryRecordId ?? null,
            expenseRecordId: created.expenseRecordId ?? null,
            promotedAt: new Date().toISOString(),
          },
        },
        null,
        2,
      ),
      Error: "",
    });

    return {
      reviewRecordId: input.reviewRecordId,
      ...created,
    };
  } catch (error) {
    await updateReviewRecord(input.reviewRecordId, {
      Error: error instanceof Error ? error.message : "Promotion failed",
    }).catch(() => undefined);
    throw error;
  }
}

export function isSandboxReviewQueueConfigured(): boolean {
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

function buildReviewQueueFields(input: CreateReviewInput): Record<string, unknown> {
  const { extraction } = input;
  const reviewTitle =
    extraction.vendor || extraction.property || extraction.work_description || "AI receipt review";
  const contextLines = [
    input.propertyContext && `Property context: ${input.propertyContext}`,
    input.repairContext && `Repair/context: ${input.repairContext}`,
  ].filter(Boolean);

  return {
    "Review Item": reviewTitle,
    Status: "Needs Review",
    Category: categoryFor(extraction.source_type),
    Confidence: capitalize(extraction.confidence),
    "Suggested Destination": reviewQueueDestinationFor(extraction.recommended_destination),
    "AI Summary": [extraction.raw_summary, ...contextLines].join("\n"),
    "Recommended Action": extraction.recommended_action,
    "Extracted Data": JSON.stringify(extraction, null, 2),
    "Raw Input": input.rawInput || extraction.raw_summary,
    "Source Type": extraction.source_type,
    Vendor: extraction.vendor ?? undefined,
    Date: extraction.date ?? undefined,
    Amount: extraction.amount ?? undefined,
    "Work Description": extraction.work_description ?? undefined,
    "Line Items": extraction.line_items.join("\n"),
    "Approval State": "ready_for_review",
  };
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

async function createMaintenanceHistoryRecord(
  input: PromoteReviewInput,
): Promise<AirtableCreateResponse> {
  const propertyRecordId = input.propertyRecordId;
  if (!propertyRecordId) throw new Error("Property is required for Maintenance History.");

  const fields: Record<string, unknown> = removeUndefined({
    "Work Description": input.approvedFields.workDescription || "Receipt review item",
    Property: [propertyRecordId],
    "Date of Work": input.approvedFields.date ?? undefined,
    "Work Type": input.workType || "Repair",
    "Contractor Name": input.approvedFields.vendor ?? undefined,
    Cost: input.approvedFields.amount ?? undefined,
    "Invoice Number": input.approvedFields.invoiceNumber ?? undefined,
    Notes: buildDestinationNotes(input, "Maintenance History"),
  });

  return createAirtableRecord(TABLE_IDS.maintenanceHistory, fields);
}

async function createExpenseRecord(input: PromoteReviewInput): Promise<AirtableCreateResponse> {
  const propertyRecordId = input.propertyRecordId;
  if (!propertyRecordId) throw new Error("Property is required for Expenses.");

  const vendor = input.approvedFields.vendor || "Receipt";
  const date = input.approvedFields.date || "undated";
  const fields: Record<string, unknown> = removeUndefined({
    "Expense Name": `${vendor} - ${date}`,
    Category: input.category || "Repairs",
    Property: [propertyRecordId],
    Vendor: input.approvedFields.vendor ?? undefined,
    Amount: input.approvedFields.amount ?? undefined,
    "Date of Service": input.approvedFields.date ?? undefined,
    "Paid By": input.paidBy || undefined,
    "Invoice #": input.approvedFields.invoiceNumber ?? undefined,
    Notes: buildDestinationNotes(input, "Expenses"),
  });

  return createAirtableRecord(TABLE_IDS.expenses, fields);
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

function buildDestinationNotes(input: PromoteReviewInput, destination: string): string {
  return [
    `Created from Alex portal receipt review (${destination}).`,
    input.reviewRecordId && `Review row: ${input.reviewRecordId}`,
    input.approvedFields.rawSummary && `Summary: ${input.approvedFields.rawSummary}`,
    input.approvedFields.sourceType && `Source type: ${input.approvedFields.sourceType}`,
    input.approvedFields.property && `Extracted property: ${input.approvedFields.property}`,
    input.approvedFields.lineItems.length
      ? `Line items:\n${input.approvedFields.lineItems.join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function reviewQueueDestinationFor(destination: string): string {
  if (destination === "Maintenance History" || destination === "Expenses" || destination === "Turn Repairs") {
    return destination;
  }
  return "Unsure";
}

function categoryFor(sourceType: string): string {
  if (sourceType === "receipt" || sourceType === "invoice") return "Receipt / Invoice";
  if (sourceType === "field_note") return "Repair";
  if (sourceType === "email") return "Tenant Question";
  return "Other";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function removeUndefined(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseExtractedData(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return { previousExtractedData: value };
  }
}

function validateRecordId(value: string, field: string): void {
  if (!/^rec[a-zA-Z0-9]{14,}$/.test(value)) {
    throw new Error(`Invalid ${field}`);
  }
}

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(street)\b/g, "st")
    .replace(/\b(avenue)\b/g, "ave")
    .replace(/\b(drive)\b/g, "dr")
    .replace(/\b(road)\b/g, "rd")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function propertyMatchScore(query: string, candidate: string): number {
  if (!query || !candidate) return 0;

  const candidateNumber = firstStreetNumber(candidate);
  const queryNumbers = streetNumbers(query);
  if (candidateNumber && queryNumbers.size > 0 && !queryNumbers.has(candidateNumber)) {
    return 0;
  }

  if (query === candidate) return 120;
  if (query.includes(candidate)) return 110;
  if (candidate.includes(query)) return 100;

  const queryTokens = new Set(query.split(" ").filter(Boolean));
  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  const overlap = [...candidateTokens].filter((token) => queryTokens.has(token));
  return overlap.length >= 2 ? overlap.length * 10 : 0;
}

function firstStreetNumber(value: string): string | null {
  return value.split(" ").find((token) => /^\d+[a-z]?$/.test(token)) ?? null;
}

function streetNumbers(value: string): Set<string> {
  return new Set(value.split(" ").filter((token) => /^\d+[a-z]?$/.test(token)));
}
