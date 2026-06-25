import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import WorkflowOfferCards from "@/components/ads/WorkflowOfferCards";
import Button from "@/components/ui/Button";
import { WORKFLOW_VERTICALS } from "@/lib/ai-workflow-verticals";
import type { WorkflowVertical } from "@/lib/ai-workflow-verticals";
import {
  FEATURED_WORKFLOW_SLUGS,
  WORKFLOW_OFFER_PATHS,
} from "@/lib/ai-workflow-offers";
import { BOOKING_URL, PROJECTS, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "AI Workflow Audit for Service Businesses | Duncan Anderson",
  description:
    "Map one admin-heavy workflow across emails, PDFs, forms, quotes, photos, spreadsheets, and follow-up before building AI automation.",
  alternates: {
    canonical: `${SITE.url}/ai-workflow-audit`,
  },
};

const auditDeliverables = [
  "Current workflow map: inputs, owners, handoffs, tools, status points, and failure points.",
  "Automate / keep human / redesign / buy recommendation for the workflow.",
  "First-build plan with trigger, data source, review step, output, and owner.",
  "Risk and human-review boundaries so AI prepares work without silently making high-stakes decisions.",
  "Time-savings or revenue-leak hypothesis tied to weekly volume and current follow-up gaps.",
];

const goodFitSignals = [
  "The work happens every week.",
  "Inputs are visible: emails, forms, PDFs, photos, spreadsheets, CRM notes, or portal requests.",
  "The next step follows a repeatable pattern.",
  "A human can review the draft, queue, summary, or status update before anything important changes.",
  "The bottleneck costs time, deals, deadline confidence, or customer follow-up.",
];

const notFitSignals = [
  "One-off creative brainstorming with no repeat workflow.",
  "Fully autonomous decisions where human review is not acceptable.",
  "A vague desire to use AI without a real operating bottleneck.",
  "Hardware, controls, sensors, or infrastructure automation unrelated to business workflow.",
];

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl leading-tight text-cream">
        {title}
      </h2>
      {body && <p className="mt-5 leading-7 text-cream-muted">{body}</p>}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item} className="flex gap-3">
          <div className="mt-2 h-2 w-2 shrink-0 bg-accent" />
          <p className="text-sm leading-6 text-cream-muted">{item}</p>
        </div>
      ))}
    </div>
  );
}

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
  const localePrefix = locale === "en" ? "/en" : `/${locale}`;
  const featuredWorkflows = FEATURED_WORKFLOW_SLUGS.map((slug) =>
    WORKFLOW_VERTICALS.find((vertical) => vertical.slug === slug),
  ).filter((vertical): vertical is WorkflowVertical => Boolean(vertical));
  const secondaryWorkflows = WORKFLOW_VERTICALS.filter(
    (vertical) => !FEATURED_WORKFLOW_SLUGS.includes(vertical.slug),
  );

  return (
    <>
      <section className="relative overflow-hidden bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              AI workflow audit
            </p>
            <h1 className="font-display text-5xl leading-[0.98] text-cream md:text-6xl">
              AI workflow audit for service businesses buried in admin
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-cream-muted">
              Map one painful workflow across emails, forms, PDFs, photos,
              quotes, spreadsheets, and follow-up. Then decide what to
              automate, what to redesign, and what should stay human.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#audit-form">Request a workflow audit</Button>
              <BookingConversionLink
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-accent transition-all duration-200 hover:bg-[#EFF6FF] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
              >
                Book a fit call
              </BookingConversionLink>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-cream-muted">
              Built by Duncan Anderson, an AI engineer and data scientist who
              ships production systems around real operating workflows.
            </p>
          </div>

          <aside className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              What you get back
            </p>
            <div className="mt-6 space-y-5">
              {auditDeliverables.map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="mt-2 h-2 w-2 shrink-0 bg-accent" />
                  <p className="text-sm leading-6 text-cream-muted">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div className="border border-border bg-white p-6">
            <SectionHeader
              eyebrow="Good first workflow"
              title="Frequent, measurable, and easy to review"
              body="The first build should be close to a real operating leak, not a vague AI experiment."
            />
            <div className="mt-8">
              <BulletList items={goodFitSignals} />
            </div>
          </div>
          <div className="border border-border bg-white p-6">
            <SectionHeader
              eyebrow="Not the right fit"
              title="Some work should stay manual or be redesigned first"
              body="A useful audit should say no when the workflow is too rare, too risky, or too unclear."
            />
            <div className="mt-8">
              <BulletList items={notFitSignals} />
            </div>
          </div>
        </div>
      </section>

      <section id="workflow-examples" className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Three ways this usually pays back"
            title="Pick the operating workflow before picking the AI tool"
            body="These are the repeatable workflow systems I would rather sell than broad AI consulting. Each starts with a focused audit and can become a managed implementation."
          />
          <div className="mt-10">
            <WorkflowOfferCards />
          </div>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Specific workflows"
            title="Start where the admin pain is already obvious"
            body="The strongest first project is usually close to revenue, deadlines, follow-up, or document-heavy admin."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredWorkflows.map((vertical) => (
              <a
                key={vertical.slug}
                href={`${localePrefix}/ai-workflow-audit/${vertical.slug}`}
                className="border border-border bg-white p-5 transition-colors hover:border-accent"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {vertical.market}
                </p>
                <h3 className="mt-3 font-display text-2xl text-cream">
                  {vertical.shortTitle}
                </h3>
                <p className="mt-3 text-sm leading-6 text-cream-muted">
                  {vertical.metaDescription}
                </p>
              </a>
            ))}
          </div>
          <div className="mt-10 border-t border-border pt-8">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-cream-dim">
              Other admin-heavy workflows
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {secondaryWorkflows.map((vertical) => (
                <a
                  key={vertical.slug}
                  href={`${localePrefix}/ai-workflow-audit/${vertical.slug}`}
                  className="text-sm leading-6 text-cream-muted underline decoration-border underline-offset-4 transition-colors hover:text-accent"
                >
                  {vertical.shortTitle}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="admin-queue" className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader
            eyebrow="Fallback offer"
            title="If your work arrives everywhere, start with an admin queue"
            body="When there is no clean system of record, the first win is often a queue: what came in, who owns it, what is missing, how old it is, and what should happen next."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {WORKFLOW_OFFER_PATHS[2].bestFor.concat([
              "Shared inbox triage",
              "Missing-info detection",
              "Draft replies for review",
            ]).map((item) => (
              <div key={item} className="border-l-2 border-accent bg-white p-5">
                <p className="text-sm leading-6 text-cream-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="examples" className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Proof"
            title="Production systems built around real operational work"
            body="The credibility here is not AI novelty. It is building systems that move evidence, data, decisions, billing, analytics, and follow-up through production workflows."
          />
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

      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionHeader
              eyebrow="Request the audit"
              title="Send the workflow that is costing time, deals, or deadline confidence"
              body="Specifics help: current tools, weekly volume, what breaks, and what should remain human."
            />
            <div className="mt-8 border-l-2 border-accent pl-5 text-sm leading-6 text-cream-muted">
              This is not a broad AI transformation program, a chatbot demo, or
              a promise to automate everything. If the workflow is too rare,
              too risky, or too unclear, I will say so.
            </div>
          </div>
          <AiWorkflowAuditForm />
        </div>
      </section>

      <section className="bg-background px-6 py-12">
        <div className="mx-auto max-w-6xl text-xs leading-6 text-cream-dim">
          Form details are used to respond to your request and understand the
          source of the inquiry. Advertising click IDs and campaign parameters
          may be included with the request so campaign performance can be
          measured.
        </div>
      </section>
    </>
  );
}
