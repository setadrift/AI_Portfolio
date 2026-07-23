import { Link } from "@/i18n/navigation";
import PortfolioProofVisual from "@/components/portfolio/PortfolioProofVisual";
import { FEATURED_PORTFOLIO, localize } from "@/lib/portfolio";

const copy = {
  en: {
    back: "Back to the consulting site",
    label: "Selected work / Proof dossier",
    heading: "Proof, with the edges left visible.",
    intro:
      "Four systems that show how I work: what was operating, what I owned, what can be inspected, and where human judgment still belongs.",
    index: "Four systems / Different evidence",
    indexBody:
      "A live subscription product, its governed AI operations layer, a confidential enterprise system, and a client publishing workflow.",
    result: "Operating result",
    proves: "Evidence",
    control: "Control boundary",
    open: "Read the case study",
    external: "Open public proof",
    ctaLabel: "Bring the recurring work",
    ctaTitle: "Have a workflow that should be easier to trust?",
    ctaBody:
      "Send the current process, the systems involved, and the point where follow-up or uncertainty keeps accumulating.",
    cta: "Discuss your workflow",
  },
  fr: {
    back: "Retour au site de consultation",
    label: "Travaux sélectionnés / Dossier de preuves",
    heading: "Des preuves, sans masquer les limites.",
    intro:
      "Quatre systèmes qui montrent ma façon de travailler : ce qui fonctionnait, ce que j'ai pris en charge, ce qui est vérifiable et où le jugement humain demeure essentiel.",
    index: "Quatre systèmes / Des preuves différentes",
    indexBody:
      "Un produit par abonnement, sa couche d'opérations IA gouvernées, un système d'entreprise confidentiel et un workflow client de publication.",
    result: "Résultat opérationnel",
    proves: "Preuves",
    control: "Limite de contrôle",
    open: "Lire l'étude de cas",
    external: "Ouvrir la preuve publique",
    ctaLabel: "Apportez le travail récurrent",
    ctaTitle: "Un workflow devrait-il être plus facile à faire confiance?",
    ctaBody:
      "Envoyez le processus actuel, les systèmes concernés et l'endroit où le suivi ou l'incertitude continue de s'accumuler.",
    cta: "Discuter de votre workflow",
  },
};

export default function SelectedWorkPage({ locale }: { locale: "en" | "fr" }) {
  const t = copy[locale];

  return (
    <main className="editorial-work-index">
      <section className="editorial-work-hero">
        <div className="editorial-shell">
          <Link className="editorial-case-back" href="/">
            <span aria-hidden="true">←</span> {t.back}
          </Link>
          <div className="editorial-work-hero-grid">
            <div>
              <p className="section-index">{t.label}</p>
              <h1>{t.heading}</h1>
            </div>
            <p>{t.intro}</p>
          </div>
        </div>
      </section>

      <section className="editorial-work-manifesto">
        <div className="editorial-shell editorial-work-manifesto-grid">
          <p className="section-index section-index-light">{t.index}</p>
          <p>{t.indexBody}</p>
          <ol aria-label={locale === "fr" ? "Index des études de cas" : "Case study index"}>
            {FEATURED_PORTFOLIO.map((project, index) => (
              <li key={project.slug}>
                <span>0{index + 1}</span>
                <span>{localize(project.title, locale)}</span>
                <span>{localize(project.status, locale)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {FEATURED_PORTFOLIO.map((project, index) => (
        <section
          className={`editorial-work-entry editorial-work-entry-${project.visual}`}
          key={project.slug}
        >
          <div className={`editorial-shell editorial-work-entry-grid ${index % 2 === 1 ? "editorial-work-entry-reverse" : ""}`}>
            <div className="editorial-work-visual">
              <PortfolioProofVisual locale={locale} visual={project.visual} />
              <p>{localize(project.visualNote, locale)}</p>
            </div>

            <div className="editorial-work-copy">
              <p className="section-index">
                0{index + 1} / {localize(project.clientType, locale)}
              </p>
              <p className="editorial-work-status">
                {localize(project.status, locale)} · {localize(project.role, locale)}
              </p>
              <h2>{localize(project.title, locale)}</h2>
              <p className="editorial-work-headline">{localize(project.headline, locale)}</p>

              <div className="editorial-work-result">
                <span>{t.result}</span>
                <p>{localize(project.result, locale)}</p>
              </div>

              <div className="editorial-work-evidence">
                <div>
                  <span>{t.proves}</span>
                  <ol>
                    {project.proof.map((item, proofIndex) => (
                      <li key={localize(item, locale)}>
                        <span>0{proofIndex + 1}</span>
                        {localize(item, locale)}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <span>{t.control}</span>
                  <p>{localize(project.trust, locale)}</p>
                </div>
              </div>

              <div className="editorial-work-links">
                <Link href={`/projects/${project.slug}`}>
                  {t.open} <span aria-hidden="true">↗</span>
                </Link>
                {project.external?.[0] ? (
                  <a href={project.external[0].href} rel="noreferrer" target="_blank">
                    {t.external} <span aria-hidden="true">↗</span>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="editorial-work-cta">
        <div className="editorial-shell editorial-work-cta-grid">
          <div>
            <p className="section-index">{t.ctaLabel}</p>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaBody}</p>
          </div>
          <Link className="editorial-button" href="/ai-workflow-audit">
            {t.cta} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
