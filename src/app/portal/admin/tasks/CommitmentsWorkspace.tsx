"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AcquisitionData,
  ConsultingCommitmentRecord,
  CommitmentStatus,
} from "@/lib/portal/admin/acquisition";

const openStatuses = new Set(["todo", "doing", "waiting"]);

export default function CommitmentsWorkspace({
  data,
}: {
  data: AcquisitionData;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  const open = data.commitments.filter((item) => openStatuses.has(item.status));
  const buckets = [
    {
      title: "Overdue",
      items: open.filter((item) => item.dueAt.slice(0, 10) < today),
    },
    {
      title: "Today",
      items: open.filter((item) => item.dueAt.slice(0, 10) === today),
    },
    {
      title: "Next 7 days",
      items: open.filter(
        (item) =>
          item.dueAt.slice(0, 10) > today && new Date(item.dueAt) <= week,
      ),
    },
    {
      title: "Later",
      items: open.filter((item) => new Date(item.dueAt) > week),
    },
  ];

  async function update(
    item: ConsultingCommitmentRecord,
    status: CommitmentStatus,
    dueAt?: string,
    endSequence = false,
  ) {
    setBusy(item.id);
    setMessage("");
    const response = await fetch(
      `/api/portal/admin/consulting/commitments/${item.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          endSequence,
          ...(dueAt
            ? { dueAt: new Date(`${dueAt}T17:00:00`).toISOString() }
            : {}),
        }),
      },
    );
    const result = await response.json().catch(() => ({}));
    setBusy(null);
    setMessage(
      response.ok
        ? status === "done"
          ? "Completed. The next cadence step was scheduled when applicable."
          : "Commitment updated."
        : result.error || "Update failed.",
    );
    if (response.ok) router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Operating queue
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Commitments
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-cream-muted">
          Complete, skip, reschedule, or end follow-up sequences. Drafting copy
          never changes a commitment.
        </p>
        {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {buckets.map((bucket) => (
          <section
            key={bucket.title}
            className="rounded-md border border-border bg-surface"
          >
            <div className="flex justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {bucket.title}
              </h2>
              <span className="text-sm text-cream-muted">
                {bucket.items.length}
              </span>
            </div>
            <div className="divide-y divide-border px-4">
              {bucket.items.length ? (
                bucket.items
                  .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
                  .map((item) => {
                    const relation = item.opportunityId
                      ? data.opportunities.find(
                          (row) => row.id === item.opportunityId,
                        )?.organization
                      : item.partnerId
                        ? data.partners.find((row) => row.id === item.partnerId)
                            ?.organization
                        : item.assetId
                          ? data.proofAssets.find(
                              (row) => row.id === item.assetId,
                            )?.title
                          : data.projects.find(
                              (row) => row.id === item.projectId,
                            )?.client;
                    return (
                      <article key={item.id} className="py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">
                            {item.title}
                          </p>
                          {item.sequenceStep ? (
                            <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs text-accent">
                              Day {item.sequenceStep}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cream-dim">
                          {relation || "Missing relation"} ·{" "}
                          {new Date(item.dueAt).toLocaleDateString("en-CA")}
                        </p>
                        {item.notes ? (
                          <p className="mt-2 text-sm leading-5 text-cream-muted">
                            {item.notes}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            disabled={busy === item.id}
                            onClick={() => update(item, "done")}
                            className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            disabled={busy === item.id}
                            onClick={() => update(item, "cancelled")}
                            className="rounded border border-border px-3 py-1.5 text-xs text-cream-muted"
                          >
                            Skip
                          </button>
                          {item.sequenceStep ? (
                            <button
                              disabled={busy === item.id}
                              onClick={() =>
                                update(item, "cancelled", undefined, true)
                              }
                              className="rounded border border-border px-3 py-1.5 text-xs text-cream-muted"
                            >
                              End sequence
                            </button>
                          ) : null}
                          <label className="flex items-center gap-2 rounded border border-border px-2 text-xs text-cream-muted">
                            Reschedule{" "}
                            <input
                              type="date"
                              defaultValue={item.dueAt.slice(0, 10)}
                              onChange={(event) =>
                                event.target.value &&
                                update(item, item.status, event.target.value)
                              }
                              className="bg-transparent py-1.5 text-foreground"
                            />
                          </label>
                        </div>
                      </article>
                    );
                  })
              ) : (
                <p className="py-4 text-sm text-cream-muted">Nothing here.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
