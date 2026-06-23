export type AlexSourceType = "receipt" | "invoice" | "field_note" | "email";
export type AlexRecommendedDestination =
  | "Gmail Review Queue"
  | "Maintenance History"
  | "Expenses"
  | "Turn Repairs";
export type AlexConfidence = "high" | "medium" | "low";

export interface AlexReceiptExtractionInput {
  sourceType: AlexSourceType;
  rawText: string;
  propertyContext: string;
  repairContext: string;
  imageDataUrl?: string;
}

export interface AlexReceiptExtraction {
  source_type: AlexSourceType;
  vendor: string | null;
  date: string | null;
  amount: number | null;
  property: string | null;
  work_description: string | null;
  line_items: string[];
  recommended_destination: AlexRecommendedDestination;
  confidence: AlexConfidence;
  recommended_action: string;
  missing_or_uncertain: string[];
  raw_summary: string;
}

const SOURCE_TYPES = new Set(["receipt", "invoice", "field_note", "email"]);
const DESTINATIONS = new Set([
  "Gmail Review Queue",
  "Maintenance History",
  "Expenses",
  "Turn Repairs",
]);
const CONFIDENCE = new Set(["high", "medium", "low"]);

export function normalizeSourceType(value: FormDataEntryValue | null): AlexSourceType {
  const raw = typeof value === "string" ? value : "";
  return SOURCE_TYPES.has(raw) ? (raw as AlexSourceType) : "receipt";
}

export async function extractReceiptData(
  input: AlexReceiptExtractionInput,
): Promise<AlexReceiptExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const textParts = [
    "Extract structured data for a rental property workflow.",
    "This is a review-first prototype. Do not invent missing facts.",
    "Return only valid JSON matching the requested shape.",
    "",
    `Source type: ${input.sourceType}`,
    `Property/context: ${input.propertyContext || "not provided"}`,
    `Repair/context note: ${input.repairContext || "not provided"}`,
    "",
    "Raw text:",
    input.rawText || "(no pasted text provided)",
  ].join("\n");

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  > = [{ type: "text", text: textParts }];

  if (input.imageDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.imageDataUrl, detail: "high" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract receipts, invoices, email receipts, and field notes into conservative Airtable-ready review data. Use null for unknown values. recommended_destination must be one of Gmail Review Queue, Maintenance History, Expenses, or Turn Repairs. confidence must be high, medium, or low.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rental_receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              source_type: { type: "string", enum: ["receipt", "invoice", "field_note", "email"] },
              vendor: { type: ["string", "null"] },
              date: { type: ["string", "null"], description: "YYYY-MM-DD when known" },
              amount: { type: ["number", "null"] },
              property: { type: ["string", "null"] },
              work_description: { type: ["string", "null"] },
              line_items: { type: "array", items: { type: "string" } },
              recommended_destination: {
                type: "string",
                enum: ["Gmail Review Queue", "Maintenance History", "Expenses", "Turn Repairs"],
              },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              recommended_action: { type: "string" },
              missing_or_uncertain: { type: "array", items: { type: "string" } },
              raw_summary: { type: "string" },
            },
            required: [
              "source_type",
              "vendor",
              "date",
              "amount",
              "property",
              "work_description",
              "line_items",
              "recommended_destination",
              "confidence",
              "recommended_action",
              "missing_or_uncertain",
              "raw_summary",
            ],
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI extraction failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty extraction");
  }

  return validateExtraction(JSON.parse(content));
}

export function validateExtraction(value: unknown): AlexReceiptExtraction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid extraction payload");
  }

  const obj = value as Record<string, unknown>;
  const sourceType = obj.source_type;
  const destination = obj.recommended_destination;
  const confidence = obj.confidence;

  if (typeof sourceType !== "string" || !SOURCE_TYPES.has(sourceType)) {
    throw new Error("Invalid source_type");
  }
  if (typeof destination !== "string" || !DESTINATIONS.has(destination)) {
    throw new Error("Invalid recommended_destination");
  }
  if (typeof confidence !== "string" || !CONFIDENCE.has(confidence)) {
    throw new Error("Invalid confidence");
  }

  return {
    source_type: sourceType as AlexSourceType,
    vendor: nullableString(obj.vendor),
    date: nullableString(obj.date),
    amount: nullableNumber(obj.amount),
    property: nullableString(obj.property),
    work_description: nullableString(obj.work_description),
    line_items: stringArray(obj.line_items),
    recommended_destination: destination as AlexRecommendedDestination,
    confidence: confidence as AlexConfidence,
    recommended_action: requiredString(obj.recommended_action, "recommended_action"),
    missing_or_uncertain: stringArray(obj.missing_or_uncertain),
    raw_summary: requiredString(obj.raw_summary, "raw_summary"),
  };
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${field}`);
  }
  return value.trim();
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}
