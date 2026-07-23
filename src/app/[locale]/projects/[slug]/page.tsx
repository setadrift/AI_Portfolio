import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import PortfolioProofVisual from "@/components/portfolio/PortfolioProofVisual";
import { BOOKING_URL, PROJECTS, SITE } from "@/lib/constants";
import { FEATURED_PORTFOLIO, getPortfolioProject, localize } from "@/lib/portfolio";
import { routing } from "@/i18n/routing";

const SLUG_TO_KEY: Record<string, string> = {
  "mindbody-enrollment-automation": "mindbodyEnrollmentAutomation",
  "dispute-defender": "disputeDefender",
  "deal-engine": "dealEngine",
  "the-lineup": "theLineup",
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
  const slugs = new Set([
    ...PROJECTS.map((project) => project.slug),
    ...FEATURED_PORTFOLIO.map((project) => project.slug),
  ]);

  return routing.locales.flatMap((locale) =>
    [...slugs].map((slug) => ({ locale, slug })),
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

  const before = project.before.map((item) => localize(item, locale));
  const after = project.after.map((item) => localize(item, locale));

  return (
    <main className={`editorial-case-page editorial-case-${project.visual}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="editorial-case-hero">
        <div className="editorial-shell">
          <Link className="editorial-case-back" href="/work-samples">
            <span aria-hidden="true">←</span> {copy.back}
          </Link>

          <div className="editorial-case-hero-grid">
            <div>
              <p className="section-index">{localize(project.clientType, locale)} · {localize(project.status, locale)}</p>
              <h1>{localize(project.title, locale)}</h1>
              <p className="editorial-case-headline">{localize(project.headline, locale)}</p>
            </div>
            <div className="editorial-case-result">
              <span>{locale === "fr" ? "Résultat" : "The result"}</span>
              <p>{localize(project.result, locale)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-case-proof">
        <div className="editorial-shell">
          <div className="editorial-case-proof-head">
            <span>{locale === "fr" ? "Preuve opérationnelle" : "Operational proof"}</span>
            <span>{localize(project.role, locale)}</span>
          </div>
          <div className="editorial-case-proof-grid">
            <p>{localize(project.whatChanged, locale)}</p>
            <ol>
              {project.proof.map((item, index) => (
                <li key={localize(item, locale)}><span>0{index + 1}</span>{localize(item, locale)}</li>
              ))}
            </ol>
          </div>
          <div className="editorial-case-proof-visual">
            <PortfolioProofVisual locale={locale} visual={project.visual} />
          </div>
          <p className="editorial-case-proof-note">{localize(project.visualNote, locale)}</p>
        </div>
      </section>

      <section className="editorial-case-change">
        <div className="editorial-shell">
          <p className="section-index">{copy.changed}</p>
          <div className="editorial-case-change-grid">
            <WorkflowColumn label={copy.before} items={before} tone="before" />
            <div className="editorial-case-arrow" aria-hidden="true">→</div>
            <WorkflowColumn label={copy.after} items={after} tone="after" />
          </div>
        </div>
      </section>

      <section className="editorial-case-trust">
        <div className="editorial-shell editorial-case-trust-grid">
          <div>
            <p className="section-index section-index-light">{copy.owned}</p>
            <h2>{localize(project.summary, locale)}</h2>
            <ul className="editorial-case-owned-list">
              {project.responsibilities.map((item, index) => (
                <li key={localize(item, locale)}>
                  <span>0{index + 1}</span>
                  {localize(item, locale)}
                </li>
              ))}
            </ul>
          </div>
          <div className="editorial-case-trust-statement">
            <p className="section-index">{copy.trust}</p>
            <p>{localize(project.trust, locale)}</p>
          </div>
        </div>
      </section>

      <section className="editorial-case-detail">
        <div className="editorial-shell editorial-case-detail-grid">
          {project.external?.length ? (
            <div>
              <p className="section-index">{copy.external}</p>
              <div className="editorial-case-links">
                {project.external.map((link) => (
                  <a href={link.href} key={link.href} rel="noreferrer" target="_blank">
                    {localize(link.label, locale)} <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="section-index">{copy.detail}</p>
            <div className="editorial-case-tech">
              {project.tech.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-case-cta">
        <div className="editorial-shell editorial-case-cta-grid">
          <div>
            <h2>{copy.ctaTitle}</h2>
            <p>{copy.ctaBody}</p>
          </div>
          <BookingConversionLink className="editorial-button" href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
            {copy.cta}
            <span aria-hidden="true">↗</span>
          </BookingConversionLink>
        </div>
      </section>
    </main>
  );
}

function WorkflowColumn({ label, items, tone }: { label: string; items: string[]; tone: "before" | "after" }) {
  return (
    <div className={`editorial-workflow-column editorial-workflow-${tone}`}>
      <p>{label}</p>
      <ol>
        {items.map((item, index) => (
          <li key={item}>
            <span>0{index + 1}</span>
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
