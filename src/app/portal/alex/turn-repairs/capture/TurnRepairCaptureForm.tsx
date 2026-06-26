"use client";

import { useMemo, useState } from "react";
import type { TurnRepairProperty } from "@/lib/portal/alex/turn-repairs";

interface Props {
  properties: TurnRepairProperty[];
}

interface SaveResult {
  recordId?: string;
  uploadedPhotoUrls?: string[];
  storedFileNames?: string[];
  error?: string;
}

const sessionTypes = [
  "Initial turn inspection",
  "Contractor walkthrough",
  "Helper inspection",
  "End-of-day review",
  "Material run",
];

const materialStatuses = ["", "Need to Buy", "Purchased", "On Hand", "Not Needed"];
const priorities = ["", "Low", "Normal", "High", "Major Item"];

export default function TurnRepairCaptureForm({ properties }: Props) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [sessionType, setSessionType] = useState(sessionTypes[0]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [area, setArea] = useState("");
  const [contractor, setContractor] = useState("");
  const [repair, setRepair] = useState("");
  const [notes, setNotes] = useState("");
  const [materialsNeeded, setMaterialsNeeded] = useState("");
  const [materialStatus, setMaterialStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [majorItem, setMajorItem] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId) ?? properties[0],
    [properties, propertyId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const form = new FormData();
      form.set("propertyId", selectedProperty?.id ?? "");
      form.set("propertyLabel", selectedProperty?.label ?? "");
      form.set("sessionType", sessionType);
      form.set("sessionDate", sessionDate);
      form.set("area", area);
      form.set("contractor", contractor);
      form.set("repair", repair);
      form.set("notes", notes);
      form.set("materialsNeeded", materialsNeeded);
      form.set("materialStatus", materialStatus);
      form.set("priority", priority);
      form.set("targetDate", targetDate);
      form.set("nextAction", nextAction);
      form.set("waitingOn", waitingOn);
      form.set("majorItem", String(majorItem || priority === "Major Item"));
      form.set("promotePreference", "review");
      form.set("uploadedBy", "Alex");
      files.forEach((file) => form.append("photos", file));

      const res = await fetch("/api/portal/alex/turn-repairs/capture-items", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as SaveResult;
      if (!res.ok) throw new Error(data.error || "Capture could not be saved");
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Capture could not be saved" });
    } finally {
      setSaving(false);
    }
  }

  function loadDemo() {
    const demoProperty = properties.find((property) => property.label.includes("125")) ?? properties[0];
    setPropertyId(demoProperty?.id ?? "");
    setSessionType("Initial turn inspection");
    setArea("Kitchen");
    setContractor("Painter");
    setRepair("Scrape and paint kitchen wall");
    setNotes("Wall needs scrape, patch, and repaint before move-in. Photos should stay tied to this property/date session.");
    setMaterialsNeeded("SW7057 paint, spackle, roller cover");
    setMaterialStatus("Need to Buy");
    setPriority("High");
    setTargetDate("2026-07-03");
    setNextAction("Buy materials and confirm painter");
    setWaitingOn("Alex");
    setMajorItem(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
            <Field label="Session type">
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className={inputClassName}>
                {sessionTypes.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Session date">
              <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Area / location">
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Kitchen, upstairs bath, exterior..." className={inputClassName} />
            </Field>
            <Field label="Contractor">
              <input value={contractor} onChange={(e) => setContractor(e.target.value)} placeholder="Painter, HVAC, Alex..." className={inputClassName} />
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClassName}>
                {priorities.map((option) => (
                  <option key={option} value={option}>
                    {option || "Not set"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Repair title">
            <input value={repair} onChange={(e) => setRepair(e.target.value)} placeholder="Scrape and paint kitchen wall" className={inputClassName} />
          </Field>

          <Field label="Quick notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="What matters from the walkthrough?" className={inputClassName} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Materials needed">
              <textarea value={materialsNeeded} onChange={(e) => setMaterialsNeeded(e.target.value)} rows={3} className={inputClassName} />
            </Field>
            <Field label="Material status">
              <select value={materialStatus} onChange={(e) => setMaterialStatus(e.target.value)} className={inputClassName}>
                {materialStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option || "Not set"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target date">
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClassName} />
            </Field>
            <Field label="Waiting on">
              <input value={waitingOn} onChange={(e) => setWaitingOn(e.target.value)} placeholder="Alex, contractor, materials..." className={inputClassName} />
            </Field>
          </div>

          <Field label="Next action">
            <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Buy materials, get quote, schedule contractor..." className={inputClassName} />
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

          <label className="flex items-center gap-2 text-sm text-cream-muted">
            <input type="checkbox" checked={majorItem} onChange={(e) => setMajorItem(e.target.checked)} />
            Major item / needs special attention
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
              {saving ? "Saving capture..." : "Stage for review"}
            </button>
            <button type="button" onClick={loadDemo} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:border-accent">
              Load demo
            </button>
          </div>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="mb-2 font-display text-2xl">Review-first behavior</h2>
          <p className="text-sm leading-6 text-cream-muted">
            Saving here creates a sandbox review item. It does not directly mutate live Turn Repairs.
            If Blob storage is configured, photos are uploaded and linked in the review data.
          </p>
        </div>

        {files.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-medium">Selected photos</h2>
            <ul className="space-y-2 text-sm text-cream-muted">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="flex justify-between gap-3">
                  <span className="truncate">{file.name}</span>
                  <span>{Math.ceil(file.size / 1024)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-5 ${result.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-800"}`}>
            <h2 className="mb-2 font-medium">{result.error ? "Capture not saved" : "Capture staged"}</h2>
            <p className="text-sm leading-6">
              {result.error || `Review item created: ${result.recordId}`}
            </p>
            {!!result.storedFileNames?.length && (
              <p className="mt-2 text-sm">Files: {result.storedFileNames.join(", ")}</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
