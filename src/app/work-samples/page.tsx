import Link from "next/link";

type WorkSample = {
  title: string;
  href?: string;
  category: "Runnable prototype" | "Workflow sandbox" | "Case study";
  context: string;
  summary: string;
  result: string;
  proof: string[];
  systems: string[];
};

const WORK_SAMPLES: WorkSample[] = [
  {
    title: "Mindbody enrollment check",
    href: "/mindbody-enrollment-automation",
    category: "Runnable prototype",
    context: "Make.com / Mindbody / HubSpot operations",
    summary:
      "A course-purchase automation sample that checks existing Mindbody class visits before preparing missing session enrollments.",
    result: "Prevents duplicate bookings while protecting HubSpot fields owned by an existing Appiant sync.",
    proof: [
      "Runs a test purchase through a local API route",
      "Shows which sessions are skipped versus added",
      "Blocks risky HubSpot identity-field writes",
      "Produces a documentation-ready automation contract",
    ],
    systems: ["Make.com", "Mindbody", "StartIntegrate/MAXMEL", "HubSpot", "Google Sheets"],
  },
  {
    title: "WillowOps control tower",
    href: "/willowops-prototype",
    category: "Runnable prototype",
    context: "Interior design operations / project delivery",
    summary:
      "A sandbox dashboard for running enquiries, projects, procurement, finance, AI drafts, and weekly leadership reporting across a design business.",
    result: "Turns scattered project updates into a review-first operating view with visible risks and owner handoffs.",
    proof: [
      "Scenario runner exercises multiple local API endpoints",
      "Project pipeline shows risk, finance, procurement, and next actions",
      "Source-of-truth map separates Monday, Studio Designer, Xero, and Microsoft 365",
      "Training and handoff sections show how the workflow becomes usable",
    ],
    systems: ["Monday.com", "Make", "Microsoft 365", "Studio Designer", "Xero", "WhatsApp"],
  },
  {
    title: "Rental turn repair command center",
    category: "Workflow sandbox",
    context: "Airtable / rental property operations",
    summary:
      "A private portal prototype for field repair capture, nightly review, mobile work views, schedule risk, and contractor handoff lists.",
    result: "Keeps Airtable as the database while giving field work a faster, review-first operating layer.",
    proof: [
      "Phone-first capture flow for photos and repair notes",
      "Nightly review queue before Airtable records are finalized",
      "Work views for shopping, contractor walkthroughs, and completion checks",
      "Contractor-share and helper-upload paths for people without Airtable access",
    ],
    systems: ["Airtable", "Next.js", "Gmail", "Claude workflow file", "Review queues"],
  },
  {
    title: "Rental receipt extraction demo",
    category: "Workflow sandbox",
    context: "Receipt parsing / Airtable-ready review",
    summary:
      "A receipt and invoice extraction surface that turns pasted or uploaded field notes into structured review output.",
    result: "Moves messy rental expense capture into a structured approval step before any permanent record is written.",
    proof: [
      "Accepts receipt, invoice, or field-note input",
      "Extracts structured fields for review",
      "Keeps write paths approval-based",
      "Fits into the same rental operations portal as repairs and Gmail sweep",
    ],
    systems: ["Next.js", "Airtable-ready schema", "Document extraction", "Review workflow"],
  },
  {
    title: "Trauma Therapy Group blog publisher",
    category: "Workflow sandbox",
    context: "Therapy practice content operations / WordPress drafts",
    summary:
      "A private publishing workspace that turns a shared Google Doc into a cleaned, SEO-reviewed WordPress draft with a generated featured image.",
    result: "Gives the clinic a safer content pipeline: formatting, SEO, imagery, and Elementor draft setup happen before a human reviews and publishes in WordPress.",
    proof: [
      "Cleans Google Docs HTML and preserves internal versus external link behavior",
      "Suggests focus keywords and keeps SEO fields editable before draft creation",
      "Generates therapy-brand image prompts and processes the selected image",
      "Creates WordPress posts as drafts only, with Yoast and Elementor data prepared",
    ],
    systems: ["Google Docs", "WordPress REST API", "Elementor", "Yoast SEO", "Image generation", "Review-first publishing"],
  },
  {
    title: "Dispute Defender",
    href: "/projects/dispute-defender",
    category: "Case study",
    context: "Online travel chargebacks / evidence automation",
    summary:
      "An AI pipeline that gathers booking and transaction evidence, classifies dispute context, and assembles tailored chargeback responses.",
    result: "Recovered revenue that had been written off and reduced repetitive manual dispute work.",
    proof: [
      "Automated evidence gathering across booking and payment records",
      "Generated dispute-specific response packages instead of generic replies",
      "Handled high-volume operational throughput",
      "Converted a slow manual queue into a repeatable pipeline",
    ],
    systems: ["Python", "Machine learning", "REST APIs", "Data pipelines"],
  },
  {
    title: "Deal Engine",
    href: "/projects/deal-engine",
    category: "Case study",
    context: "Travel merchandising / recommendation systems",
    summary:
      "A real-time flight-deal surfacing engine that scores inventory and highlights genuinely strong offers for customers.",
    result: "Moved merchandising from manual deal picking to always-on deal ranking tied to conversion intent.",
    proof: [
      "Scored large flight inventory continuously",
      "Compared route, timing, and historical price context",
      "Surfaced high-value offers while customers were browsing",
      "Reduced dependence on manual merchandising curation",
    ],
    systems: ["Python", "SQL", "Real-time analytics", "Recommendation systems"],
  },
  {
    title: "The Lineup",
    href: "/projects/the-lineup",
    category: "Case study",
    context: "Sports analytics product / live data operations",
    summary:
      "A paid sports analytics platform with ML projections, live odds, expected-value tools, subscriptions, automated grading, and admin operations.",
    result: "Shows full-stack product ownership across models, data pipelines, billing, monitoring, and user-facing decisions.",
    proof: [
      "LightGBM projection models across multiple sports",
      "Live odds ingestion and expected-value comparisons",
      "Automated settlement and results tracking",
      "Stripe, RevenueCat, PostHog, Supabase, Redis, Railway, and Vercel in production",
    ],
    systems: ["Python", "FastAPI", "Next.js", "LightGBM", "PostgreSQL", "Stripe", "RevenueCat"],
  },
];

const categoryOrder: WorkSample["category"][] = ["Runnable prototype", "Workflow sandbox", "Case study"];

function categoryDescription(category: WorkSample["category"]) {
  if (category === "Runnable prototype") {
    return "Clickable demos with local routes, sample records, and visible workflow decisions.";
  }

  if (category === "Workflow sandbox") {
    return "Review-first internal tools that show how messy operations can become usable workflows.";
  }

  return "Shipped systems and prior work that show the same operating style at larger scale.";
}

export default function WorkSamplesPage() {
  const publicSamples = WORK_SAMPLES.filter((sample) => sample.href);

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 py-24 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-500">Portfolio samples</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-slate-950">
            Work samples built around real operating problems.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            A practical index of prototypes, workflow sandboxes, and shipped systems. Each sample is
            focused on a real business process: clear inputs, visible decisions, protected edge cases,
            and outputs a team can actually use.
          </p>
        </header>

        <section className="mt-8 grid gap-3 border-y border-slate-200 py-5 sm:grid-cols-3">
          <SummaryMetric label="Samples" value={WORK_SAMPLES.length.toString()} />
          <SummaryMetric label="Public links" value={publicSamples.length.toString()} />
          <SummaryMetric label="Systems represented" value="25+" />
        </section>

        <div className="mt-10 space-y-12">
          {categoryOrder.map((category) => {
            const samples = WORK_SAMPLES.filter((sample) => sample.category === category);

            return (
              <section key={category}>
                <div className="mb-5 max-w-3xl">
                  <h2 className="text-2xl font-semibold text-slate-950">{category}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{categoryDescription(category)}</p>
                </div>

                <div className="grid gap-5">
                  {samples.map((sample) => (
                    <article className="rounded-lg border border-slate-200 bg-white" key={sample.title}>
                      <div className="grid gap-0 lg:grid-cols-[1fr_19rem]">
                        <div className="px-6 py-6 sm:px-8">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-500">{sample.context}</p>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {sample.category}
                            </span>
                          </div>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-950">{sample.title}</h3>
                          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{sample.summary}</p>
                          <p className="mt-4 max-w-3xl rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
                            {sample.result}
                          </p>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {sample.proof.map((item) => (
                              <div
                                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
                                key={item}
                              >
                                {item}
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            {sample.href ? (
                              <>
                                <Link
                                  className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                  href={sample.href}
                                >
                                  Open sample
                                </Link>
                                <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                                  Link: {sample.href}
                                </span>
                              </>
                            ) : (
                              <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
                                Private sandbox; public summary shown here.
                              </span>
                            )}
                          </div>
                        </div>

                        <aside className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 lg:border-l lg:border-t-0">
                          <p className="text-sm font-semibold text-slate-500">Systems shown</p>
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                            {sample.systems.map((system) => (
                              <li key={system}>{system}</li>
                            ))}
                          </ul>
                        </aside>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
