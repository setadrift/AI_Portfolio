import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { BOOKING_URL, SITE } from "@/lib/constants";
import { FEATURED_PORTFOLIO, localize, portfolioStatusClass } from "@/lib/portfolio";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "48-Hour Automation Rescue for Make, n8n, Airtable and CRM Workflows",
    description:
      "A focused troubleshooting and rebuild offer for broken Make, n8n, Airtable, Zapier, API, CRM, and AI workflow automations.",
    alternates: {
      canonical: `${SITE.url}/automation-rescue`,
    },
    robots:
      locale === "fr"
        ? {
            index: false,
            follow: true,
          }
        : undefined,
  };
}

const rescueFits = [
  "A Make, n8n, Zapier, Airtable, or CRM workflow works sometimes but breaks when the data shape changes.",
  "Leads, bookings, invoices, PDFs, or client requests enter one tool and get lost before a person owns the next step.",
  "An AI step is producing useful drafts or summaries, but there is no clean review queue or approval boundary.",
  "A few tools are connected, but nobody trusts the automation enough to rely on it during real work.",
];

const rescueOutputs = [
  ["Map", "Current trigger, tools, fields, owners, status points, and failure cases."],
  ["Fix", "The smallest reliable repair or rebuild path for the workflow that matters first."],
  ["Review", "A human approval step where AI or automation should not act silently."],
  ["Handoff", "Notes, test cases, and next-step recommendations so the system can be maintained."],
];

const rescueStack = [
  "Make",
  "n8n",
  "Zapier",
  "Airtable",
  "Google Sheets",
  "CRMs",
  "Webhook/API glue",
  "OpenAI/Claude review steps",
  "Email and SMS handoffs",
];

const proofSlugs = new Set([
  "the-lineup-ai-operations",
  "trauma-therapy-group-publisher",
  "the-lineup",
]);

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
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-accent">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 text-base leading-7 text-cream-muted">{body}</p>
      ) : null}
    </div>
  );
}

function WorkflowPanel() {
  const lanes = [
    ["Trigger", "Form, email, call, webhook, spreadsheet row"],
    ["Normalize", "Fields, IDs, dedupe key, source record"],
    ["Review", "Owner, approval, exception, missing data"],
    ["Act", "CRM update, draft, message, report, notification"],
  ];

  return (
    <div className="border border-border bg-white p-6 shadow-[0_18px_60px_rgba(26,26,46,0.07)]">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
        Rescue map
      </p>
      <div className="mt-8 space-y-4">
        {lanes.map(([label, body], index) => (
          <div
            key={label}
            className="grid grid-cols-[72px_1fr] items-start gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-accent/40 font-mono text-xs text-accent">
              0{index + 1}
            </div>
            <div>
              <h2 className="font-display text-2xl text-cream">{label}</h2>
              <p className="mt-1 text-sm leading-6 text-cream-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 border border-cream bg-cream p-5 text-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/55">
          Rule
        </p>
        <p className="mt-3 text-sm leading-6 text-white/75">
          The first repair should make one workflow trustworthy before it makes
          the system bigger.
        </p>
      </div>
    </div>
  );
}

export default async function AutomationRescuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") {
    redirect("/automation-rescue");
  }

  setRequestLocale(locale);

  const localePrefix = locale === "en" ? "/en" : `/${locale}`;
  const proofProjects = FEATURED_PORTFOLIO.filter((project) => proofSlugs.has(project.slug));

  return (
    <>
      <section className="bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.28em] text-accent">
              Make, n8n, Airtable, CRM, APIs
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-cream md:text-7xl">
              48-hour automation rescue for stuck business workflows
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
              I help owner-led teams debug, simplify, and rebuild brittle
              automations around leads, bookings, invoices, PDFs, CRM updates,
              and human review.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href="#audit-form">Send the broken workflow</Button>
              <a
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center border border-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-accent transition-all duration-200 hover:bg-[#EFF6FF] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
              >
                Book a fit call
              </a>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-cream-muted">
              Built by Duncan Anderson, an AI engineer and data scientist who
              ships review-first automation systems for real operating work.
            </p>
          </div>
          <WorkflowPanel />
        </div>
      </section>

      <section className="border-y border-border bg-white px-6 py-14 md:py-18">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rescueOutputs.map(([title, body]) => (
            <article key={title} className="border-l border-border pl-5">
              <h2 className="font-display text-3xl text-cream">{title}</h2>
              <p className="mt-4 text-sm leading-6 text-cream-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader
            eyebrow="Best fit"
            title="Use this when the problem is concrete, not theoretical"
            body="This is not a broad AI strategy package. It is for a workflow that already exists, already matters, and needs a practical repair path."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {rescueFits.map((item) => (
              <div key={item} className="border border-border bg-white p-5">
                <p className="text-sm leading-6 text-cream-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <div>
            <SectionHeader
              eyebrow="Working stack"
              title="Built for the tools small teams actually use"
              body="The offer is intentionally tool-agnostic, but it fits best where the workflow depends on practical glue between apps, data, and people."
            />
            <div className="mt-9 flex flex-wrap gap-3">
              {rescueStack.map((item) => (
                <span
                  key={item}
                  className="border border-border bg-background px-4 py-2 text-sm text-cream-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden border border-border bg-background">
            <Image
              src="/duncan.jpeg"
              alt="Duncan Anderson"
              width={720}
              height={720}
              className="aspect-[4/3] w-full object-cover"
              priority={false}
            />
            <div className="p-6">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                Builder, not agency layer
              </p>
              <p className="mt-4 text-sm leading-6 text-cream-muted">
                You work with the person mapping the workflow, inspecting the
                failure points, and building the first reliable version.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Proof"
            title="Related systems already shipped"
            body="These projects show the kind of work behind the offer: private operating portals, review queues, content and receipt extraction, data pipelines, and production automation."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {proofProjects.map((project) => (
              <a
                key={project.slug}
                href={`${localePrefix}/projects/${project.slug}`}
                className="group border border-border bg-white p-5 transition-colors hover:border-accent"
              >
                <span className={`inline-block px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${portfolioStatusClass(project)}`}>
                  {localize(project.status, "en")}
                </span>
                <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-cream-dim">
                  {localize(project.clientType, "en")}
                </p>
                <h3 className="mt-4 font-display text-2xl text-cream">
                  {localize(project.title, "en")}
                </h3>
                <p className="mt-4 text-sm leading-6 text-cream-muted">
                  {localize(project.result, "en")}
                </p>
                <span className="mt-5 inline-block text-sm font-medium text-accent group-hover:text-accent-hover">
                  Read case study
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeader
            eyebrow="Start here"
            title="Send the workflow that is stuck"
            body="Include the tools involved, the trigger, what should happen, what actually happens, and whether you need a repair, rebuild, or implementation partner."
          />
          <AiWorkflowAuditForm
            contextLabel="48-hour automation rescue"
            workflowPlaceholder="Example: Retell sends a webhook into Make, the AI Toolkit output is inconsistent, then Calendar, Outlook, Twilio, and Sheets receive missing or mismatched fields."
          />
        </div>
      </section>
    </>
  );
}
