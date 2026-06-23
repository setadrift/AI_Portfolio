import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { BOOKING_URL, PROJECTS, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI Workflow Audits for Small Businesses | Duncan Anderson",
  description:
    "Find the repetitive work AI can actually remove, then turn the best opportunity into a reliable automation.",
  alternates: {
    canonical: `${SITE.url}/ai-workflow-audit`,
  },
};

export default async function AiWorkflowAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const proofProjects = PROJECTS.filter((project) =>
    ["dispute-defender", "deal-engine", "the-lineup"].includes(project.slug),
  );

  return (
    <>
      <section className="relative overflow-hidden bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              AI workflow audit
            </p>
            <h1 className="font-display text-5xl leading-[0.98] text-cream md:text-6xl">
              AI workflow audits for small businesses
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-cream-muted">
              Find the repetitive work AI can actually remove, then turn the
              best opportunity into a reliable automation your team can use.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#audit-form">Request an audit</Button>
              <BookingConversionLink
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-accent transition-all duration-200 hover:bg-[#EFF6FF] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
              >
                Book a call
              </BookingConversionLink>
              <Button href="#examples" variant="secondary">
                See examples
              </Button>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-cream-muted">
              Built by Duncan Anderson, an AI engineer and data scientist who
              ships working systems for small teams.
            </p>
          </div>

          <div className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              Best-fit workflows
            </p>
            <div className="mt-6 space-y-5">
              {[
                "Manual reporting that eats up the same hours every week.",
                "Customer, sales, or operations work spread across inboxes and spreadsheets.",
                "Airtable, Make, n8n, Zapier, CRM, or Google Sheets workflows that keep breaking.",
                "AI experiments that need to become dependable business processes.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="mt-2 h-2 w-2 shrink-0 bg-accent" />
                  <p className="text-sm leading-6 text-cream-muted">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          {[
            {
              title: "Map the workflow",
              body: "Identify inputs, decisions, tools, handoffs, failure points, and where human review still belongs.",
            },
            {
              title: "Pick the first build",
              body: "Prioritize the highest-leverage automation instead of spreading budget across vague AI ideas.",
            },
            {
              title: "Ship a working system",
              body: "Build the prototype, connect the tools, and make the workflow reliable enough for daily use.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-display text-2xl text-cream">
                {item.title}
              </h2>
              <p className="mt-4 leading-7 text-cream-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="examples" className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              Proof
            </p>
            <h2 className="font-display text-4xl text-cream">
              Systems built around real operational work
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {proofProjects.map((project) => (
              <article
                key={project.slug}
                className="border border-border bg-white p-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {project.clientType}
                </p>
                <h3 className="mt-4 font-display text-2xl text-cream">
                  {project.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-cream-muted">
                  {project.result}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              What to expect
            </p>
            <h2 className="font-display text-4xl text-cream">
              A practical review, not an AI pitch.
            </h2>
            <div className="mt-6 space-y-4 text-cream-muted">
              <p>
                I will review the workflow, tools, volume, and bottlenecks. If
                there is a practical automation opportunity, I will outline the
                first build and what it would take to ship it.
              </p>
              <p>
                If AI is not the right fix, I will say that directly. The goal
                is a useful operating system, not a demo that never gets used.
              </p>
            </div>
            <div className="mt-8 border-l-2 border-accent pl-5 text-sm leading-6 text-cream-muted">
              Best fit: small teams with repetitive admin, reporting, support,
              sales ops, or internal process work.
            </div>
          </div>
          <AiWorkflowAuditForm />
        </div>
      </section>

      <section className="bg-background px-6 py-12">
        <div className="mx-auto max-w-5xl text-xs leading-6 text-cream-dim">
          Form details are used to respond to your request and understand the
          source of the inquiry. Advertising click IDs and campaign parameters
          may be included with the request so campaign performance can be
          measured.
        </div>
      </section>
    </>
  );
}
