import Link from "next/link";

const modules = [
  {
    href: "/portal/alex/turn-repairs/capture",
    title: "Capture",
    description: "Start a property session, upload photos, add quick notes, and stage repair items for review.",
  },
  {
    href: "/portal/alex/turn-repairs/review",
    title: "Nightly review",
    description: "Turn field captures into clean Turn Repairs rows after Alex reviews the details.",
  },
  {
    href: "/portal/alex/turn-repairs/work",
    title: "Work views",
    description: "Use material shopping, contractor walkthrough, contractor call, and completion-check views from phone.",
  },
  {
    href: "/portal/alex/turn-repairs/schedule",
    title: "Schedule",
    description: "See unassigned, waiting-on, unscheduled, and deadline-risk repair items.",
  },
  {
    href: "/portal/alex/turn-repairs/share",
    title: "Contractor share",
    description: "Preview a clean view-only contractor list before sending or exporting.",
  },
  {
    href: "/portal/alex/turn-repairs/helper-upload",
    title: "Helper upload",
    description: "A reduced upload flow for helpers to submit photos and notes without Airtable access.",
  },
];

export default function TurnRepairsOverviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Turn repair command center
      </p>
      <h1 className="mb-4 font-display text-4xl">Capture, update, schedule, use, and share</h1>
      <p className="max-w-3xl text-lg leading-8 text-cream-muted">
        Airtable stays the source of truth. This portal is the field layer for the parts Airtable
        mobile is not good at: quick capture, phone-friendly work views, scheduling pressure, and
        contractor-ready lists. All write paths stay review-first.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl">{module.title}</h2>
              <span className="text-accent transition-transform group-hover:translate-x-1">→</span>
            </div>
            <p className="text-sm leading-6 text-cream-muted">{module.description}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-surface-elevated p-5">
        <h2 className="mb-3 font-display text-2xl">How to demo this</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-cream-muted">
          <li>Show the refreshed Airtable Turn Repairs interface as the database and desktop view.</li>
          <li>Open Capture to show the phone-first intake flow Airtable mobile could not provide.</li>
          <li>Open Work views to show shopping, contractor, and completion workflows.</li>
          <li>Open Schedule to show who/when/what-is-at-risk coordination.</li>
          <li>Open Contractor share to show a clean view-only handoff path.</li>
          <li>Open Helper upload to show how helpers can submit photos without Airtable access.</li>
        </ol>
      </section>
    </div>
  );
}
