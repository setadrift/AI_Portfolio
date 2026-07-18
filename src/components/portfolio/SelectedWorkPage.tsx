import { Link } from "@/i18n/navigation";
import PortfolioProofVisual from "@/components/portfolio/PortfolioProofVisual";
import { FEATURED_PORTFOLIO, localize, portfolioStatusClass } from "@/lib/portfolio";

const copy = {
  en: {
    label: "Selected work",
    heading: "A small proof dossier, not a project inventory.",
    intro:
      "These are the systems I would want a buyer to inspect before hiring me. Each one states what shipped, what I owned, what can be verified, and where confidentiality limits the public evidence.",
    live: "Live product",
    client: "Client delivery",
    enterprise: "Enterprise system",
    labels:
      "Status describes the evidence level: public and operating, delivered to a client, or reconstructed from confidential production work.",
    result: "What changed",
    proves: "What this proves",
    open: "Open case study",
    external: "Open public proof",
    cta: "Discuss a similar workflow",
  },
  fr: {
    label: "Travaux sélectionnés",
    heading: "Un petit dossier de preuves, pas un inventaire de projets.",
    intro:
      "Ce sont les systèmes qu'un acheteur devrait inspecter avant de m'engager. Chacun indique ce qui a été livré, ce que j'ai pris en charge, ce qui est vérifiable et où la confidentialité limite les preuves publiques.",
    live: "Produit en ligne",
    client: "Livraison client",
    enterprise: "Système d'entreprise",
    labels:
      "Le statut décrit le niveau de preuve : public et en fonction, livré à un client ou reconstruit à partir d'un système de production confidentiel.",
    result: "Ce qui a changé",
    proves: "Ce que cela démontre",
    open: "Ouvrir l'étude de cas",
    external: "Ouvrir la preuve publique",
    cta: "Discuter d'un workflow semblable",
  },
};

export default function SelectedWorkPage({ locale }: { locale: "en" | "fr" }) {
  const t = copy[locale];

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 pb-24 pt-32 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="grid gap-8 border-b border-slate-300 pb-10 lg:grid-cols-[1fr_0.65fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">{t.label}</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.06] md:text-6xl">{t.heading}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{t.intro}</p>
          </div>
          <div className="border-l-2 border-blue-600 pl-5">
            <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
              <span className="bg-emerald-100 px-2.5 py-1.5 text-emerald-900">{t.live}</span>
              <span className="bg-blue-100 px-2.5 py-1.5 text-blue-900">{t.client}</span>
              <span className="bg-slate-200 px-2.5 py-1.5 text-slate-800">{t.enterprise}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{t.labels}</p>
          </div>
        </header>

        <div className="divide-y divide-slate-300">
          {FEATURED_PORTFOLIO.map((project, index) => (
            <article className="grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12" key={project.slug}>
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <PortfolioProofVisual locale={locale} visual={project.visual} />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {localize(project.visualNote, locale)}
                </p>
              </div>

              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <span className={`px-2.5 py-1.5 ${portfolioStatusClass(project)}`}>{localize(project.status, locale)}</span>
                  <span className="text-slate-500">{localize(project.role, locale)}</span>
                </div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-blue-700">{localize(project.clientType, locale)}</p>
                <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">{localize(project.title, locale)}</h2>
                <p className="mt-4 text-xl leading-8 text-slate-800">{localize(project.headline, locale)}</p>

                <div className="mt-7 border-y border-slate-300 py-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{t.result}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{localize(project.result, locale)}</p>
                </div>

                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{t.proves}</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {project.proof.map((item) => (
                      <li className="flex gap-3" key={localize(item, locale)}>
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                        {localize(item, locale)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link className="bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href={`/projects/${project.slug}`}>
                    {t.open}
                  </Link>
                  {project.external?.[0] ? (
                    <a className="border border-slate-300 px-4 py-3 text-sm font-semibold transition hover:border-blue-500" href={project.external[0].href} rel="noreferrer" target="_blank">
                      {t.external} ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="grid gap-6 border border-slate-300 bg-white p-8 md:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="font-display text-2xl">{t.cta}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {locale === "fr"
                ? "Envoyez le processus actuel, les outils concernés et l'endroit où le travail se bloque."
                : "Send the current process, the tools involved, and the point where the work breaks down."}
            </p>
          </div>
          <Link className="bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800" href="/#contact">
            {locale === "fr" ? "Discuter du workflow" : "Discuss your workflow"}
          </Link>
        </section>
      </div>
    </main>
  );
}
