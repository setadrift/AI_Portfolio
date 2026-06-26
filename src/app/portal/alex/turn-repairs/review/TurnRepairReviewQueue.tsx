"use client";

import { useState } from "react";
import type { TurnRepairReviewItem } from "@/lib/portal/alex/turn-repairs";

interface Props {
  initialItems: TurnRepairReviewItem[];
}

export default function TurnRepairReviewQueue({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(initialItems.map((item) => [item.id, item])));
  const [message, setMessage] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function updateDraft(itemId: string, patch: Partial<TurnRepairReviewItem>) {
    setDrafts((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? items.find((item) => item.id === itemId)),
        ...patch,
      } as TurnRepairReviewItem,
    }));
  }

  async function save(item: TurnRepairReviewItem) {
    const draft = drafts[item.id] ?? item;
    setSavingId(item.id);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/review-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewRecordId: item.id,
          action: "save",
          repair: draft.repair,
          area: draft.area,
          contractor: draft.contractor,
          notes: draft.notes,
          materialsNeeded: draft.materialsNeeded,
          materialStatus: draft.materialStatus,
          priority: draft.priority,
          targetDate: draft.targetDate,
          nextAction: draft.nextAction,
          waitingOn: draft.waitingOn,
          majorItem: draft.majorItem,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Save failed");
      setItems((current) => current.map((candidate) => (candidate.id === item.id ? draft : candidate)));
      setMessage(`Review item saved: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function skip(item: TurnRepairReviewItem) {
    if (!window.confirm("Skip this staged capture as duplicate or not useful?")) return;
    setSavingId(item.id);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/review-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewRecordId: item.id, action: "skip" }),
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Skip failed");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setMessage(`Review item skipped: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Skip failed");
    } finally {
      setSavingId(null);
    }
  }

  async function promote(item: TurnRepairReviewItem) {
    setPromotingId(item.id);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewRecordId: item.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        turnRepairRecordId?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Promotion failed");
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setMessage(`Promoted to sandbox Turn Repairs: ${data.turnRepairRecordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion failed");
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Pending capture reviews</h2>
          <p className="mt-1 text-sm text-cream-muted">
            These are staged portal captures from the sandbox capture tables and review fallback.
          </p>
        </div>
        {message && (
          <p className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-cream-muted">
            {message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const draft = drafts[item.id] ?? item;
          return (
          <article key={item.id} className="rounded-lg border border-border bg-surface-elevated p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{draft.repair || draft.title}</h3>
                <p className="mt-1 text-sm text-cream-muted">
                  {[draft.property, draft.area, draft.contractor].filter(Boolean).join(" / ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => save(item)}
                  disabled={savingId === item.id}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
                >
                  {savingId === item.id ? "Saving..." : "Save cleanup"}
                </button>
                <button
                  type="button"
                  onClick={() => skip(item)}
                  disabled={savingId === item.id}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => promote(draft)}
                  disabled={promotingId === item.id}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {promotingId === item.id ? "Promoting..." : "Promote to Turn Repairs"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Repair">
                <input value={draft.repair} onChange={(event) => updateDraft(item.id, { repair: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Area / Location">
                <input value={draft.area} onChange={(event) => updateDraft(item.id, { area: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Contractor">
                <input value={draft.contractor} onChange={(event) => updateDraft(item.id, { contractor: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Material Status">
                <select value={draft.materialStatus} onChange={(event) => updateDraft(item.id, { materialStatus: event.target.value })} className={inputClassName}>
                  <option value="">Not set</option>
                  <option>Need to Buy</option>
                  <option>Purchased</option>
                  <option>On Hand</option>
                  <option>Not Needed</option>
                </select>
              </Field>
              <Field label="Materials Needed">
                <textarea value={draft.materialsNeeded} onChange={(event) => updateDraft(item.id, { materialsNeeded: event.target.value })} rows={2} className={inputClassName} />
              </Field>
              <Field label="Notes">
                <textarea value={draft.notes} onChange={(event) => updateDraft(item.id, { notes: event.target.value })} rows={2} className={inputClassName} />
              </Field>
              <Field label="Priority / Major Item">
                <input value={draft.priority} onChange={(event) => updateDraft(item.id, { priority: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Target Date">
                <input type="date" value={draft.targetDate} onChange={(event) => updateDraft(item.id, { targetDate: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Next Action">
                <input value={draft.nextAction} onChange={(event) => updateDraft(item.id, { nextAction: event.target.value })} className={inputClassName} />
              </Field>
              <Field label="Waiting On">
                <input value={draft.waitingOn} onChange={(event) => updateDraft(item.id, { waitingOn: event.target.value })} className={inputClassName} />
              </Field>
            </div>
            {!!item.uploadedPhotoUrls.length && (
              <p className="mt-3 text-sm text-cream-muted">
                {item.uploadedPhotoUrls.length} uploaded photo link(s) will be attached on promotion.
              </p>
            )}
          </article>
        );
        })}

        {!items.length && (
          <div className="rounded-lg border border-border bg-surface-elevated p-4 text-sm text-cream-muted">
            No pending portal capture reviews found. Use the Capture page to stage a new item.
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
