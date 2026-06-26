"use client";

import { useEffect, useMemo, useState } from "react";
import type { TurnRepairRecord } from "@/lib/portal/alex/turn-repairs";

interface Props {
  records: TurnRepairRecord[];
}

export default function ContractorSharePreview({ records }: Props) {
  const properties = unique(records.map((record) => record.property).filter(Boolean));
  const contractors = unique(records.map((record) => record.contractor).filter(Boolean));
  const [property, setProperty] = useState(properties[0] ?? "");
  const [contractor, setContractor] = useState(contractors[0] ?? "");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);
  const [previewBody, setPreviewBody] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const filtered = useMemo(() => {
    return records
      .filter((record) => !property || record.property === property)
      .filter((record) => !contractor || record.contractor === contractor)
      .filter((record) => !excluded.has(record.id));
  }, [records, property, contractor, excluded]);

  const emailBody = useMemo(() => {
    const lines = [
      `Repair list for ${property || "selected property"}`,
      contractor ? `Contractor: ${contractor}` : "",
      "",
      ...filtered.flatMap((record, index) => [
        `${index + 1}. ${record.area ? `${record.area}: ` : ""}${record.repair}`,
        record.notes ? `   Notes: ${record.notes}` : "",
        record.materialsNeeded ? `   Materials: ${record.materialsNeeded}` : "",
        record.photos.length ? `   Photos: ${record.photos.join(", ")}` : "",
        "",
      ]),
    ].filter(Boolean);
    return lines.join("\n");
  }, [filtered, property, contractor]);

  const activeBody = previewBody || emailBody;

  useEffect(() => {
    setPreviewBody("");
    setShareUrl("");
  }, [property, contractor, excluded]);

  function toggleRecord(recordId: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  }

  async function logShare() {
    setLogging(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/share-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property,
          contractor,
          itemCount: filtered.length,
          shareType: "email_draft",
          body: activeBody,
          itemIds: filtered.map((record) => record.id),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { recordId?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Share log could not be created");
      setMessage(`Share log created: ${data.recordId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Share log could not be created");
    } finally {
      setLogging(false);
    }
  }

  async function generatePreview() {
    setPreviewing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/portal/alex/turn-repairs/share-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property,
          contractor,
          excludedIds: [...excluded],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        body?: string;
        itemCount?: number;
        shareUrl?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Share preview could not be generated");
      setPreviewBody(data.body || "");
      setShareUrl(data.shareUrl || "");
      setMessage(`Preview generated with ${data.itemCount ?? 0} items.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Share preview could not be generated");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-display text-2xl">Filters</h2>
        <div className="grid gap-4">
          <Field label="Property">
            <select value={property} onChange={(e) => setProperty(e.target.value)} className={inputClassName}>
              <option value="">All properties</option>
              {properties.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Contractor">
            <select value={contractor} onChange={(e) => setContractor(e.target.value)} className={inputClassName}>
              <option value="">All contractors</option>
              {contractors.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-4">
          <h3 className="mb-2 font-medium">Do not expose</h3>
          <ul className="list-inside list-disc space-y-1 text-sm leading-6 text-cream-muted">
            <li>security-deposit notes</li>
            <li>internal pricing notes</li>
            <li>owner/accounting details</li>
            <li>unrelated properties</li>
            <li>edit access</li>
          </ul>
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl">{property || "Repair list"}</h2>
              <p className="mt-1 text-sm text-cream-muted">
                {contractor ? `For ${contractor}` : "Contractor-ready preview"} / {filtered.length} items
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(activeBody)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Copy email draft
            </button>
            <button
              type="button"
              onClick={generatePreview}
              disabled={previewing || !filtered.length}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              {previewing ? "Generating..." : "Generate preview"}
            </button>
            <button
              type="button"
              onClick={logShare}
              disabled={logging || !filtered.length}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              {logging ? "Logging..." : "Log share preview"}
            </button>
          </div>
          {message && (
            <p className="mb-4 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-cream-muted">
              {message}
            </p>
          )}
          {shareUrl && (
            <div className="mb-4 rounded-lg border border-border bg-surface-elevated p-4">
              <h3 className="mb-2 text-sm font-medium">Read-only contractor link</h3>
              <div className="flex flex-wrap gap-2">
                <a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent">
                  Open link
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(shareUrl)}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
                >
                  Copy link
                </button>
              </div>
              <p className="mt-2 break-all text-xs text-cream-muted">{shareUrl}</p>
            </div>
          )}

          <div className="space-y-3">
            {records
              .filter((record) => !property || record.property === property)
              .filter((record) => !contractor || record.contractor === contractor)
              .map((record) => {
                const isExcluded = excluded.has(record.id);
                return (
                  <article
                    key={record.id}
                    className={`rounded-lg border p-4 ${isExcluded ? "border-border bg-surface-elevated opacity-55" : "border-border bg-surface-elevated"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{record.repair}</h3>
                        <p className="mt-1 text-sm text-cream-muted">
                          {[record.area, record.materialsNeeded && "materials noted"].filter(Boolean).join(" / ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRecord(record.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-accent"
                      >
                        {isExcluded ? "Include" : "Remove"}
                      </button>
                    </div>
                    {record.notes && <p className="mt-3 text-sm leading-6 text-cream-muted">{record.notes}</p>}
                    {record.materialsNeeded && (
                      <p className="mt-2 text-sm leading-6 text-cream-muted">
                        <span className="font-medium text-foreground">Materials:</span> {record.materialsNeeded}
                      </p>
                    )}
                  </article>
                );
              })}
            {!filtered.length && (
              <div className="rounded-lg border border-border bg-surface-elevated p-4 text-sm text-cream-muted">
                No contractor share items match the selected filters.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="mb-3 font-display text-2xl">Email draft text</h2>
          <pre className="whitespace-pre-wrap rounded-lg bg-surface p-4 text-sm leading-6 text-cream-muted">{activeBody}</pre>
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

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

const inputClassName =
  "w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";
