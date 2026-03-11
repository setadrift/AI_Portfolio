import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PROJECTS, SITE } from "@/lib/constants";
import { routing } from "@/i18n/routing";

const SLUG_TO_KEY: Record<string, string> = {
  "dispute-defender": "disputeDefender",
  "deal-engine": "dealEngine",
  "the-lineup": "theLineup",
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
  const key = SLUG_TO_KEY[slug];
  if (!key) return {};

  const t = await getTranslations({ locale, namespace: `projects.${key}` });

  const title = `${t("title")} — ${SITE.name}`;
  const description = t("challenge");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE.url}/projects/${slug}`,
      siteName: SITE.name,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  const key = SLUG_TO_KEY[slug];
  const t = await getTranslations({ locale, namespace: "projects" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: t(`${key}.title`),
    description: t(`${key}.challenge`),
    author: { "@type": "Person", name: SITE.name },
    url: `${SITE.url}/projects/${project.slug}`,
  };

  const solutionText = t(`${key}.solution`);
  const solutionParagraphs = solutionText.split("\n\n");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="grain relative overflow-hidden bg-background px-6 pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="relative z-10 mx-auto max-w-3xl">
          <Link
            href="/#projects"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-cream-dim transition-colors hover:text-accent"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("backToProjects")}
          </Link>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {t(`${key}.clientType`)}
          </p>
          <h1 className="mb-5 font-display text-3xl leading-tight text-cream md:text-5xl">
            {t(`${key}.title`)}
          </h1>
          <p className="text-lg leading-relaxed text-cream-muted">
            {t(`${key}.challenge`)}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
      </section>

      {/* The Problem */}
      <section className="bg-surface px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            01
          </p>
          <h2 className="mb-5 font-display text-2xl text-cream">
            {t("theProblem")}
          </h2>
          <p className="text-base leading-relaxed text-cream-muted">
            {t(`${key}.problem`)}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
      </section>

      {/* What I Built */}
      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            02
          </p>
          <h2 className="mb-5 font-display text-2xl text-cream">
            {t("whatIBuilt")}
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-cream-muted">
            {solutionParagraphs.map((paragraph, i) => {
              const dashMatch = paragraph.match(/^(.+?) — (.+)$/);
              if (dashMatch) {
                return (
                  <div key={i} className="border-l-2 border-accent/30 pl-5">
                    <p>
                      <span className="font-medium text-cream">{dashMatch[1]}</span>
                      {" — "}
                      {dashMatch[2]}
                    </p>
                  </div>
                );
              }
              return <p key={i}>{paragraph}</p>;
            })}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
      </section>

      {/* The Outcome */}
      <section className="bg-surface px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            03
          </p>
          <h2 className="mb-5 font-display text-2xl text-cream">
            {t("theOutcome")}
          </h2>
          <p className="text-base leading-relaxed text-cream-muted">
            {t(`${key}.outcome`)}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
      </section>

      {/* Tech & CTA */}
      <section className="bg-background px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {t("stackLabel")}
          </p>
          <h2 className="mb-5 font-display text-2xl text-cream">
            {t("techUsed")}
          </h2>
          <div className="mb-14 flex flex-wrap gap-3">
            {project.tech.map((tech) => (
              <span
                key={tech}
                className="border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-cream-dim"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="border border-border bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="mb-5 font-display text-lg text-cream">
              {t("interestedCta")}
            </p>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center bg-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
            >
              {t("letsTalk")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
