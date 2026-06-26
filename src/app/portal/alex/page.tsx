import Link from "next/link";

export default function AlexPortalHome() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Rental workflow sandbox
      </p>
      <h1 className="mb-3 font-display text-4xl">Private prototype workspace</h1>
      <p className="mb-10 text-lg leading-8 text-cream-muted">
        This is a review-first test area for turn repairs, receipt extraction, and Gmail sweep
        workflows. It is meant to show what is feasible before anything is moved into live Airtable.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <ToolCard
          href="/portal/alex/turn-repairs"
          title="Turn repair command center"
          description="Capture repair notes, review staged items, use phone-friendly work views, coordinate schedule risk, and preview contractor lists."
        />
        <ToolCard
          href="/portal/alex/receipts"
          title="Receipt extraction demo"
          description="Upload or paste a receipt, invoice, or field note and see the structured Airtable-ready review output."
        />
        <ToolCard
          href="/portal/alex/gmail-sweep"
          title="Gmail sweep setup"
          description="Copy or download the workflow file for Claude so it can be adapted to your Gmail and Airtable connector setup."
        />
      </div>

      <div className="mt-12 rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="mb-2 font-medium">Before testing</h2>
        <ul className="list-inside list-disc space-y-1 text-sm leading-6 text-cream-muted">
          <li>Live Airtable is not changed from these demos.</li>
          <li>Receipt extraction lands in a review step before any permanent record is created.</li>
          <li>The Gmail sweep instructions are meant to be adapted inside your own Claude setup.</li>
        </ul>
      </div>
    </div>
  );
}

function ToolCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="text-accent transition-transform group-hover:translate-x-1">→</span>
      </div>
      <p className="text-sm leading-6 text-cream-muted">{description}</p>
    </Link>
  );
}
