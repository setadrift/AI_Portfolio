import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { PROJECTS, SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Practical AI Systems for Messy Business Workflows | Duncan Anderson",
  description:
    "Turn inboxes, spreadsheets, PDFs, calls, and follow-up into practical internal systems people actually use.",
  alternates: {
    canonical: `${SITE.url}/ai-workflow-audit`,
  },
};

const workflowAreas = [
  {
    title: "Intake",
    body: "Capture requests cleanly and get the right information up front.",
  },
  {
    title: "Follow-up",
    body: "Move work forward with visible owners, dates, and next steps.",
  },
  {
    title: "Review",
    body: "Put the context in one place before a person makes the call.",
  },
];

const proofItems = [
  {
    title: "The Lineup",
    body: "A live analytics product with data pipelines, payments, monitoring, and automated settlement.",
  },
  {
    title: "Travel automation",
    body: "High-volume operational AI systems for disputes, data, ranking, and revenue workflows.",
  },
  {
    title: "Property operations",
    body: "A practical system for tenant, maintenance, vendor, and field-work coordination across 13 rental houses.",
  },
];

const methodSteps = [
  ["Map", "Understand the real workflow and where it breaks."],
  ["Simplify", "Remove avoidable friction before adding automation."],
  ["Build", "Ship the smallest useful system the team can trust."],
  ["Operate", "Support, refine, and keep the workflow honest."],
];

function OperationsMap() {
  const inputs = ["Inbox", "PDFs", "Sheets", "Calls"];
  const outputs = ["Owner", "Status", "Next step"];

  return (
    <div className="relative min-h-[420px] border border-border bg-white p-6 shadow-[0_18px_60px_rgba(26,26,46,0.07)]">
      <div className="absolute left-6 right-6 top-1/2 h-px bg-border" />
      <div className="absolute bottom-6 top-6 left-1/2 w-px bg-border" />

      <div className="relative grid h-full min-h-[368px] grid-cols-[0.9fr_1.2fr] gap-8">
        <div className="flex flex-col justify-between">
          {inputs.map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-3 text-sm text-cream-muted"
              style={{ marginLeft: `${index % 2 === 0 ? 0 : 22}px` }}
            >
              <span className="h-2.5 w-2.5 bg-accent" />
              <span className="border border-border bg-background px-3 py-2">
                {item}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center">
          <div className="w-full border border-cream bg-cream p-5 text-white">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/55">
              Operating lane
            </p>
            <div className="mt-8 space-y-4">
              {outputs.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between border-b border-white/15 pb-3 text-sm"
                >
                  <span>{item}</span>
                  <span className="h-2 w-2 bg-accent" />
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-xs text-sm leading-6 text-white/68">
              The goal is not more AI. It is a cleaner path from messy input to
              useful action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 text-base leading-7 text-cream-muted">{body}</p>
      ) : null}
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

  return (
    <>
      <section className="bg-background px-6 pb-20 pt-28 md:pb-28 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.92fr_0.78fr] lg:items-center">
          <div>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-cream md:text-7xl">
              Practical AI systems for messy business workflows
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
              I help owner-led businesses turn inboxes, spreadsheets, PDFs,
              calls, and follow-up into systems people actually use.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href="#audit-form">Send the workflow</Button>
              <a
                href="#proof"
                className="text-sm font-medium uppercase tracking-wide text-accent underline decoration-border underline-offset-4 transition-colors hover:text-accent-hover"
              >
                See proof
              </a>
            </div>
          </div>
          <OperationsMap />
        </div>
      </section>

      <section className="border-y border-border bg-white px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {workflowAreas.map((area) => (
            <article key={area.title} className="border-l border-border pl-5">
              <h2 className="font-display text-3xl text-cream">
                {area.title}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-cream-muted">
                {area.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="proof" className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            title="Proof over promises"
            body="The credibility here comes from shipped systems: products, automations, and client workflows that have to keep working after the first demo."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {proofItems.map((item) => (
              <article key={item.title} className="border-t border-border pt-5">
                <h3 className="font-display text-2xl text-cream">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-cream-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {proofProjects.map((project) => (
              <a
                key={project.slug}
                href={`${localePrefix}/projects/${project.slug}`}
                className="group border border-border bg-white p-5 transition-colors hover:border-accent"
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-cream-dim">
                  {project.clientType}
                </p>
                <h3 className="mt-4 font-display text-2xl text-cream">
                  {project.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-cream-muted">
                  {project.result}
                </p>
                <span className="mt-5 inline-block text-sm font-medium text-accent group-hover:text-accent-hover">
                  Read case study
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="bg-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr]">
          <SectionHeading
            title="A small method for real operations"
            body="Most useful systems start by making the current work visible. Automation comes after the workflow makes sense."
          />
          <div className="grid gap-0 border-y border-border">
            {methodSteps.map(([title, body], index) => (
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

      <section className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr] lg:items-start">
          <SectionHeading
            title="Send one messy workflow"
            body="A good starting point is something that repeats every week, moves through too many tools, and still depends on someone remembering the next step."
          />
          <AiWorkflowAuditForm />
        </div>
      </section>
    </>
  );
}
