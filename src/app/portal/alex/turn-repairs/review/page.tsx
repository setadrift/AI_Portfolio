import { listTurnRepairCaptureReviews } from "@/lib/portal/alex/turn-repairs";
import TurnRepairReviewQueue from "./TurnRepairReviewQueue";

const reviewSteps = [
  "Open staged capture sessions by property/date.",
  "Group photos into one repair item or split them into separate items.",
  "Clean up repair title, area, contractor, materials, status, target date, and next action.",
  "Promote approved items into Turn Repairs.",
  "Skip duplicates or leave unclear items in review.",
];

export default async function TurnRepairReviewPage() {
  const reviewItems = await listTurnRepairCaptureReviews().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Nightly review
      </p>
      <h1 className="mb-3 font-display text-4xl">Clean up field captures before they become records</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        This is the approval gate between fast phone capture and the main Turn Repairs list. It is
        the same review-first idea as the receipt tracker: messy input comes in quickly, then only
        approved information gets promoted.
      </p>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-display text-2xl">Review workflow</h2>
          <ol className="space-y-3 text-sm leading-6 text-cream-muted">
            {reviewSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-5">
          <h2 className="mb-4 font-display text-2xl">Promotion target</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Repair", "Reviewed title or description"],
              ["Area / Location", "Room or property area"],
              ["Contractor", "Assigned trade or person"],
              ["Notes", "Append source session and useful field notes"],
              ["Material Status", "Need to Buy, Purchased, On Hand"],
              ["Materials Needed", "Shopping list details"],
              ["Priority / Major Item", "Urgency and risk signal"],
              ["Photos", "Capture-session photos or links"],
              ["Target Date", "Scheduling target if approved"],
              ["Next Action", "What needs to happen next"],
            ].map(([field, description]) => (
              <div key={field} className="rounded-lg border border-border bg-surface p-3">
                <h3 className="text-sm font-medium">{field}</h3>
                <p className="mt-1 text-xs leading-5 text-cream-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <TurnRepairReviewQueue initialItems={reviewItems} />

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 font-display text-2xl">Implementation note</h2>
        <p className="text-sm leading-6 text-cream-muted">
          Captures are staged in dedicated sandbox capture session/item tables first, with the
          older generic review queue kept as a fallback. Promotion still requires an explicit
          review action before a Turn Repairs row is created.
        </p>
      </section>
    </div>
  );
}
