"use client";

import { useMemo, useState } from "react";
import type { AlexReceiptExtraction, AlexSourceType } from "@/lib/portal/alex/receipt-extraction";

type Stage = "input" | "extracting" | "review" | "saved";
type PromotionDestination = "maintenance_history" | "expenses" | "both" | "review_only";

interface ExtractResponse {
  extraction: AlexReceiptExtraction;
  canCreateSandboxReview: boolean;
  error?: string;
}

interface SaveResponse {
  recordId?: string;
  error?: string;
}

interface SandboxPropertyOption {
  id: string;
  name: string;
  address: string;
  label: string;
}

interface PropertiesResponse {
  properties?: SandboxPropertyOption[];
  suggestedPropertyId?: string | null;
  error?: string;
}

interface PromoteResponse {
  reviewRecordId?: string;
  maintenanceHistoryRecordId?: string;
  expenseRecordId?: string;
  error?: string;
}

const DEMO_TEXT =
  "Home Depot receipt for 125 Westridge Dr. Date 2026-06-19. Total $74.18. " +
  "Items: SW7057 paint, spackle, roller cover. For scrape and paint kitchen wall.";

const WORK_TYPES = [
  "Repair",
  "Replacement",
  "Inspection",
  "Preventive Maintenance",
  "Renovation",
  "Upgrade",
  "Service Visit",
];

const EXPENSE_CATEGORIES = [
  "Pest Control",
  "Lawn Care",
  "Insurance",
  "Utilities",
  "Repairs",
  "Supplies",
  "Other",
  "Accounting",
];

const PAID_BY_OPTIONS = ["", "Amex", "Check", "Zelle", "Other"];

const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function ReceiptExtractionDemo() {
  const [stage, setStage] = useState<Stage>("input");
  const [sourceType, setSourceType] = useState<AlexSourceType>("receipt");
  const [rawText, setRawText] = useState("");
  const [propertyContext, setPropertyContext] = useState("");
  const [repairContext, setRepairContext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<AlexReceiptExtraction | null>(null);
  const [canCreateSandboxReview, setCanCreateSandboxReview] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<SandboxPropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [destination, setDestination] = useState<PromotionDestination>("maintenance_history");
  const [workType, setWorkType] = useState("Repair");
  const [expenseCategory, setExpenseCategory] = useState("Repairs");
  const [paidBy, setPaidBy] = useState("");
  const [editableVendor, setEditableVendor] = useState("");
  const [editableDate, setEditableDate] = useState("");
  const [editableAmount, setEditableAmount] = useState("");
  const [editableWorkDescription, setEditableWorkDescription] = useState("");
  const [editableLineItems, setEditableLineItems] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<PromoteResponse | null>(null);

  const rawInputForSave = useMemo(() => {
    return [rawText, file ? `Uploaded file: ${file.name}` : ""].filter(Boolean).join("\n");
  }, [file, rawText]);

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRecordId(null);
    setExtraction(null);
    setStage("extracting");

    try {
      const form = new FormData();
      form.set("sourceType", sourceType);
      form.set("rawText", rawText);
      form.set("propertyContext", propertyContext);
      form.set("repairContext", repairContext);
      if (file) form.set("file", file);

      const res = await fetch("/api/portal/alex/receipts/extract", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as ExtractResponse;
      if (!res.ok) throw new Error(data.error || "Extraction failed");

      const defaultDestination = destinationForExtraction(data.extraction);
      setExtraction(data.extraction);
      setCanCreateSandboxReview(Boolean(data.canCreateSandboxReview));
      setDestination(defaultDestination);
      setEditableVendor(data.extraction.vendor ?? "");
      setEditableDate(data.extraction.date ?? "");
      setEditableAmount(data.extraction.amount === null ? "" : String(data.extraction.amount));
      setEditableWorkDescription(data.extraction.work_description ?? "");
      setEditableLineItems(data.extraction.line_items.join("\n"));
      setPromotionResult(null);
      await loadProperties(data.extraction);
      setStage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setStage("input");
    }
  }

  async function handleCreateReview() {
    if (!extraction) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/alex/receipts/create-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction,
          rawInput: rawInputForSave,
          propertyContext,
          repairContext,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResponse;
      if (!res.ok) throw new Error(data.error || "Sandbox review row could not be created");

      setRecordId(data.recordId ?? null);
      setStage("saved");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Extraction worked, but the sandbox review row could not be created.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleStartOver() {
    setStage("input");
    setError(null);
    setExtraction(null);
    setRecordId(null);
    setFile(null);
    setPromotionResult(null);
    setSelectedPropertyId("");
  }

  function loadDemoText() {
    setRawText(DEMO_TEXT);
    setPropertyContext("125 Westridge Dr");
    setRepairContext("Scrape and paint kitchen wall");
    setSourceType("receipt");
  }

  async function loadProperties(nextExtraction: AlexReceiptExtraction) {
    const params = new URLSearchParams();
    if (nextExtraction.property) params.set("property", nextExtraction.property);
    const context = [propertyContext, repairContext].filter(Boolean).join(" ");
    if (context) params.set("context", context);

    const res = await fetch(`/api/portal/alex/receipts/properties?${params}`);
    const data = (await res.json().catch(() => ({}))) as PropertiesResponse;
    if (!res.ok) throw new Error(data.error || "Sandbox properties could not be loaded");

    setProperties(data.properties ?? []);
    setSelectedPropertyId(data.suggestedPropertyId ?? "");
  }

  async function handlePromote() {
    if (!extraction || !recordId) return;
    setPromoting(true);
    setError(null);
    setPromotionResult(null);

    try {
      const res = await fetch("/api/portal/alex/receipts/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewRecordId: recordId,
          destination,
          propertyRecordId: destination === "review_only" ? null : selectedPropertyId,
          workType,
          category: expenseCategory,
          paidBy: paidBy || null,
          approvedFields: {
            vendor: editableVendor || null,
            date: editableDate || null,
            amount: editableAmount ? Number(editableAmount) : null,
            property: extraction.property,
            workDescription: editableWorkDescription || null,
            lineItems: editableLineItems
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            rawSummary: extraction.raw_summary,
            sourceType: extraction.source_type,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as PromoteResponse;
      if (!res.ok) throw new Error(data.error || "Sandbox records could not be created");

      setPromotionResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sandbox records could not be created");
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Something went wrong:</strong> {error}
        </div>
      )}

      <form onSubmit={handleExtract} className="rounded-2xl border border-border bg-surface p-5">
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Source type">
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as AlexSourceType)}
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="receipt">Receipt</option>
                <option value="invoice">Invoice</option>
                <option value="field_note">Field note</option>
                <option value="email">Email</option>
              </select>
            </Field>
            <Field label="Property/context">
              <input
                value={propertyContext}
                onChange={(e) => setPropertyContext(e.target.value)}
                placeholder="125 Westridge Dr"
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </Field>
            <Field label="Repair/context">
              <input
                value={repairContext}
                onChange={(e) => setRepairContext(e.target.value)}
                placeholder="Kitchen wall paint"
                className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </Field>
          </div>

          <Field
            label="Upload receipt image"
            hint="JPEG, PNG, WebP, or HEIC. If an iPhone HEIC fails, screenshot or save as JPEG for this prototype."
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
          </Field>

          <Field label="Paste receipt, invoice, email, or field-note text">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={7}
              placeholder={DEMO_TEXT}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={stage === "extracting"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stage === "extracting" ? "Extracting..." : "Extract"}
            </button>
            <button
              type="button"
              onClick={loadDemoText}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
            >
              Use demo text
            </button>
            {(extraction || recordId) && (
              <button
                type="button"
                onClick={handleStartOver}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </form>

      {extraction && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Review extraction</h2>
              <p className="mt-1 text-sm text-cream-muted">
                Nothing permanent has been written. Review this before creating a sandbox review item.
              </p>
            </div>
            <StatusPill>{extraction.confidence} confidence</StatusPill>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <ResultItem label="Vendor" value={extraction.vendor} />
            <ResultItem label="Date" value={extraction.date} />
            <ResultItem
              label="Amount"
              value={extraction.amount === null ? null : `$${extraction.amount.toFixed(2)}`}
            />
            <ResultItem label="Property" value={extraction.property} />
            <ResultItem label="Destination" value={extraction.recommended_destination} />
            <ResultItem label="Source type" value={extraction.source_type} />
          </dl>

          <div className="mt-6 rounded-xl border border-border bg-surface-elevated p-4">
            <h3 className="font-display text-xl">Approve sandbox writeback</h3>
            <p className="mt-1 text-sm text-cream-muted">
              These fields are editable before creating Maintenance History or Expenses records in
              the sandbox.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Vendor">
                <input
                  value={editableVendor}
                  onChange={(e) => setEditableVendor(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Date">
                <input
                  value={editableDate}
                  onChange={(e) => setEditableDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className={inputClassName}
                />
              </Field>
              <Field label="Amount">
                <input
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value)}
                  inputMode="decimal"
                  className={inputClassName}
                />
              </Field>
              <Field label="Destination">
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value as PromotionDestination)}
                  className={inputClassName}
                >
                  <option value="maintenance_history">Maintenance History</option>
                  <option value="expenses">Expenses</option>
                  <option value="both">Maintenance History + Expenses</option>
                  <option value="review_only">Review only</option>
                </select>
              </Field>
              {destination !== "review_only" && (
                <Field label="Property">
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Choose property...</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {(destination === "maintenance_history" || destination === "both") && (
                <Field label="Work type">
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className={inputClassName}
                  >
                    {WORK_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {(destination === "expenses" || destination === "both") && (
                <>
                  <Field label="Expense category">
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className={inputClassName}
                    >
                      {EXPENSE_CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Paid by">
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className={inputClassName}
                    >
                      {PAID_BY_OPTIONS.map((option) => (
                        <option key={option || "blank"} value={option}>
                          {option || "Not set"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Work description">
                <textarea
                  value={editableWorkDescription}
                  onChange={(e) => setEditableWorkDescription(e.target.value)}
                  rows={3}
                  className={inputClassName}
                />
              </Field>
              <Field label="Line items">
                <textarea
                  value={editableLineItems}
                  onChange={(e) => setEditableLineItems(e.target.value)}
                  rows={5}
                  className={inputClassName}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <TextBlock label="Summary" value={extraction.raw_summary} />
            <TextBlock label="Recommended action" value={extraction.recommended_action} />
            <TextBlock
              label="Missing or uncertain"
              value={
                extraction.missing_or_uncertain.length
                  ? extraction.missing_or_uncertain.join("\n")
                  : "None noted"
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCreateReview}
              disabled={!canCreateSandboxReview || saving || stage === "saved"}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating sandbox item..."
                : stage === "saved"
                  ? "Sandbox item created"
                  : "Create sandbox review item"}
            </button>
            {!canCreateSandboxReview && (
              <p className="text-sm text-cream-muted">
                Extraction is working. Airtable sandbox write is not configured in this environment.
              </p>
            )}
            {recordId && (
              <p className="text-sm text-cream-muted">Created sandbox review item: {recordId}</p>
            )}
          </div>

          {recordId && (
            <div className="mt-5 rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="font-display text-xl">Create destination record</h3>
              <p className="mt-1 text-sm text-cream-muted">
                This writes only to the sandbox base and marks the AI review item as processed.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePromote}
                  disabled={
                    promoting ||
                    Boolean(promotionResult) ||
                    (destination !== "review_only" && !selectedPropertyId)
                  }
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoting
                    ? "Writing sandbox records..."
                    : promotionResult
                      ? "Sandbox write complete"
                      : "Write approved data to sandbox"}
                </button>
                {destination !== "review_only" && !selectedPropertyId && (
                  <p className="text-sm text-cream-muted">Choose a property before writing.</p>
                )}
              </div>

              {promotionResult && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <strong>Sandbox write complete.</strong>
                  <ul className="mt-2 list-inside list-disc">
                    {promotionResult.maintenanceHistoryRecordId && (
                      <li>Maintenance History: {promotionResult.maintenanceHistoryRecordId}</li>
                    )}
                    {promotionResult.expenseRecordId && (
                      <li>Expenses: {promotionResult.expenseRecordId}</li>
                    )}
                    <li>Review item updated: {promotionResult.reviewRecordId}</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-5 text-cream-muted">{hint}</span>}
    </label>
  );
}

function ResultItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value || "Not found"}</dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-elevated p-3 text-sm leading-6 text-cream-muted">
        {value || "Not found"}
      </p>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium capitalize text-accent">
      {children}
    </span>
  );
}

function destinationForExtraction(extraction: AlexReceiptExtraction): PromotionDestination {
  if (extraction.recommended_destination === "Expenses") return "expenses";
  if (extraction.recommended_destination === "Maintenance History") return "maintenance_history";
  return "maintenance_history";
}
