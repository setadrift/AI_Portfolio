import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Confidence = "High" | "Medium" | "Low";

type Destination =
  | "Spreadsheet row"
  | "Monday board item"
  | "Future central record"
  | "Needs decision";

interface ExtractedField {
  label: string;
  value: string;
  confidence: Confidence;
  evidence: string;
}

interface Extraction {
  generatedBy: "openai" | "fallback";
  recordTitle: string;
  sourceSummary: string;
  confidence: Confidence;
  fields: ExtractedField[];
  missingFields: string[];
  reviewWarnings: string[];
  recommendedDestination: Destination;
  suggestedNextAction: string;
  rawText: string;
}

interface UploadedSource {
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
  text?: string;
  kind: "image" | "file" | "text";
}

type OpenAiContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string; detail?: "low" };

const CONFIDENCE_VALUES = new Set(["High", "Medium", "Low"]);
const DESTINATION_VALUES = new Set([
  "Spreadsheet row",
  "Monday board item",
  "Future central record",
  "Needs decision",
]);

const MAX_INPUT_CHARS = 20000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 30000;

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".xml"];
const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/csv",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".json": "application/json",
  ".md": "text/markdown",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".rtf": "application/rtf",
  ".txt": "text/plain",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recordTitle: { type: "string" },
    sourceSummary: { type: "string" },
    confidence: { type: "string", enum: ["High", "Medium", "Low"] },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          confidence: { type: "string", enum: ["High", "Medium", "Low"] },
          evidence: { type: "string" },
        },
        required: ["label", "value", "confidence", "evidence"],
      },
    },
    missingFields: { type: "array", items: { type: "string" } },
    reviewWarnings: { type: "array", items: { type: "string" } },
    recommendedDestination: {
      type: "string",
      enum: [
        "Spreadsheet row",
        "Monday board item",
        "Future central record",
        "Needs decision",
      ],
    },
    suggestedNextAction: { type: "string" },
  },
  required: [
    "recordTitle",
    "sourceSummary",
    "confidence",
    "fields",
    "missingFields",
    "reviewWarnings",
    "recommendedDestination",
    "suggestedNextAction",
  ],
};

export async function POST(req: NextRequest) {
  let rawText = "";
  let sourceLabel = "";
  let uploadedSource: UploadedSource | null = null;

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const textField = form.get("rawText");
      if (typeof textField === "string") rawText = textField;

      const labelField = form.get("sourceLabel");
      if (typeof labelField === "string") sourceLabel = labelField.trim();

      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        uploadedSource = await readUploadedSource(file);
        if (!sourceLabel) sourceLabel = uploadedSource.name;
        if (uploadedSource.text) {
          rawText = rawText
            ? `${rawText}\n\n${uploadedSource.text}`
            : uploadedSource.text;
        }
      }
    } else {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json(
          { error: "Send a JSON body with rawText, or upload a file." },
          { status: 400 },
        );
      }
      const parsed = body as Record<string, unknown>;
      if (typeof parsed.rawText === "string") rawText = parsed.rawText;
      if (typeof parsed.sourceLabel === "string") {
        sourceLabel = parsed.sourceLabel.trim();
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Could not read the request body." },
      { status: 400 },
    );
  }

  rawText = rawText.trim();
  if (rawText.length > MAX_INPUT_CHARS) {
    rawText = rawText.slice(0, MAX_INPUT_CHARS);
  }

  if (!rawText && !uploadedSource) {
    return NextResponse.json(
      { error: "Paste text or upload a file to extract from." },
      { status: 400 },
    );
  }

  const fallbackRawText =
    rawText ||
    `[Uploaded file: ${uploadedSource?.name || sourceLabel || "source file"}]`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      extraction: buildFallback(fallbackRawText, sourceLabel, [
        "Live GPT extraction is not configured on this deployment. This is a deterministic fallback; verify every field against the source.",
      ]),
    });
  }

  try {
    const extraction = await callOpenAi(
      apiKey,
      rawText,
      sourceLabel,
      uploadedSource,
      fallbackRawText,
    );
    return NextResponse.json({ extraction });
  } catch {
    return NextResponse.json({
      extraction: buildFallback(fallbackRawText, sourceLabel, [
        "Live GPT extraction was unavailable for this source, so this is a deterministic fallback. Verify every field against the source.",
      ]),
    });
  }
}

async function readUploadedSource(file: File): Promise<UploadedSource> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large.");
  }

  const name = file.name || "uploaded-file";
  const mimeType = file.type || mimeFromName(name);
  const lowerName = name.toLowerCase();
  const textLike =
    mimeType.startsWith("text/") ||
    TEXT_MIME_TYPES.has(mimeType) ||
    TEXT_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (textLike) {
    const text = await file.text();
    if (!text.includes("\u0000")) {
      return { name, mimeType, size: file.size, text, kind: "text" };
    }
  }

  const dataUrl = await fileToDataUrl(file, mimeType);
  return {
    name,
    mimeType,
    size: file.size,
    dataUrl,
    kind: mimeType.startsWith("image/") ? "image" : "file",
  };
}

async function callOpenAi(
  apiKey: string,
  rawText: string,
  sourceLabel: string,
  uploadedSource: UploadedSource | null,
  fallbackRawText: string,
): Promise<Extraction> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const content: OpenAiContent[] = [
    {
      type: "input_text",
      text: [
        "Extract review-ready fields from this messy business source.",
        `Source label: ${sourceLabel || uploadedSource?.name || "not provided"}`,
        uploadedSource
          ? `Uploaded source: ${uploadedSource.name} (${uploadedSource.mimeType})`
          : "",
        rawText ? `Pasted or extracted text:\n${rawText}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  if (uploadedSource?.dataUrl) {
    if (uploadedSource.kind === "image") {
      content.push({ type: "input_image", image_url: uploadedSource.dataUrl });
    } else {
      content.push({
        type: "input_file",
        filename: uploadedSource.name,
        file_data: uploadedSource.dataUrl,
        detail: "low",
      });
    }
  }

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You extract structured fields from messy business text, documents, spreadsheets, PDFs, and images for a review-first data-entry workflow.",
                  "Rules:",
                  "- Every field value must be directly traceable to the source. Quote or closely paraphrase the supporting evidence.",
                  "- If a value is inferred rather than stated, set confidence to Medium or Low and explain the inference in evidence.",
                  "- Never invent client names, amounts, dates, systems, approval status, owners, or destination systems.",
                  "- Put useful-but-absent fields in missingFields.",
                  "- Put anything a human should double-check in reviewWarnings.",
                  "- recommendedDestination must be one of: Spreadsheet row, Monday board item, Future central record, Needs decision. Prefer Needs decision unless the source clearly indicates a destination.",
                  "- confidence values must be exactly High, Medium, or Low.",
                ].join("\n"),
              },
            ],
          },
          { role: "user", content },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "willowops_data_entry_extraction",
            strict: true,
            schema: EXTRACTION_SCHEMA,
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed with status ${res.status}`);
    }

    const data = await res.json();
    const contentText = extractResponseText(data);
    if (!contentText) throw new Error("OpenAI returned an empty response");

    return coerceExtraction(JSON.parse(contentText), fallbackRawText);
  } finally {
    clearTimeout(timer);
  }
}

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const obj = data as Record<string, unknown>;
  if (typeof obj.output_text === "string") return obj.output_text;
  if (!Array.isArray(obj.output)) return "";

  for (const item of obj.output) {
    if (!item || typeof item !== "object") continue;
    const outputItem = item as Record<string, unknown>;
    if (!Array.isArray(outputItem.content)) continue;
    for (const contentItem of outputItem.content) {
      if (!contentItem || typeof contentItem !== "object") continue;
      const block = contentItem as Record<string, unknown>;
      if (typeof block.text === "string") return block.text;
    }
  }
  return "";
}

function coerceExtraction(value: unknown, rawText: string): Extraction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid extraction payload");
  }
  const obj = value as Record<string, unknown>;

  const confidence = coerceConfidence(obj.confidence);
  const destination = coerceDestination(obj.recommendedDestination);

  const fields: ExtractedField[] = Array.isArray(obj.fields)
    ? obj.fields
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .map((f) => ({
          label: safeString(f.label, "Untitled field"),
          value: safeString(f.value, ""),
          confidence: coerceConfidence(f.confidence),
          evidence: safeString(f.evidence, "No evidence provided."),
        }))
        .filter((f) => f.value.length > 0)
    : [];

  return {
    generatedBy: "openai",
    recordTitle: safeString(obj.recordTitle, "Untitled record"),
    sourceSummary: safeString(obj.sourceSummary, "No summary provided."),
    confidence,
    fields,
    missingFields: stringArray(obj.missingFields),
    reviewWarnings: stringArray(obj.reviewWarnings),
    recommendedDestination: destination,
    suggestedNextAction: safeString(
      obj.suggestedNextAction,
      "Review the extracted fields against the source.",
    ),
    rawText,
  };
}

function buildFallback(
  rawText: string,
  sourceLabel: string,
  warnings: string[],
): Extraction {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fields: ExtractedField[] = [];
  for (const line of lines) {
    if (fields.length >= 12) break;
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _\/&-]{1,40}):\s*(.+)$/);
    if (match && match[2].length <= 160) {
      fields.push({
        label: match[1].trim(),
        value: match[2].trim(),
        confidence: "Medium",
        evidence: `Found as a labelled line in the source: "${line.slice(0, 120)}"`,
      });
    }
  }

  const firstLine = lines[0] || "Uploaded source";
  const title =
    sourceLabel ||
    (firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine);

  return {
    generatedBy: "fallback",
    recordTitle: title,
    sourceSummary:
      rawText.length > 180 ? `${rawText.slice(0, 177)}...` : rawText,
    confidence: "Low",
    fields,
    missingFields: [
      "Automatic extraction did not run, so most fields still need to be identified manually.",
    ],
    reviewWarnings: warnings,
    recommendedDestination: "Needs decision",
    suggestedNextAction:
      "Review the source manually and re-run extraction once the GPT endpoint is available.",
    rawText,
  };
}

function fileToDataUrl(file: File, mimeType: string): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  });
}

function mimeFromName(name: string): string {
  const lowerName = name.toLowerCase();
  const extension = Object.keys(MIME_BY_EXTENSION).find((ext) =>
    lowerName.endsWith(ext),
  );
  return extension ? MIME_BY_EXTENSION[extension] : "application/octet-stream";
}

function coerceConfidence(value: unknown): Confidence {
  return typeof value === "string" && CONFIDENCE_VALUES.has(value)
    ? (value as Confidence)
    : "Low";
}

function coerceDestination(value: unknown): Destination {
  return typeof value === "string" && DESTINATION_VALUES.has(value)
    ? (value as Destination)
    : "Needs decision";
}

function safeString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}
