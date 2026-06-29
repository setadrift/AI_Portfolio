import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { BOOKING_URL, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI Consulting for Small Businesses | Duncan Anderson",
  description:
    "Practical AI consulting for small businesses that need help turning messy workflows into reliable internal systems.",
  alternates: {
    canonical: `${SITE.url}/ai-consulting-small-business`,
  },
};

const proofItems = [
  {
    title: "The Lineup",
    body: "Built and operate a paid analytics product with ML projections, live data pipelines, subscriptions, and automated settlement.",
  },
  {
    title: "Travel automation",
    body: "Built high-volume AI systems for disputes, deal ranking, revenue workflows, and operational review inside a travel business.",
  },
  {
    title: "Property operations",
    body: "Built practical internal tools for tenant, maintenance, vendor, and field-work coordination across 13 rental houses.",
  },
];

const fitSignals = [
  "Your team repeats the same admin workflow every week.",
  "The work moves through inboxes, spreadsheets, PDFs, forms, calls, or follow-up notes.",
  "A person still needs final judgment, but the prep work should be cleaner.",
];

const serviceSteps = [
  ["Map", "Find the workflow, owner, inputs, handoffs, and review points."],
  ["Prioritize", "Separate automate, redesign, buy, and keep-human decisions."],
  ["Build", "Ship the smallest useful system your team can actually trust."],
];

export default async function AiConsultingSmallBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_0.75fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              Practical AI consulting
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-cream md:text-7xl">
              AI consulting for small businesses with messy workflows
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
              I help owner-led businesses turn inboxes, spreadsheets, PDFs,
              calls, and follow-up into practical AI-assisted systems people
              actually use.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <BookingConversionLink
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-none bg-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-white transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
              >
                Book a 15-minute workflow fit call
              </BookingConversionLink>
              <Button href="#audit-form" variant="secondary">
                Send one workflow
              </Button>
            </div>
          </div>

          <aside className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              Proof before pitch
            </p>
            <div className="mt-6 space-y-5">
              {proofItems.map((item) => (
                <div key={item.title} className="border-l border-border pl-4">
                  <h2 className="font-display text-2xl text-cream">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-cream-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-border bg-white px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {fitSignals.map((item) => (
            <article key={item} className="border-l border-border pl-5">
              <p className="text-sm leading-6 text-cream-muted">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              How this works
            </p>
            <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
              AI implementation starts with one real workflow
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
              The workflow audit is the mechanism. The goal is a practical AI
              system that makes repeated work easier without removing human
              judgment where it matters.
            </p>
          </div>
          <div className="grid gap-0 border-y border-border">
            {serviceSteps.map(([title, body], index) => (
              <div
                key={title}
                className="grid gap-4 border-b border-border py-6 last:border-b-0 md:grid-cols-[100px_1fr]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                  0{index + 1}
                </p>
                <div>
                  <h3 className="font-display text-2xl text-cream">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-cream-muted">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              Start small
            </p>
            <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
              Send one workflow
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
              A few plain sentences are enough. If it looks like a fit, the
              next step is a focused review of the workflow, tools, handoffs,
              and AI implementation options.
            </p>
          </div>
          <AiWorkflowAuditForm
            contextLabel="AI consulting for small businesses"
            workflowPlaceholder="Example: every week we copy customer requests from email into a spreadsheet, check missing details, assign an owner, and follow up manually."
          />
        </div>
      </section>
    </>
  );
}
