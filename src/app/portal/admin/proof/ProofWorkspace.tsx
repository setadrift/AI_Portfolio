"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  stageLabel,
  type AcquisitionData,
} from "@/lib/portal/admin/acquisition";

const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent";

export default function ProofWorkspace({
  initialData,
}: {
  initialData: AcquisitionData;
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
  const offerById = new Map(
    initialData.offers.map((offer) => [offer.id, offer]),
  );
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Buyer-facing evidence
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Proof and productized offers
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-cream-muted">
          Build evidence that helps a specific buyer trust a specific first
          engagement. Generic demos do not count.
        </p>
      </header>
      {message ? (
        <p
          className={
            message === "Saved."
              ? "rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {message}
        </p>
      ) : null}
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <NewAsset
            offers={initialData.offers}
            disabled={busy}
            onSubmit={(body) =>
              request("/api/portal/admin/consulting/proof-assets", {
                method: "POST",
                body: JSON.stringify(body),
              })
            }
          />
          <section className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-semibold">Proof pipeline</h2>
              <p className="mt-1 text-sm text-cream-muted">
                One strong asset each week, tied to a real buyer decision.
              </p>
            </div>
            <div className="divide-y divide-border">
              {initialData.proofAssets.map((asset) => (
                <article key={asset.id} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{asset.title}</h3>
                        <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs text-accent">
                          {stageLabel(asset.stage)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-cream-muted">
                        {asset.buyerDecision}
                      </p>
                    </div>
                    <select
                      disabled={busy}
                      value={asset.stage}
                      onChange={(event) =>
                        request(
                          `/api/portal/admin/consulting/proof-assets/${asset.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              stage: event.target.value,
                              publishedAt:
                                event.target.value === "published"
                                  ? new Date().toISOString()
                                  : asset.publishedAt,
                            }),
                          },
                        )
                      }
                      className="rounded-md border border-border bg-white px-2 py-1 text-sm"
                    >
                      {[
                        "idea",
                        "briefed",
                        "in_progress",
                        "review",
                        "published",
                        "retired",
                      ].map((stage) => (
                        <option key={stage} value={stage}>
                          {stageLabel(stage)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <Detail label="Buyer" value={asset.intendedBuyer} />
                    <Detail
                      label="Business problem"
                      value={asset.businessProblem}
                    />
                    <Detail
                      label="Controls and review"
                      value={asset.controlsAndReview}
                    />
                    <Detail
                      label="Expected outcome"
                      value={asset.expectedOutcome}
                    />
                  </dl>
                  <p className="mt-3 text-xs text-cream-dim">
                    Offer:{" "}
                    {offerById.get(asset.primaryOfferId || "")?.name ||
                      "Unassigned"}{" "}
                    · Reused {asset.reuseCount} times
                  </p>
                  {asset.reuseCount ? (
                    <ul className="mt-2 space-y-1 text-xs text-cream-muted">
                      {initialData.assetUses
                        .filter((use) => use.assetId === asset.id)
                        .map((use) => (
                          <li key={use.opportunityId}>
                            Used with{" "}
                            {initialData.opportunities.find(
                              (item) => item.id === use.opportunityId,
                            )?.organization || "opportunity"}{" "}
                            on {use.usedAt.slice(0, 10)}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  <details className="mt-4 border-t border-border pt-3">
                    <summary className="cursor-pointer text-sm font-medium text-accent">
                      Edit buyer-facing proof details
                    </summary>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        request(
                          `/api/portal/admin/consulting/proof-assets/${asset.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              intendedBuyer: String(form.get("buyer")),
                              buyerDecision: String(form.get("decision")),
                              scenarioLabel: String(form.get("scenario")),
                              businessProblem: String(form.get("problem")),
                              currentProcessCost: String(form.get("cost")),
                              proposedWorkflow: String(form.get("workflow")),
                              controlsAndReview: String(form.get("controls")),
                              expectedOutcome: String(form.get("outcome")),
                              primaryOfferId: String(form.get("offer")) || null,
                              publicUrl: String(form.get("url")) || null,
                            }),
                          },
                        );
                      }}
                      className="mt-3 grid gap-2"
                    >
                      <input
                        required
                        name="buyer"
                        defaultValue={asset.intendedBuyer}
                        placeholder="Intended buyer"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="decision"
                        defaultValue={asset.buyerDecision}
                        placeholder="Decision this helps them make"
                        className={inputClass}
                      />
                      <input
                        required
                        name="scenario"
                        defaultValue={asset.scenarioLabel}
                        placeholder="Real or representative scenario label"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="problem"
                        defaultValue={asset.businessProblem}
                        placeholder="Business problem"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="cost"
                        defaultValue={asset.currentProcessCost}
                        placeholder="Cost of the current process"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="workflow"
                        defaultValue={asset.proposedWorkflow}
                        placeholder="Proposed architecture or workflow"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="controls"
                        defaultValue={asset.controlsAndReview}
                        placeholder="Controls, exceptions, and human review"
                        className={inputClass}
                      />
                      <textarea
                        required
                        name="outcome"
                        defaultValue={asset.expectedOutcome}
                        placeholder="Expected or verified outcome"
                        className={inputClass}
                      />
                      <select
                        name="offer"
                        defaultValue={asset.primaryOfferId ?? ""}
                        className={inputClass}
                      >
                        <option value="">Primary offer</option>
                        {initialData.offers.map((offer) => (
                          <option key={offer.id} value={offer.id}>
                            {offer.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="url"
                        type="url"
                        defaultValue={asset.publicUrl ?? ""}
                        placeholder="Public URL when published"
                        className={inputClass}
                      />
                      <button
                        disabled={busy}
                        className="w-fit rounded border border-border px-3 py-2 text-sm"
                      >
                        Save proof details
                      </button>
                    </form>
                  </details>
                </article>
              ))}
            </div>
          </section>
        </div>
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Offers buyers can understand</h2>
            <p className="mt-1 text-sm text-cream-muted">
              Pricing stays unset until deliberately approved.
            </p>
          </div>
          <div className="divide-y divide-border">
            {initialData.offers.map((offer) => (
              <article key={offer.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{offer.name}</h3>
                  <span
                    className={
                      offer.active
                        ? "text-xs text-emerald-700"
                        : "text-xs text-cream-dim"
                    }
                  >
                    {offer.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-cream-muted">
                  {offer.outcome}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-cream-muted">
                  {offer.deliverables.map((item) => (
                    <li key={item}>— {item}</li>
                  ))}
                </ul>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    request(`/api/portal/admin/consulting/offers/${offer.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        durationText: String(form.get("duration")),
                        priceCents: form.get("price")
                          ? Math.round(Number(form.get("price")) * 100)
                          : null,
                        currencyCode: String(form.get("currency")) || null,
                      }),
                    });
                  }}
                  className="mt-4 grid gap-2 sm:grid-cols-3"
                >
                  <input
                    name="duration"
                    defaultValue={offer.durationText}
                    placeholder="Duration"
                    className={inputClass}
                  />
                  <input
                    name="price"
                    type="number"
                    min="0"
                    defaultValue={
                      offer.priceCents == null ? "" : offer.priceCents / 100
                    }
                    placeholder="Approved price"
                    className={inputClass}
                  />
                  <select
                    name="currency"
                    defaultValue={offer.currencyCode ?? ""}
                    className={inputClass}
                  >
                    <option value="">Currency</option>
                    <option>CAD</option>
                    <option>USD</option>
                    <option>GBP</option>
                  </select>
                  <button
                    disabled={busy}
                    className="w-fit rounded border border-border px-3 py-2 text-sm"
                  >
                    Save offer
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function NewAsset({
  offers,
  disabled,
  onSubmit,
}: {
  offers: AcquisitionData["offers"];
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
        Brief this week&apos;s proof asset
      </button>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          title: String(form.get("title")),
          assetType: String(form.get("type")),
          stage: "briefed",
          intendedBuyer: String(form.get("buyer")),
          buyerDecision: String(form.get("decision")),
          businessProblem: String(form.get("problem")),
          controlsAndReview: String(form.get("controls")),
          expectedOutcome: String(form.get("outcome")),
          primaryOfferId: String(form.get("offer")) || null,
          currentProcessCost: "To quantify during asset development.",
          proposedWorkflow: "To illustrate during asset development.",
          scenarioLabel: "Representative scenario",
        });
      }}
      className="rounded-md border border-border bg-surface p-4"
    >
      <div className="flex justify-between">
        <div>
          <h2 className="font-semibold">Proof brief</h2>
          <p className="mt-1 text-sm text-cream-muted">
            Start with the buyer and the decision, not the tooling.
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
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          required
          name="title"
          placeholder="Asset title"
          className={inputClass}
        />
        <select name="type" className={inputClass}>
          {[
            "case_study",
            "workflow_teardown",
            "architecture_diagram",
            "before_after_process_map",
            "implementation_checklist",
            "short_demo",
            "work_sample",
          ].map((type) => (
            <option key={type} value={type}>
              {stageLabel(type)}
            </option>
          ))}
        </select>
        <input
          required
          name="buyer"
          placeholder="Intended buyer"
          className={inputClass}
        />
        <select name="offer" className={inputClass}>
          <option value="">Primary offer</option>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.name}
            </option>
          ))}
        </select>
      </div>
      <textarea
        required
        name="decision"
        rows={2}
        placeholder="What decision should this help the buyer make?"
        className={`${inputClass} mt-2`}
      />
      <textarea
        required
        name="problem"
        rows={2}
        placeholder="Concrete business problem"
        className={`${inputClass} mt-2`}
      />
      <textarea
        required
        name="controls"
        rows={2}
        placeholder="Controls, exceptions, and human review"
        className={`${inputClass} mt-2`}
      />
      <textarea
        required
        name="outcome"
        rows={2}
        placeholder="Expected or verified outcome"
        className={`${inputClass} mt-2`}
      />
      <button
        disabled={disabled}
        className="mt-3 rounded bg-foreground px-4 py-2 text-sm text-white"
      >
        Create proof brief
      </button>
    </form>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-cream-dim">
        {label}
      </dt>
      <dd className="mt-1 leading-5 text-cream-muted">
        {value || "Not yet defined"}
      </dd>
    </div>
  );
}
