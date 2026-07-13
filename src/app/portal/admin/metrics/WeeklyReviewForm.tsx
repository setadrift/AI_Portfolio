"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConsultingOfferRecord } from "@/lib/portal/admin/acquisition";

const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export default function WeeklyReviewForm({
  weekStart,
  initialLesson,
  initialOfferId,
  offers,
  metrics,
}: {
  weekStart: string;
  initialLesson: string;
  initialOfferId: string;
  offers: ConsultingOfferRecord[];
  metrics: Record<string, unknown>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <h2 className="font-semibold text-foreground">
        Friday learning and Monday emphasis
      </h2>
      <p className="mt-1 text-sm text-cream-muted">
        Close the week with one acquisition lesson. Choose the offer to
        emphasize next week so the operating rhythm remains deliberate.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          const form = new FormData(event.currentTarget);
          const response = await fetch(
            "/api/portal/admin/consulting/weekly-snapshots",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                weekStart,
                lesson: String(form.get("lesson")),
                metrics: {
                  ...metrics,
                  primaryOfferId: String(form.get("offer")) || null,
                },
              }),
            },
          );
          const result = await response.json().catch(() => ({}));
          setBusy(false);
          setMessage(
            response.ok
              ? "Weekly review saved."
              : result.error || "Could not save the review.",
          );
          if (response.ok) router.refresh();
        }}
        className="mt-4 grid gap-3 lg:grid-cols-[1fr_.55fr_auto] lg:items-end"
      >
        <label className="text-xs font-semibold uppercase tracking-wide text-cream-dim">
          One acquisition lesson
          <textarea
            name="lesson"
            rows={3}
            defaultValue={initialLesson}
            placeholder="What produced movement, where did the funnel leak, and what changes next week?"
            className={`${inputClass} mt-1 normal-case tracking-normal`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-cream-dim">
          Primary offer emphasis
          <select
            name="offer"
            defaultValue={initialOfferId}
            className={`${inputClass} mt-1 normal-case tracking-normal`}
          >
            <option value="">Choose on Monday</option>
            {offers
              .filter((offer) => offer.active)
              .map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save weekly review"}
        </button>
      </form>
      {message ? <p className="mt-2 text-sm text-accent">{message}</p> : null}
    </section>
  );
}
