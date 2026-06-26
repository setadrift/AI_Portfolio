"use client";

import { useMemo, useState } from "react";
import type { TurnRepairRecord } from "@/lib/portal/alex/turn-repairs";

interface Props {
  initialRecords: TurnRepairRecord[];
}

const views = [
  "Material Shopping",
  "Contractor Walkthrough",
  "Contractor Call",
  "Completion Checklist",
  "Quick Note / Sketch Upload",
  "Maintenance Closeout",
] as const;
type ViewName = (typeof views)[number];

export default function TurnRepairWorkViews({ initialRecords }: Props) {
  const [records, setRecords] = useState(initialRecords);
  const [view, setView] = useState<ViewName>("Material Shopping");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [contractorFilter, setContractorFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const properties = unique(records.map((record) => record.property).filter(Boolean));
  const contractors = unique(records.map((record) => record.contractor).filter(Boolean));

  const filtered = useMemo(() => {
    return records
      .filter((record) => !propertyFilter || record.property === propertyFilter)
      .filter((record) => !contractorFilter || record.contractor === contractorFilter)
      .filter((record) => {
        if (view === "Material Shopping") {
          return (
            record.materialStatus === "Need to Buy" ||
            (!!record.materialsNeeded && record.materialStatus !== "Purchased")
          );
        }
        if (view === "Completion Checklist") return record.status !== "Done";
        if (view === "Maintenance Closeout") return record.status === "Done";
        return true;
      });
  }, [records, propertyFilter, contractorFilter, view]);

  async function stageUpdate(
    record: TurnRepairRecord,
    updateType: string,
    patch: Partial<TurnRepairRecord>,
    note?: string,
  ) {
    setMessage("Saving update to Airtable review queue...");

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/quick-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairId: record.id,
          repair: record.repair,
          property: record.property,
          updateType,
          note:
            note ||
            (updateType === "material_purchased"
              ? "Material status changed to Purchased from mobile work view."
              : "Repair marked Done from mobile completion checklist."),
          materialStatus: patch.materialStatus,
          status: patch.status,
          targetDate: patch.targetDate,
          scheduledDate: patch.scheduledDate,
          nextAction: patch.nextAction,
          waitingOn: patch.waitingOn,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Update could not be staged");
      setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, ...patch } : item)));
      setMessage(`Review item created: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update could not be staged");
    }
  }

  async function stageSketchNote(record: TurnRepairRecord, formData: FormData) {
    setMessage("Sketch/note staged locally. Saving to Airtable review queue...");
    formData.set("repairId", record.id);
    formData.set("repair", record.repair);
    formData.set("property", record.property);
    formData.set("updateType", "quick_note_sketch");

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/quick-update", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Sketch/note could not be staged");
      setMessage(`Review item created: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sketch/note could not be staged");
    }
  }

  async function stageMaintenanceCloseout(record: TurnRepairRecord) {
    setMessage("Creating Maintenance History closeout review...");

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/maintenance-closeout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repairId: record.id,
          repair: record.repair,
          property: record.property,
          area: record.area,
          contractor: record.contractor,
          notes: record.notes,
          completedAt: new Date().toISOString(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Maintenance closeout could not be staged");
      setMessage(`Maintenance History review item created: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Maintenance closeout could not be staged");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-4 font-display text-2xl">View</h2>
        <div className="grid gap-2">
          {views.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                view === option ? "bg-accent text-white" : "bg-surface-elevated text-cream-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          <Field label="Property">
            <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className={inputClassName}>
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property}>{property}</option>
              ))}
            </select>
          </Field>
          <Field label="Contractor">
            <select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} className={inputClassName}>
              <option value="">All contractors</option>
              {contractors.map((contractor) => (
                <option key={contractor}>{contractor}</option>
              ))}
            </select>
          </Field>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl">{view}</h2>
            <p className="mt-1 text-sm text-cream-muted">{filtered.length} items shown</p>
          </div>
          {message && <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-cream-muted">{message}</p>}
        </div>

        <div className="grid gap-3">
          {filtered.map((record) => (
            <article key={record.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl">{record.repair}</h3>
                  <p className="mt-1 text-sm text-cream-muted">
                    {[record.property, record.area, record.contractor].filter(Boolean).join(" / ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.priority && <Pill>{record.priority}</Pill>}
                  {record.materialStatus && <Pill>{record.materialStatus}</Pill>}
                  {record.status && <Pill>{record.status}</Pill>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm leading-6 text-cream-muted md:grid-cols-2">
                <Info label="Notes" value={record.notes || "No notes"} />
                <Info label="Materials" value={record.materialsNeeded || "No material list"} />
                <Info label="Next action" value={record.nextAction || "Not set"} />
                <Info label="Waiting on" value={record.waitingOn || "Not set"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {view === "Material Shopping" && record.materialStatus !== "Purchased" && (
                  <button
                    type="button"
                    onClick={() => stageUpdate(record, "material_purchased", { materialStatus: "Purchased" })}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Mark materials purchased
                  </button>
                )}
                {view === "Completion Checklist" && record.status !== "Done" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Stage this repair as Done for Alex review?")) {
                        stageUpdate(record, "mark_done", { status: "Done" });
                      }
                    }}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Mark done
                  </button>
                )}
              </div>

              {view === "Quick Note / Sketch Upload" && (
                <form
                  className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-elevated p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    stageSketchNote(record, new FormData(event.currentTarget));
                    event.currentTarget.reset();
                  }}
                >
                  <Field label="Quick note">
                    <textarea
                      name="note"
                      rows={3}
                      placeholder="Add Tul note, sketch context, contractor comment, or end-of-day detail..."
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Sketch / note photos">
                    <input
                      name="photos"
                      type="file"
                      accept="image/*"
                      multiple
                      className="w-full rounded-lg border border-dashed border-border bg-surface px-3 py-3 text-sm text-cream-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                    />
                  </Field>
                  <button
                    type="submit"
                    className="w-fit rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Stage note for review
                  </button>
                </form>
              )}
              {view === "Maintenance Closeout" && (
                <div className="mt-4 rounded-lg border border-border bg-surface-elevated p-4">
                  <p className="mb-3 text-sm leading-6 text-cream-muted">
                    Stage this completed repair for manual Maintenance History review. This does not
                    create accounting records or make security-deposit decisions.
                  </p>
                  <button
                    type="button"
                    onClick={() => stageMaintenanceCloseout(record)}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Stage Maintenance History review
                  </button>
                </div>
              )}
            </article>
          ))}
          {!filtered.length && (
            <div className="rounded-xl border border-border bg-surface p-6 text-sm text-cream-muted">
              No records match this view.
            </div>
          )}
        </div>
      </section>
    </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">{children}</span>;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const inputClassName =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
