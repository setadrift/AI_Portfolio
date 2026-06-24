import BookingConversionLink from "@/components/ads/BookingConversionLink";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { BOOKING_URL } from "@/lib/constants";
import type { WorkflowVertical } from "@/lib/ai-workflow-verticals";

type WorkflowVerticalLandingPageProps = {
  locale: string;
  vertical: WorkflowVertical;
  related: WorkflowVertical[];
};

function NumberedList({
  items,
  compact = false,
}: {
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {items.map((item, index) => (
        <div key={item} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent/40 font-mono text-xs text-accent">
            {index + 1}
          </div>
          <p className="text-sm leading-6 text-cream-muted">{item}</p>
        </div>
      ))}
    </div>
  );
}

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

export default function WorkflowVerticalLandingPage({
  locale,
  vertical,
  related,
}: WorkflowVerticalLandingPageProps) {
  const localePrefix = locale === "en" ? "/en" : `/${locale}`;

  return (
    <>
      <section className="relative overflow-hidden bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              {vertical.eyebrow}
            </p>
            <h1 className="font-display text-5xl leading-[0.98] text-cream md:text-6xl">
              {vertical.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-cream-muted">
              {vertical.hero}
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
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-cream-muted">
              Built by Duncan Anderson, an AI engineer and data scientist who
              builds practical automation around real operating workflows.
            </p>
          </div>

          <aside className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              Urgent workflow leak
            </p>
            <p className="mt-5 text-lg leading-8 text-cream">
              {vertical.urgentPain}
            </p>
            <div className="mt-8 border-t border-border pt-6">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cream-dim">
                Best fit
              </p>
              <div className="mt-4 space-y-4">
                {vertical.bestFit.map((item) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-2 h-2 w-2 shrink-0 bg-accent" />
                    <p className="text-sm leading-6 text-cream-muted">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="What usually breaks"
            title={`Where ${vertical.market.toLowerCase()} lose time or revenue`}
            body="The first audit is deliberately narrow. We identify the repeatable workflow, the owner, the inputs, the status points, and the places where a small automation would actually survive daily use."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {vertical.symptoms.map((item) => (
              <div key={item} className="border-l-2 border-accent bg-white p-5">
                <p className="text-sm leading-6 text-cream-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeader
            eyebrow="Workflow map"
            title="The audit follows the real work, not a generic AI checklist"
            body={vertical.proofAngle}
          />
          <NumberedList items={vertical.workflowMap} />
        </div>
      </section>

      <section className="bg-surface px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Automation candidates"
              title="Likely first builds"
              body="The right first build is usually small, specific, and close to revenue or deadline pressure."
            />
            <div className="mt-8">
              <NumberedList items={vertical.automationIdeas} compact />
            </div>
          </div>
          <div>
            <SectionHeader
              eyebrow="Audit output"
              title="What you get back"
              body="The goal is a decision-ready plan: what to automate first, what to keep manual, and what data or tool connection is needed."
            />
            <div className="mt-8 space-y-4">
              {vertical.auditDeliverables.map((item) => (
                <div key={item} className="border border-border bg-white p-5">
                  <p className="text-sm leading-6 text-cream-muted">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background px-6 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeader
              eyebrow="Request the audit"
              title="Send the workflow that is costing time, deals, or deadline confidence"
              body="Specifics help. Include the tools involved, how the work arrives, who owns it, where status gets lost, and what would count as a useful win."
            />
            <div className="mt-8 border-l-2 border-accent pl-5 text-sm leading-6 text-cream-muted">
              Search intent this page is built around:{" "}
              {vertical.searchIntent.join(", ")}.
            </div>
          </div>
          <AiWorkflowAuditForm
            contextLabel={vertical.title}
            defaultWorkflow={vertical.ctaWorkflow}
            workflowPlaceholder={vertical.ctaWorkflow}
          />
        </div>
      </section>

      <section className="bg-surface px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Other workflow audits"
            title="Related operational bottlenecks"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <a
                key={item.slug}
                href={`${localePrefix}/ai-workflow-audit/${item.slug}`}
                className="border border-border bg-white p-5 transition-colors hover:border-accent"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {item.market}
                </p>
                <h3 className="mt-3 font-display text-2xl text-cream">
                  {item.shortTitle}
                </h3>
                <p className="mt-3 text-sm leading-6 text-cream-muted">
                  {item.metaDescription}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
