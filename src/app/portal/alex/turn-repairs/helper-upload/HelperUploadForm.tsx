"use client";

import { useState } from "react";
import type { TurnRepairProperty } from "@/lib/portal/alex/turn-repairs";

interface Props {
  properties: TurnRepairProperty[];
  helperToken?: string;
  helperName?: string;
}

interface SaveResult {
  recordId?: string;
  storedFileNames?: string[];
  error?: string;
}

export default function HelperUploadForm({ properties, helperToken = "", helperName: defaultHelperName = "" }: Props) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [area, setArea] = useState("");
  const [helperName, setHelperName] = useState(defaultHelperName);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    const property = properties.find((candidate) => candidate.id === propertyId) ?? properties[0];

    try {
      const form = new FormData();
      form.set("propertyId", property?.id ?? "");
      form.set("propertyLabel", property?.label ?? "");
      form.set("sessionType", "Helper inspection");
      form.set("sessionDate", new Date().toISOString().slice(0, 10));
      form.set("area", area);
      form.set("contractor", "");
      form.set("repair", `Helper upload${area ? ` - ${area}` : ""}`);
      form.set("notes", notes);
      form.set("materialsNeeded", "");
      form.set("materialStatus", "");
      form.set("priority", "");
      form.set("targetDate", "");
      form.set("nextAction", "Alex review helper upload");
      form.set("waitingOn", "Alex");
      form.set("majorItem", "false");
      form.set("promotePreference", "review");
      form.set("uploadedBy", helperName || "Helper");
      files.forEach((file) => form.append("photos", file));

      const endpoint = helperToken
        ? `/api/portal/alex/turn-repairs/capture-items?helperToken=${encodeURIComponent(helperToken)}`
        : "/api/portal/alex/turn-repairs/capture-items";

      const res = await fetch(endpoint, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as SaveResult;
      if (!res.ok) throw new Error(data.error || "Helper upload could not be saved");
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Helper upload could not be saved" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5">
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property">
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClassName}>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Helper name">
            <input value={helperName} onChange={(e) => setHelperName(e.target.value)} className={inputClassName} />
          </Field>
        </div>

        <Field label="Area / location">
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Kitchen, exterior, upstairs bath..." className={inputClassName} />
        </Field>

        <Field label="Notes for Alex">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="What should Alex know about these photos?" className={inputClassName} />
        </Field>

        <Field label="Photos">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          />
        </Field>

        <div className="rounded-lg border border-border bg-surface-elevated p-4 text-sm leading-6 text-cream-muted">
          Helper uploads can only stage photos and notes. They do not expose Airtable records, costs,
          security-deposit notes, or edit controls.
        </div>

        <button type="submit" disabled={saving} className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
          {saving ? "Submitting..." : "Submit for Alex review"}
        </button>

        {result && (
          <div className={`rounded-lg border p-4 text-sm ${result.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>
            {result.error || `Helper upload staged: ${result.recordId}`}
          </div>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
