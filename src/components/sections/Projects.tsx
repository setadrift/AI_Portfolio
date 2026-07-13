import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import PortfolioProofVisual from "@/components/portfolio/PortfolioProofVisual";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { FEATURED_PORTFOLIO, localize, portfolioStatusClass } from "@/lib/portfolio";

const sectionCopy = {
  en: {
    label: "Selected work",
    heading: "Systems that shipped—and had to work.",
    description:
      "Four examples with different evidence: a live product, a confidential enterprise system, and two client deliveries. No speculative builds dressed up as case studies.",
    trust: "Status, role, scope, and proof are stated separately so you can see exactly what I owned.",
    caseStudy: "Review the case study",
    live: "Open live proof",
    index: "See the full proof dossier",
    ctaTitle: "Have a workflow that is still being held together by follow-up?",
    ctaBody: "Send the current process, the systems involved, and where it breaks. I will tell you whether there is a practical paid first phase.",
    cta: "Send the workflow",
    proofLabel: "Evidence",
    outcomeLabel: "Operating result",
    trustLabel: "Control boundary",
  },
  fr: {
    label: "Travaux sélectionnés",
    heading: "Des systèmes livrés—et obligés de fonctionner.",
    description:
      "Quatre exemples avec des preuves différentes : un produit en ligne, un système d'entreprise confidentiel et deux livraisons client. Aucun prototype spéculatif présenté comme étude de cas.",
    trust: "Statut, rôle, portée et preuves sont séparés pour montrer exactement ce que j'ai pris en charge.",
    caseStudy: "Voir l'étude de cas",
    live: "Ouvrir la preuve publique",
    index: "Voir le dossier complet",
    ctaTitle: "Un workflow dépend encore trop du suivi manuel?",
    ctaBody: "Envoyez le processus actuel, les systèmes concernés et le point de rupture. Je vous dirai s'il existe une première phase payante et pratique.",
    cta: "Envoyer le workflow",
    proofLabel: "Preuves",
    outcomeLabel: "Résultat opérationnel",
    trustLabel: "Limite de contrôle",
  },
};

export default function Projects() {
  const locale = useLocale() === "fr" ? "fr" : "en";
  const copy = sectionCopy[locale];
  const [featured, ...supporting] = FEATURED_PORTFOLIO;

  return (
    <SectionWrapper id="projects" alternate>
      <div className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">{copy.label}</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] text-cream md:text-5xl">
            {copy.heading}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-cream-muted md:text-lg">{copy.description}</p>
        </div>
        <p className="border-l-2 border-accent/40 pl-5 text-sm leading-6 text-cream-muted">{copy.trust}</p>
      </div>

      <article className="mt-10 overflow-hidden border border-border bg-white">
        <div className="grid lg:grid-cols-[0.88fr_1.12fr]">
          <div className="flex flex-col p-7 sm:p-9 lg:p-11">
            <ProjectIdentity project={featured} locale={locale} />
            <h3 className="mt-7 max-w-xl font-display text-3xl leading-tight text-cream md:text-4xl">
              {localize(featured.headline, locale)}
            </h3>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">{localize(featured.summary, locale)}</p>

            <div className="mt-7 border-l-2 border-blue-600 pl-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">{copy.outcomeLabel}</p>
              <p className="mt-2 text-sm leading-6 text-cream-muted">{localize(featured.result, locale)}</p>
            </div>

            <div className="mt-7 border-y border-border py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">{copy.proofLabel}</p>
              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-cream-muted">
                {featured.proof.map((item) => (
                  <li className="flex gap-3" key={localize(item, locale)}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {localize(item, locale)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href={`/projects/${featured.slug}`}>
                {copy.caseStudy}
              </Link>
              {featured.external?.[0] ? (
                <a className="border border-border px-4 py-3 text-sm font-semibold text-cream transition hover:border-accent/50" href={featured.external[0].href} rel="noreferrer" target="_blank">
                  {copy.live} ↗
                </a>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border bg-slate-950 p-4 sm:p-6 lg:border-l lg:border-t-0">
            <PortfolioProofVisual locale={locale} visual={featured.visual} />
            <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">{localize(featured.visualNote, locale)}</p>
          </div>
        </div>
      </article>

      <div className="mt-8 divide-y divide-border border-y border-border">
        {supporting.map((project, index) => (
          <article className="grid gap-7 py-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-12" key={project.slug}>
            <div className={index % 2 === 1 ? "lg:order-2" : ""}>
              <PortfolioProofVisual compact locale={locale} visual={project.visual} />
              <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-cream-dim">{localize(project.visualNote, locale)}</p>
            </div>
            <div className={index % 2 === 1 ? "lg:order-1" : ""}>
              <ProjectIdentity project={project} locale={locale} />
              <h3 className="mt-5 max-w-2xl font-display text-3xl leading-tight text-cream">{localize(project.headline, locale)}</h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-cream-muted">{localize(project.result, locale)}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {project.proof.map((item) => (
                  <p className="border-l border-border pl-3 text-xs leading-5 text-cream-muted" key={localize(item, locale)}>
                    {localize(item, locale)}
                  </p>
                ))}
              </div>
              <div className="mt-5 border-l-2 border-amber-400/60 pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cream-dim">{copy.trustLabel}</p>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-cream-muted">{localize(project.trust, locale)}</p>
              </div>
              <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:gap-3" href={`/projects/${project.slug}`}>
                {copy.caseStudy} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-6 border border-border bg-white p-7 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h3 className="font-display text-2xl text-cream">{copy.ctaTitle}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-muted">{copy.ctaBody}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="border border-border px-4 py-3 text-sm font-semibold text-cream transition hover:border-accent/50" href="/work-samples">
            {copy.index}
          </Link>
          <Link className="bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover" href="/#contact">
            {copy.cta}
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}

function ProjectIdentity({
  project,
  locale,
}: {
  project: (typeof FEATURED_PORTFOLIO)[number];
  locale: "en" | "fr";
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
      <span className={`px-2.5 py-1.5 ${portfolioStatusClass(project)}`}>{localize(project.status, locale)}</span>
      <span className="text-cream-dim">{localize(project.role, locale)}</span>
    </div>
  );
}
