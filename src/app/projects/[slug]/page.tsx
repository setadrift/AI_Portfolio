import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECTS, SITE } from "@/lib/constants";

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const project = PROJECTS.find((p) => p.slug === params.slug);
  if (!project) return {};

  const title = `${project.title} — ${SITE.name}`;
  const description = project.challenge;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE.url}/projects/${project.slug}`,
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);

  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.challenge,
    author: { "@type": "Person", name: SITE.name },
    url: `${SITE.url}/projects/${project.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-warm-50 px-6 pb-16 pt-32 md:pb-20 md:pt-40">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/#projects"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-amber-600"
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
            Back to Projects
          </Link>
          <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-amber-600">
            {project.clientType}
          </span>
          <h1 className="mb-4 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
            {project.title}
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            {project.challenge}
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            The Problem
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            {project.problem}
          </p>
        </div>
      </section>

      {/* What I Built */}
      <section className="bg-warm-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            What I Built
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            {project.solution}
          </p>
        </div>
      </section>

      {/* The Outcome */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            The Outcome
          </h2>
          <p className="text-base leading-relaxed text-slate-600">
            {project.outcome}
          </p>
        </div>
      </section>

      {/* Tech & CTA */}
      <section className="bg-warm-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            Tech Used
          </h2>
          <div className="mb-12 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <span
                key={t}
                className="rounded-full bg-warm-200 px-3 py-1 text-sm font-medium text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="rounded-xl border border-warm-200 bg-white p-8 text-center">
            <p className="mb-4 text-lg font-medium text-slate-800">
              Interested in something like this for your business?
            </p>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Let&apos;s Talk
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
