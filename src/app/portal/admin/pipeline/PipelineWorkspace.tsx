"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  stageLabel,
  type AcquisitionData,
  type ConsultingOpportunityRecord,
  type OpportunityStage,
  type OpportunityType,
} from "@/lib/portal/admin/acquisition";

const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const labelClass =
  "text-xs font-semibold uppercase tracking-[0.12em] text-cream-dim";

export default function PipelineWorkspace({
  initialData,
}: {
  initialData: AcquisitionData;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    initialData.opportunities[0]?.id ?? "",
  );
  const [filter, setFilter] = useState("active");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const opportunities = useMemo(
    () =>
      initialData.opportunities.filter((item) => {
        if (filter === "active")
          return !["won", "lost", "nurture"].includes(item.stage);
        return filter === "all" || item.stage === filter;
      }),
    [filter, initialData.opportunities],
  );
  const selected =
    opportunities.find((item) => item.id === selectedId) ??
    opportunities[0] ??
    null;
  const offerById = new Map(
    initialData.offers.map((offer) => [offer.id, offer]),
  );
  const activity = initialData.activities.filter(
    (item) => item.opportunityId === selected?.id,
  );
  const commitments = initialData.commitments.filter(
    (item) => item.opportunityId === selected?.id,
  );

  async function request(url: string, options: RequestInit) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "The update failed.");
      setMessage("Saved. The revenue queue is up to date.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Consulting acquisition
        </p>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Opportunity pipeline
            </h1>
            <p className="mt-1 text-sm text-cream-muted">
              One source of truth from qualified lead to discovery, proposal,
              and signed work.
            </p>
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-fit rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="active">Active pipeline</option>
            <option value="all">All opportunities</option>
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
      </header>
      {message ? (
        <p
          className={
            message.startsWith("Saved")
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {message}
        </p>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-4">
          <NewOpportunityForm
            offers={initialData.offers}
            disabled={saving}
            onSubmit={(body) =>
              request("/api/portal/admin/consulting/opportunities", {
                method: "POST",
                body: JSON.stringify(body),
              })
            }
          />
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold text-foreground">Pipeline</h2>
              <p className="mt-1 text-sm text-cream-muted">
                {opportunities.length} shown
              </p>
            </div>
            {opportunities.length ? (
              <div className="divide-y divide-border">
                {opportunities.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full px-4 py-3 text-left transition ${selected?.id === item.id ? "bg-accent-subtle" : "hover:bg-surface-elevated"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.organization}
                        </p>
                        <p className="mt-1 text-sm text-cream-muted">
                          {item.name}
                        </p>
                      </div>
                      <span className="rounded bg-white px-2 py-0.5 text-xs text-accent">
                        {stageLabel(item.stage)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-cream-muted">
                      {item.nextAction || "Missing next action"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-cream-muted">
                No opportunities in this view.
              </p>
            )}
          </div>
        </div>

        {selected ? (
          <div className="space-y-4">
            <OpportunityEditor
              key={selected.id}
              opportunity={selected}
              offers={initialData.offers}
              disabled={saving}
              onSave={(patch) =>
                request(
                  `/api/portal/admin/consulting/opportunities/${selected.id}`,
                  { method: "PATCH", body: JSON.stringify(patch) },
                )
              }
            />
            <section className="grid gap-4 lg:grid-cols-2">
              <ActivityPanel
                opportunity={selected}
                activities={activity}
                disabled={saving}
                onSubmit={(body) =>
                  request("/api/portal/admin/consulting/activities", {
                    method: "POST",
                    body: JSON.stringify({
                      ...body,
                      opportunityId: selected.id,
                    }),
                  })
                }
              />
              <CommitmentPanel
                opportunity={selected}
                commitments={commitments}
                disabled={saving}
                onComplete={(id) =>
                  request(`/api/portal/admin/consulting/commitments/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "done" }),
                  })
                }
                onCreate={(body) =>
                  request("/api/portal/admin/consulting/commitments", {
                    method: "POST",
                    body: JSON.stringify({
                      ...body,
                      opportunityId: selected.id,
                    }),
                  })
                }
              />
            </section>
            <section className="grid gap-4 lg:grid-cols-2">
              <ProofUsePanel
                opportunity={selected}
                data={initialData}
                disabled={saving}
                onUse={(body) =>
                  request("/api/portal/admin/consulting/proof-assets/use", {
                    method: "POST",
                    body: JSON.stringify(body),
                  })
                }
              />
              <HandoffPanel
                opportunity={selected}
                project={initialData.projects.find(
                  (item) => item.opportunityId === selected.id,
                )}
                disabled={saving}
                onHandoff={(body) =>
                  request(
                    `/api/portal/admin/consulting/opportunities/${selected.id}/handoff`,
                    { method: "POST", body: JSON.stringify(body) },
                  )
                }
              />
            </section>
            <section className="rounded-md border border-border bg-surface p-4">
              <h2 className="font-semibold text-foreground">
                Why this opportunity exists
              </h2>
              <p className="mt-2 text-sm leading-6 text-cream-muted">
                {selected.evidenceSummary || selected.painPoint}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-cream-dim">
                <span>{selected.sourceFamily}</span>
                {selected.sourceId ? (
                  <span>linked to {selected.sourceId} evidence</span>
                ) : (
                  <span>manually sourced</span>
                )}
                {selected.primaryOfferId ? (
                  <span>{offerById.get(selected.primaryOfferId)?.name}</span>
                ) : (
                  <span>No primary offer yet</span>
                )}
              </div>
            </section>
          </div>
        ) : (
          <section className="rounded-md border border-border bg-surface p-8 text-center text-sm text-cream-muted">
            Add an opportunity or change the filter.
          </section>
        )}
      </section>
    </div>
  );
}

function NewOpportunityForm({
  offers,
  disabled,
  onSubmit,
}: {
  offers: AcquisitionData["offers"];
  disabled: boolean;
  onSubmit: (body: Partial<ConsultingOpportunityRecord>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tomorrow] = useState(() =>
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  );
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-accent bg-accent-subtle px-4 py-3 text-left text-sm font-medium text-accent"
      >
        Add a warm, referral, or direct opportunity
      </button>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          name: String(form.get("name")),
          organization: String(form.get("organization")),
          opportunityType: String(form.get("type")) as OpportunityType,
          stage: "qualified",
          painPoint: String(form.get("pain")),
          evidenceSummary: String(form.get("pain")),
          sourceFamily: "manual",
          primaryOfferId: String(form.get("offer")) || null,
          nextAction: String(form.get("nextAction")),
          nextActionDueAt: `${form.get("dueAt")}T13:00:00.000Z`,
          notes: "Added manually from the acquisition pipeline.",
        });
      }}
      className="rounded-md border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">New opportunity</h2>
          <p className="mt-1 text-sm text-cream-muted">
            Use this for warm introductions, past clients, and direct
            conversations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-cream-muted"
        >
          Close
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Contact">
          <input required name="name" className={inputClass} />
        </Field>
        <Field label="Organization">
          <input required name="organization" className={inputClass} />
        </Field>
        <Field label="Opportunity type">
          <select name="type" className={inputClass}>
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {stageLabel(type)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary offer">
          <select name="offer" className={inputClass}>
            <option value="">Decide later</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Business problem">
        <textarea required name="pain" rows={2} className={inputClass} />
      </Field>
      <Field label="Next action">
        <input
          required
          name="nextAction"
          defaultValue="Send a tailored first response with one useful implementation observation."
          className={inputClass}
        />
      </Field>
      <Field label="Due">
        <input
          required
          name="dueAt"
          type="date"
          defaultValue={tomorrow}
          className={inputClass}
        />
      </Field>
      <button
        disabled={disabled}
        className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Create opportunity
      </button>
    </form>
  );
}

function OpportunityEditor({
  opportunity,
  offers,
  disabled,
  onSave,
}: {
  opportunity: ConsultingOpportunityRecord;
  offers: AcquisitionData["offers"];
  disabled: boolean;
  onSave: (patch: Partial<ConsultingOpportunityRecord>) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const stage = String(form.get("stage")) as OpportunityStage;
        onSave({
          stage,
          primaryOfferId: String(form.get("offer")) || null,
          estimatedValueCents: form.get("value")
            ? Math.round(Number(form.get("value")) * 100)
            : null,
          currencyCode: String(form.get("currency")) || null,
          probabilityPercent: Number(form.get("probability")) || null,
          nextAction: String(form.get("nextAction")),
          nextActionDueAt: form.get("dueAt")
            ? `${form.get("dueAt")}T13:00:00.000Z`
            : null,
          messageAngle: String(form.get("messageAngle")),
          discoveryAt: form.get("discoveryAt")
            ? `${form.get("discoveryAt")}T15:00:00.000Z`
            : null,
          proposalSentAt:
            stage === "proposal_sent"
              ? opportunity.proposalSentAt || new Date().toISOString()
              : opportunity.proposalSentAt,
          proposalReference: String(form.get("proposalReference")) || null,
          lossReason: stage === "lost" ? String(form.get("lossReason")) : null,
          notes: String(form.get("notes")),
        });
      }}
      className="rounded-md border border-border bg-surface"
    >
      <div className="border-b border-border px-4 py-3">
        <p className={labelClass}>{stageLabel(opportunity.opportunityType)}</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">
          {opportunity.organization}
        </h2>
        <p className="mt-1 text-sm text-cream-muted">
          {opportunity.name} · {opportunity.painPoint}
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field label="Stage">
          <select
            name="stage"
            defaultValue={opportunity.stage}
            className={inputClass}
          >
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary offer">
          <select
            name="offer"
            defaultValue={opportunity.primaryOfferId ?? ""}
            className={inputClass}
          >
            <option value="">Select before proposal</option>
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estimated value">
          <input
            name="value"
            type="number"
            min="0"
            defaultValue={
              opportunity.estimatedValueCents == null
                ? ""
                : opportunity.estimatedValueCents / 100
            }
            className={inputClass}
          />
        </Field>
        <Field label="Currency">
          <select
            name="currency"
            defaultValue={opportunity.currencyCode ?? ""}
            className={inputClass}
          >
            <option value="">Unknown</option>
            {["CAD", "USD", "GBP"].map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </Field>
        <Field label="Probability">
          <input
            name="probability"
            type="number"
            min="0"
            max="100"
            defaultValue={opportunity.probabilityPercent ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Next action due">
          <input
            name="dueAt"
            type="date"
            defaultValue={opportunity.nextActionDueAt?.slice(0, 10) ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="px-4 pb-4">
        <Field label="Next action">
          <textarea
            name="nextAction"
            rows={2}
            defaultValue={opportunity.nextAction ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Message angle (required when ready to contact)">
          <input
            name="messageAngle"
            defaultValue={opportunity.messageAngle}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discovery date">
            <input
              name="discoveryAt"
              type="date"
              defaultValue={opportunity.discoveryAt?.slice(0, 10) ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Proposal reference or URL">
            <input
              name="proposalReference"
              defaultValue={opportunity.proposalReference ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Loss reason (required only when lost)">
          <input
            name="lossReason"
            defaultValue={opportunity.lossReason ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={opportunity.notes}
            className={inputClass}
          />
        </Field>
        <button
          disabled={disabled}
          className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save opportunity
        </button>
      </div>
    </form>
  );
}

function ActivityPanel({
  opportunity,
  activities,
  disabled,
  onSubmit,
}: {
  opportunity: ConsultingOpportunityRecord;
  activities: AcquisitionData["activities"];
  disabled: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Activity</h2>
        <p className="mt-1 text-sm text-cream-muted">
          Record what actually happened. Drafting alone never counts as sent.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSubmit({
            activityType: String(form.get("type")),
            channel: String(form.get("channel")),
            summary: String(form.get("summary")),
            occurredAt: new Date().toISOString(),
            createdBy: "duncan",
          });
          event.currentTarget.reset();
        }}
        className="border-b border-border p-4"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <select name="type" className={inputClass}>
            {[
              "email",
              "comment",
              "dm",
              "application",
              "reply",
              "call",
              "proposal",
              "note",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input
            name="channel"
            placeholder="Channel"
            defaultValue={opportunity.sourceFamily}
            className={inputClass}
          />
        </div>
        <textarea
          required
          name="summary"
          rows={2}
          placeholder="What happened and what changed?"
          className={`${inputClass} mt-2`}
        />
        <button
          disabled={disabled}
          className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
        >
          Record activity
        </button>
      </form>
      <div className="max-h-72 divide-y divide-border overflow-auto p-4">
        {activities.length ? (
          activities.map((item) => (
            <div key={item.id} className="py-3 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {stageLabel(item.activityType)}
                </span>
                <span className="text-xs text-cream-dim">
                  {item.occurredAt.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-5 text-cream-muted">
                {item.summary}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-cream-muted">No activity recorded yet.</p>
        )}
      </div>
    </section>
  );
}

function CommitmentPanel({
  opportunity,
  commitments,
  disabled,
  onComplete,
  onCreate,
}: {
  opportunity: ConsultingOpportunityRecord;
  commitments: AcquisitionData["commitments"];
  disabled: boolean;
  onComplete: (id: string) => void;
  onCreate: (body: Record<string, unknown>) => void;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Next commitments</h2>
        <p className="mt-1 text-sm text-cream-muted">
          No active opportunity should depend on memory.
        </p>
      </div>
      <div className="divide-y divide-border p-4">
        {commitments.length ? (
          commitments.map((item) => (
            <div key={item.id} className="py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-cream-muted">
                    {item.dueAt.slice(0, 10)} · {item.status}
                  </p>
                </div>
                {!["done", "cancelled"].includes(item.status) ? (
                  <button
                    disabled={disabled}
                    onClick={() => onComplete(item.id)}
                    type="button"
                    className="rounded border border-border px-2 py-1 text-xs"
                  >
                    Complete
                  </button>
                ) : null}
              </div>
              {item.notes ? (
                <p className="mt-2 text-sm text-cream-muted">{item.notes}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-cream-muted">No commitments yet.</p>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onCreate({
            commitmentType: "follow_up",
            title: String(form.get("title")),
            dueAt: `${form.get("dueAt")}T13:00:00.000Z`,
            status: "todo",
            notes: `Manual next step for ${opportunity.organization}.`,
          });
          event.currentTarget.reset();
        }}
        className="border-t border-border p-4"
      >
        <input
          required
          name="title"
          placeholder="Add a concrete next step"
          className={inputClass}
        />
        <input
          required
          name="dueAt"
          type="date"
          className={`${inputClass} mt-2`}
        />
        <button
          disabled={disabled}
          className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
        >
          Add commitment
        </button>
      </form>
    </section>
  );
}

function ProofUsePanel({
  opportunity,
  data,
  disabled,
  onUse,
}: {
  opportunity: ConsultingOpportunityRecord;
  data: AcquisitionData;
  disabled: boolean;
  onUse: (body: Record<string, unknown>) => void;
}) {
  const uses = data.assetUses.filter(
    (item) => item.opportunityId === opportunity.id,
  );
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">Proof used</h2>
        <p className="mt-1 text-sm text-cream-muted">
          Tie evidence to the buyer conversation where it helped.
        </p>
      </div>
      <div className="p-4">
        {uses.length ? (
          <ul className="space-y-2 text-sm text-cream-muted">
            {uses.map((use) => (
              <li key={use.assetId}>
                —{" "}
                {data.proofAssets.find((asset) => asset.id === use.assetId)
                  ?.title || "Proof asset"}{" "}
                · {use.usedAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-cream-muted">No proof reused yet.</p>
        )}
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onUse({
              opportunityId: opportunity.id,
              assetId: String(form.get("assetId")),
              notes: String(form.get("notes")),
            });
          }}
        >
          <select required name="assetId" className={inputClass}>
            <option value="">Choose proof asset</option>
            {data.proofAssets
              .filter(
                (asset) =>
                  asset.stage === "published" || asset.stage === "review",
              )
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
          </select>
          <input
            name="notes"
            placeholder="How it was used"
            className={inputClass}
          />
          <button
            disabled={disabled}
            className="w-fit rounded border border-border px-3 py-2 text-sm"
          >
            Record reuse
          </button>
        </form>
      </div>
    </section>
  );
}

function HandoffPanel({
  opportunity,
  project,
  disabled,
  onHandoff,
}: {
  opportunity: ConsultingOpportunityRecord;
  project: AcquisitionData["projects"][number] | undefined;
  disabled: boolean;
  onHandoff: (body: Record<string, unknown>) => void;
}) {
  if (project)
    return (
      <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-semibold text-emerald-900">
          Project record linked
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          {project.project} · {project.status}. {project.nextAction}
        </p>
      </section>
    );
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <h2 className="font-semibold">Win and handoff</h2>
      <p className="mt-1 text-sm text-cream-muted">
        Creates the delivery project and first commitment. Confirm value and
        currency above first.
      </p>
      <form
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onHandoff({
            projectName: String(form.get("projectName")),
            nextAction: String(form.get("nextAction")),
            targetDate: String(form.get("targetDate")) || null,
          });
        }}
      >
        <input
          required
          name="projectName"
          defaultValue={`${opportunity.organization} automation engagement`}
          className={inputClass}
        />
        <input
          required
          name="nextAction"
          placeholder="First delivery action"
          className={inputClass}
        />
        <input name="targetDate" type="date" className={inputClass} />
        <button
          disabled={disabled}
          className="w-fit rounded bg-foreground px-3 py-2 text-sm text-white"
        >
          Confirm win and create project
        </button>
      </form>
    </section>
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
    <label className="mt-3 block">
      <span className={labelClass}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
