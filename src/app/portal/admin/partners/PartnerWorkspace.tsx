"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  stageLabel,
  type AcquisitionData,
  type AcquisitionMetrics,
} from "@/lib/portal/admin/acquisition";

const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";

export default function PartnerWorkspace({
  initialData,
  metrics,
}: {
  initialData: AcquisitionData;
  metrics: AcquisitionMetrics;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function request(url: string, options: RequestInit) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Update failed.");
      setMessage("Saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Relationship pipeline
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Partners and warm network
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-cream-muted">
          Create trusted paths to work that never appears on a job board:
          overflow delivery, referrals, past-client expansion, and platform
          credibility.
        </p>
      </header>
      {message ? (
        <p
          className={
            message === "Saved."
              ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {message}
        </p>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-3">
        <Target
          label="Partner contacts"
          value={metrics.partnerContacts}
          target={metrics.partnerTarget}
        />
        <Target
          label="Warm conversations"
          value={metrics.warmConversations}
          target={metrics.warmTarget}
        />
        <Target
          label="Active relationships"
          value={
            initialData.partners.filter(
              (item) => item.relationshipStage === "active_partner",
            ).length
          }
          target={5}
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <NewPartner
            disabled={busy}
            onSubmit={(body) =>
              request("/api/portal/admin/consulting/partners", {
                method: "POST",
                body: JSON.stringify(body),
              })
            }
          />
          <section className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">Relationship list</h2>
              <p className="mt-1 text-sm text-cream-muted">
                Lead with a specific collaboration angle, not a generic
                introduction.
              </p>
            </div>
            {initialData.partners.length ? (
              <div className="divide-y divide-border">
                {initialData.partners.map((partner) => (
                  <article
                    key={partner.id}
                    className="grid gap-4 p-4 lg:grid-cols-[1fr_0.8fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{partner.organization}</p>
                        <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs text-accent">
                          {stageLabel(partner.relationshipStage)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-cream-muted">
                        {partner.name} · {stageLabel(partner.category)}
                      </p>
                      <p className="mt-2 text-sm leading-5 text-cream-muted">
                        {partner.overflowAngle ||
                          "Add the specific overflow or referral angle before contacting."}
                      </p>
                      <p className="mt-2 text-xs text-cream-dim">
                        Influenced{" "}
                        {
                          new Set(
                            initialData.activities
                              .filter(
                                (activity) =>
                                  activity.partnerId === partner.id &&
                                  activity.opportunityId,
                              )
                              .map((activity) => activity.opportunityId),
                          ).size
                        }{" "}
                        opportunities · {partner.referralsGiven} referrals given
                        · {partner.referralsReceived} received
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-dim">
                        Next action
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {partner.nextAction ||
                          "Research fit and choose one useful reason to connect."}
                      </p>
                      <p className="mt-1 text-xs text-cream-muted">
                        {partner.nextActionDueAt?.slice(0, 10) || "No date"}
                      </p>
                    </div>
                    <PartnerActivity
                      partnerId={partner.id}
                      disabled={busy}
                      onSubmit={(body) =>
                        request("/api/portal/admin/consulting/activities", {
                          method: "POST",
                          body: JSON.stringify(body),
                        })
                      }
                    />
                    <details className="border-t border-border pt-3 lg:col-span-3">
                      <summary className="cursor-pointer text-sm font-medium text-accent">
                        Update relationship details and next action
                      </summary>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          request(
                            `/api/portal/admin/consulting/partners/${partner.id}`,
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                relationshipStage: String(form.get("stage")),
                                geography: String(form.get("geography")),
                                clientFocus: String(form.get("clientFocus")),
                                complementaryCapabilities: String(
                                  form.get("capabilities"),
                                ),
                                overflowAngle: String(form.get("angle")),
                                contactUrl: String(form.get("url")) || null,
                                contactEmail: String(form.get("email")) || null,
                                relationshipStrength: Number(
                                  form.get("strength"),
                                ),
                                nextAction: String(form.get("nextAction")),
                                nextActionDueAt: form.get("dueAt")
                                  ? `${form.get("dueAt")}T13:00:00.000Z`
                                  : null,
                                referralsGiven: Number(form.get("given")),
                                referralsReceived: Number(form.get("received")),
                                notes: String(form.get("notes")),
                              }),
                            },
                          );
                        }}
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                      >
                        <select
                          name="stage"
                          defaultValue={partner.relationshipStage}
                          className={inputClass}
                        >
                          {[
                            "research",
                            "ready",
                            "contacted",
                            "warm",
                            "active_partner",
                            "dormant",
                          ].map((item) => (
                            <option key={item} value={item}>
                              {stageLabel(item)}
                            </option>
                          ))}
                        </select>
                        <input
                          name="geography"
                          defaultValue={partner.geography}
                          placeholder="Geography"
                          className={inputClass}
                        />
                        <input
                          name="clientFocus"
                          defaultValue={partner.clientFocus}
                          placeholder="Client focus"
                          className={inputClass}
                        />
                        <input
                          name="capabilities"
                          defaultValue={partner.complementaryCapabilities}
                          placeholder="Complementary capabilities"
                          className={inputClass}
                        />
                        <input
                          required
                          name="angle"
                          defaultValue={partner.overflowAngle}
                          placeholder="Specific collaboration angle"
                          className={inputClass}
                        />
                        <input
                          name="url"
                          type="url"
                          defaultValue={partner.contactUrl ?? ""}
                          placeholder="Public contact URL"
                          className={inputClass}
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={partner.contactEmail ?? ""}
                          placeholder="Contact email"
                          className={inputClass}
                        />
                        <input
                          name="strength"
                          type="number"
                          min="1"
                          max="5"
                          defaultValue={partner.relationshipStrength}
                          placeholder="Relationship strength 1–5"
                          className={inputClass}
                        />
                        <input
                          required
                          name="nextAction"
                          defaultValue={partner.nextAction ?? ""}
                          placeholder="Next action"
                          className={inputClass}
                        />
                        <input
                          name="dueAt"
                          type="date"
                          defaultValue={
                            partner.nextActionDueAt?.slice(0, 10) ?? ""
                          }
                          className={inputClass}
                        />
                        <input
                          name="given"
                          type="number"
                          min="0"
                          defaultValue={partner.referralsGiven}
                          placeholder="Referrals given"
                          className={inputClass}
                        />
                        <input
                          name="received"
                          type="number"
                          min="0"
                          defaultValue={partner.referralsReceived}
                          placeholder="Referrals received"
                          className={inputClass}
                        />
                        <textarea
                          name="notes"
                          defaultValue={partner.notes}
                          placeholder="Notes and useful links"
                          className={`${inputClass} sm:col-span-2`}
                        />
                        <button
                          disabled={busy}
                          className="w-fit rounded border border-border px-3 py-2 text-sm"
                        >
                          Save relationship
                        </button>
                      </form>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const opportunityId = String(
                            form.get("opportunityId"),
                          );
                          if (!opportunityId) return;
                          request("/api/portal/admin/consulting/activities", {
                            method: "POST",
                            body: JSON.stringify({
                              partnerId: partner.id,
                              opportunityId,
                              activityType: "partner_influence",
                              channel: "relationship",
                              occurredAt: new Date().toISOString(),
                              summary:
                                "Linked this relationship to an opportunity it influenced.",
                              outcome: "opportunity_influenced",
                              createdBy: "duncan",
                            }),
                          });
                        }}
                        className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row"
                      >
                        <select
                          required
                          name="opportunityId"
                          className={inputClass}
                        >
                          <option value="">
                            Link an influenced opportunity
                          </option>
                          {initialData.opportunities.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.organization}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={busy}
                          className="shrink-0 rounded border border-border px-3 py-2 text-sm"
                        >
                          Record influence
                        </button>
                      </form>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <p className="p-4 text-sm text-cream-muted">
                Add five carefully chosen partners for this week. Small
                accounting-tech and automation firms are the first priority.
              </p>
            )}
          </section>
        </div>
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Platform credibility</h2>
            <p className="mt-1 text-sm text-cream-muted">
              Treat programs as evidence milestones, not instant lead sources.
            </p>
          </div>
          <div className="divide-y divide-border">
            {initialData.programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                disabled={busy}
                onSave={(body) =>
                  request(
                    `/api/portal/admin/consulting/programs/${program.id}`,
                    { method: "PATCH", body: JSON.stringify(body) },
                  )
                }
              />
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function Target({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const width = Math.min(100, (value / target) * 100);
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-cream-dim">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {value}/{target}
          </p>
        </div>
        <span className="text-xs text-cream-muted">this week</span>
      </div>
      <div className="mt-3 h-1.5 rounded bg-surface-elevated">
        <div
          className="h-full rounded bg-accent"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function NewPartner({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-accent bg-accent-subtle p-3 text-left text-sm font-medium text-accent"
      >
        Add a targeted partner or warm contact
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
          category: String(form.get("category")),
          relationshipStage: "ready",
          geography: String(form.get("geography")),
          clientFocus: String(form.get("clientFocus")),
          complementaryCapabilities: String(form.get("capabilities")),
          overflowAngle: String(form.get("angle")),
          contactUrl: String(form.get("url")) || null,
          relationshipStrength: 1,
          referralsGiven: 0,
          referralsReceived: 0,
          nextAction: "Send a specific collaboration note after human review.",
          nextActionDueAt: `${form.get("dueAt")}T13:00:00.000Z`,
          notes: "",
        });
      }}
      className="rounded-md border border-border bg-surface p-4"
    >
      <div className="flex justify-between">
        <div>
          <h2 className="font-semibold">New relationship</h2>
          <p className="mt-1 text-sm text-cream-muted">
            Capture why working together would make sense.
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
        <input
          required
          name="name"
          placeholder="Person"
          className={inputClass}
        />
        <input
          required
          name="organization"
          placeholder="Organization"
          className={inputClass}
        />
        <select name="category" className={inputClass}>
          {[
            "accounting_technology",
            "bookkeeping_fractional_cfo",
            "automation_consultancy",
            "web_product_agency",
            "revops_crm_consultancy",
            "vertical_software_implementer",
            "independent_specialist",
            "platform_partner_program",
          ].map((item) => (
            <option key={item} value={item}>
              {stageLabel(item)}
            </option>
          ))}
        </select>
        <input
          name="geography"
          placeholder="Geography"
          className={inputClass}
        />
        <input
          name="clientFocus"
          placeholder="Client focus"
          className={inputClass}
        />
        <input
          name="capabilities"
          placeholder="Complementary capabilities"
          className={inputClass}
        />
        <input
          required
          name="angle"
          placeholder="Specific overflow/referral angle"
          className={inputClass}
        />
        <input
          name="url"
          type="url"
          placeholder="Public contact URL"
          className={inputClass}
        />
        <input
          required
          name="dueAt"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </div>
      <button
        disabled={disabled}
        className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm text-white"
      >
        Add relationship
      </button>
    </form>
  );
}

function PartnerActivity({
  partnerId,
  disabled,
  onSubmit,
}: {
  partnerId: string;
  disabled: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid h-fit gap-2">
      <button
        disabled={disabled}
        onClick={() =>
          onSubmit({
            partnerId,
            activityType: "email",
            channel: "email",
            occurredAt: new Date().toISOString(),
            summary:
              "Recorded a targeted partner contact after human review and sending.",
            outcome: "partner_contact",
            createdBy: "duncan",
          })
        }
        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-accent"
      >
        Record contact
      </button>
      <button
        disabled={disabled}
        onClick={() =>
          onSubmit({
            partnerId,
            activityType: "warm_intro",
            channel: "conversation",
            occurredAt: new Date().toISOString(),
            summary:
              "Recorded a meaningful warm-network or partner conversation.",
            outcome: "warm_conversation",
            createdBy: "duncan",
          })
        }
        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-accent"
      >
        Record warm conversation
      </button>
    </div>
  );
}

function ProgramCard({
  program,
  disabled,
  onSave,
}: {
  program: AcquisitionData["programs"][number];
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <a
            href={program.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground hover:text-accent"
          >
            {program.name}
          </a>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cream-dim">
            {stageLabel(program.status)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-cream-muted">
        {program.eligibilityRequirements}
      </p>
      <p className="mt-2 text-xs leading-5 text-cream-dim">
        <span className="font-semibold">Evidence required:</span>{" "}
        {program.evidenceRequired}
      </p>
      <p className="mt-3 text-sm text-foreground">
        <span className="font-medium">Next:</span> {program.nextAction}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onSave({
            status: String(form.get("status")),
            eligibilityRequirements: String(form.get("eligibility")),
            evidenceRequired: String(form.get("evidence")),
            nextAction: String(form.get("nextAction")),
            nextActionDueAt: form.get("dueAt")
              ? `${form.get("dueAt")}T13:00:00.000Z`
              : null,
            completedMilestones: String(form.get("milestones"))
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            applicationAt: form.get("applicationAt")
              ? `${form.get("applicationAt")}T13:00:00.000Z`
              : null,
            decision: String(form.get("decision")) || null,
            notes: String(form.get("notes")),
            verifiedAt: new Date().toISOString(),
          });
        }}
        className="mt-3 grid gap-2"
      >
        <select
          name="status"
          defaultValue={program.status}
          className={inputClass}
        >
          {[
            "research",
            "preparing",
            "ready_to_apply",
            "applied",
            "accepted",
            "not_yet_eligible",
            "declined",
          ].map((item) => (
            <option key={item} value={item}>
              {stageLabel(item)}
            </option>
          ))}
        </select>
        <textarea
          required
          name="eligibility"
          defaultValue={program.eligibilityRequirements}
          placeholder="Current eligibility requirements"
          className={inputClass}
        />
        <textarea
          required
          name="evidence"
          defaultValue={program.evidenceRequired}
          placeholder="Evidence required"
          className={inputClass}
        />
        <input
          name="nextAction"
          defaultValue={program.nextAction ?? ""}
          className={inputClass}
        />
        <input
          name="milestones"
          defaultValue={program.completedMilestones.join(", ")}
          placeholder="Completed milestones, comma separated"
          className={inputClass}
        />
        <input
          name="applicationAt"
          type="date"
          defaultValue={program.applicationAt?.slice(0, 10) ?? ""}
          className={inputClass}
        />
        <input
          name="decision"
          defaultValue={program.decision ?? ""}
          placeholder="Decision or result"
          className={inputClass}
        />
        <textarea
          name="notes"
          defaultValue={program.notes}
          placeholder="Notes, current requirements, and links"
          className={inputClass}
        />
        <input
          name="dueAt"
          type="date"
          defaultValue={program.nextActionDueAt?.slice(0, 10) ?? ""}
          className={inputClass}
        />
        <button
          disabled={disabled}
          className="w-fit rounded border border-border px-3 py-2 text-sm"
        >
          Save milestone
        </button>
      </form>
    </article>
  );
}
