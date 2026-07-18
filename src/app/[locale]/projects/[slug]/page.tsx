import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PortfolioProofVisual from "@/components/portfolio/PortfolioProofVisual";
import { PROJECTS, SITE } from "@/lib/constants";
import { FEATURED_PORTFOLIO, getPortfolioProject, localize, portfolioStatusClass } from "@/lib/portfolio";
import { routing } from "@/i18n/routing";

const SLUG_TO_KEY: Record<string, string> = {
  "mindbody-enrollment-automation": "mindbodyEnrollmentAutomation",
  "dispute-defender": "disputeDefender",
  "deal-engine": "dealEngine",
  "the-lineup": "theLineup",
  "alex-parker-property-ops": "alexParkerPropertyOps",
  "trauma-therapy-group-publisher": "traumaTherapyGroupPublisher",
};

const pageCopy = {
  en: {
    back: "Back to selected work",
    changed: "What changed",
    before: "Before",
    after: "After",
    owned: "What I owned",
    trust: "Where trust was designed in",
    evidence: "Evidence",
    detail: "Technical detail",
    external: "Public proof",
    ctaTitle: "Have a similar operating problem?",
    ctaBody: "Send the current workflow and the point where it keeps breaking. I will tell you whether there is a practical paid first phase.",
    cta: "Discuss your workflow",
  },
  fr: {
    back: "Retour aux travaux sélectionnés",
    changed: "Ce qui a changé",
    before: "Avant",
    after: "Après",
    owned: "Ce que j'ai pris en charge",
    trust: "Où la confiance a été intégrée",
    evidence: "Preuves",
    detail: "Détails techniques",
    external: "Preuves publiques",
    ctaTitle: "Vous avez un problème opérationnel semblable?",
    ctaBody: "Envoyez le workflow actuel et le point où il se brise. Je vous dirai s'il existe une première phase payante et pratique.",
    cta: "Discuter du workflow",
  },
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PROJECTS.map((project) => ({ locale, slug: project.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const featured = getPortfolioProject(slug);

  if (featured) {
    const title = `${localize(featured.title, locale)} — ${SITE.name}`;
    const description = localize(featured.headline, locale);
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE.url}${locale === "fr" ? "/fr" : ""}/projects/${slug}`,
        siteName: SITE.name,
        type: "article",
      },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  const key = SLUG_TO_KEY[slug];
  if (!key) return {};
  const t = await getTranslations({ locale, namespace: `projects.${key}` });
  return {
    title: `${t("title")} — ${SITE.name}`,
    description: t("challenge"),
    robots: slug === "mindbody-enrollment-automation" ? { index: false, follow: false } : undefined,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const featured = getPortfolioProject(slug);

  if (featured) {
    return <ProofLedProject locale={locale === "fr" ? "fr" : "en"} project={featured} />;
  }

  const project = PROJECTS.find((item) => item.slug === slug);
  if (!project) notFound();
  return <LegacyProject locale={locale} project={project} />;
}

function ProofLedProject({
  project,
  locale,
}: {
  project: (typeof FEATURED_PORTFOLIO)[number];
  locale: "en" | "fr";
}) {
  const copy = pageCopy[locale];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: localize(project.title, locale),
    description: localize(project.headline, locale),
    author: { "@type": "Person", name: SITE.name },
    url: `${SITE.url}${locale === "fr" ? "/fr" : ""}/projects/${project.slug}`,
  };

  return (
    <main className="bg-[#f7f5f1] text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="px-5 pb-12 pt-32 md:pb-16 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700" href="/work-samples">
            <span aria-hidden="true">←</span> {copy.back}
          </Link>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.62fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
                <span className={`px-2.5 py-1.5 ${portfolioStatusClass(project)}`}>{localize(project.status, locale)}</span>
                <span className="text-slate-500">{localize(project.role, locale)}</span>
              </div>
              <p className="mt-7 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
                {localize(project.clientType, locale)}
              </p>
              <h1 className="mt-3 max-w-4xl font-display text-5xl leading-[1.04] md:text-7xl">{localize(project.title, locale)}</h1>
              <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-700 md:text-2xl md:leading-9">{localize(project.headline, locale)}</p>
            </div>
            <p className="border-l-2 border-blue-600 pl-5 text-base leading-7 text-slate-700">{localize(project.result, locale)}</p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl">
          <PortfolioProofVisual locale={locale} visual={project.visual} />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{localize(project.visualNote, locale)}</p>
        </div>
      </section>

      <section className="border-y border-slate-300 bg-white px-5 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.55fr_1fr]">
          <h2 className="font-display text-3xl md:text-4xl">{copy.changed}</h2>
          <p className="max-w-3xl text-lg leading-8 text-slate-700">{localize(project.whatChanged, locale)}</p>
        </div>
      </section>

      <section className="px-5 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px overflow-hidden border border-slate-300 bg-slate-300 lg:grid-cols-2">
            <WorkflowColumn label={copy.before} items={project.before.map((item) => localize(item, locale))} tone="before" />
            <WorkflowColumn label={copy.after} items={project.after.map((item) => localize(item, locale))} tone="after" />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-300 bg-slate-950 px-5 py-14 text-white md:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{copy.owned}</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl md:text-4xl">{localize(project.summary, locale)}</h2>
            <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {project.responsibilities.map((item, index) => (
                <li className="grid grid-cols-[2rem_1fr] gap-4 py-4 text-sm leading-6 text-slate-300" key={localize(item, locale)}>
                  <span className="font-mono text-[10px] text-slate-600">0{index + 1}</span>
                  {localize(item, locale)}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">{copy.trust}</p>
            <p className="mt-5 text-lg leading-8 text-slate-200">{localize(project.trust, locale)}</p>
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{copy.evidence}</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                {project.proof.map((item) => (
                  <li className="flex gap-3" key={localize(item, locale)}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {localize(item, locale)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr]">
          {project.external?.length ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{copy.external}</p>
              <div className="mt-4 divide-y divide-slate-300 border-y border-slate-300">
                {project.external.map((link) => (
                  <a className="flex items-center justify-between py-4 text-sm font-semibold transition hover:text-blue-700" href={link.href} key={link.href} rel="noreferrer" target="_blank">
                    {localize(link.label, locale)} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{copy.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span className="border border-slate-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-700" key={tech}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-300 bg-white px-5 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-3xl">{copy.ctaTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.ctaBody}</p>
          </div>
          <Link className="bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" href="/#contact">
            {copy.cta}
          </Link>
        </div>
      </section>
    </main>
  );
}

function WorkflowColumn({ label, items, tone }: { label: string; items: string[]; tone: "before" | "after" }) {
  return (
    <div className="bg-white p-6 md:p-8">
      <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${tone === "after" ? "text-emerald-700" : "text-slate-500"}`}>
        {label}
      </p>
      <ol className="mt-6 space-y-5">
        {items.map((item, index) => (
          <li className="grid grid-cols-[2rem_1fr] gap-4 text-sm leading-6 text-slate-700" key={item}>
            <span className={`font-mono text-[10px] ${tone === "after" ? "text-emerald-700" : "text-slate-400"}`}>0{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

async function LegacyProject({
  project,
  locale,
}: {
  project: (typeof PROJECTS)[number];
  locale: string;
}) {
  const key = SLUG_TO_KEY[project.slug];
  if (!key) notFound();
  const t = await getTranslations({ locale, namespace: "projects" });

  return (
    <main className="bg-[#f7f5f1] px-5 pb-24 pt-36 text-slate-950">
      <article className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-slate-600" href="/work-samples">← {t("backToProjects")}</Link>
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-blue-700">{t(`${key}.clientType`)}</p>
        <h1 className="mt-3 font-display text-5xl">{t(`${key}.title`)}</h1>
        <p className="mt-6 text-xl leading-8 text-slate-700">{t(`${key}.challenge`)}</p>
        <div className="mt-12 space-y-10 border-y border-slate-300 py-10">
          <section><h2 className="font-display text-2xl">{t("theProblem")}</h2><p className="mt-4 leading-7 text-slate-700">{t(`${key}.problem`)}</p></section>
          <section><h2 className="font-display text-2xl">{t("whatIBuilt")}</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{t(`${key}.solution`)}</p></section>
          <section><h2 className="font-display text-2xl">{t("theOutcome")}</h2><p className="mt-4 leading-7 text-slate-700">{t(`${key}.outcome`)}</p></section>
        </div>
      </article>
    </main>
  );
}
