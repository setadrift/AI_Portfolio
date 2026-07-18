import { useLocale } from "next-intl";
import Button from "@/components/ui/Button";

const copy = {
  en: {
    label: "Ways to work together",
    heading: "A small first decision, then evidence before expansion.",
    intro: "You do not need to commit to a company-wide AI program. We start by deciding whether one workflow is worth fixing and what kind of first phase fits the risk.",
    options: [
      { step: "01", title: "Workflow fit call", time: "20 minutes", fit: "For a specific recurring workflow and a buyer deciding whether it is worth investigating.", includes: ["Plain-language workflow review", "Initial fit and risk read", "Recommendation: leave manual, buy, redesign, or audit"], action: "Discuss your workflow" },
      { step: "02", title: "Fixed-scope workflow audit", time: "Usually 2–3 business days", fit: "For work that is frequent, measurable, and important enough to map before anyone builds.", includes: ["Current-state workflow map", "Bottlenecks and human-review boundaries", "Prioritized build plan and tool readiness"], action: "Request an audit" },
      { step: "03", title: "Paid pilot and production build", time: "Scoped after the audit", fit: "For a validated workflow where a small implementation can prove value without disrupting live operations.", includes: ["Review-first working system", "Exception handling and monitoring", "Documentation, handoff, and next-phase decision"], action: "See delivery proof" },
    ],
  },
  fr: {
    label: "Façons de travailler ensemble",
    heading: "Une petite première décision, puis des preuves avant d’élargir.",
    intro: "Vous n’avez pas besoin de vous engager dans un programme IA pour toute l’entreprise. Nous décidons d’abord si un workflow vaut la peine d’être corrigé et quelle première phase convient au risque.",
    options: [
      { step: "01", title: "Appel de compatibilité", time: "20 minutes", fit: "Pour un workflow récurrent précis et un décideur qui veut savoir s’il mérite une analyse.", includes: ["Révision du workflow en langage simple", "Première lecture du fit et du risque", "Recommandation : garder manuel, acheter, repenser ou auditer"], action: "Discuter du workflow" },
      { step: "02", title: "Audit de workflow à portée fixe", time: "Habituellement 2–3 jours ouvrables", fit: "Pour un travail fréquent, mesurable et assez important pour être cartographié avant la construction.", includes: ["Carte du workflow actuel", "Goulots et limites de révision humaine", "Plan de construction priorisé et état des outils"], action: "Demander un audit" },
      { step: "03", title: "Pilote payé et mise en production", time: "Défini après l’audit", fit: "Pour un workflow validé où une petite implémentation peut prouver sa valeur sans perturber les opérations.", includes: ["Système fonctionnel centré sur la révision", "Exceptions et surveillance", "Documentation, transfert et décision de phase suivante"], action: "Voir les preuves" },
    ],
  },
};

export default function WorkflowOffers() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];
  return (
    <section id="services" className="bg-background px-6 py-20 md:py-28" aria-labelledby="services-heading">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">{t.label}</p>
            <h2 id="services-heading" className="mt-4 max-w-3xl font-display text-4xl leading-tight text-cream md:text-5xl">{t.heading}</h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-cream-muted">{t.intro}</p>
        </div>
        <div className="grid divide-y divide-border border-b border-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {t.options.map((option, index) => (
            <article className="flex flex-col py-9 lg:px-8 lg:first:pl-0 lg:last:pr-0" key={option.step}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs font-semibold text-accent">{option.step}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-cream-dim">{option.time}</span>
              </div>
              <h3 className="mt-5 font-display text-3xl leading-tight text-cream">{option.title}</h3>
              <p className="mt-4 text-sm leading-6 text-cream-muted">{option.fit}</p>
              <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-5">
                {option.includes.map((item) => <li className="flex gap-3 text-sm leading-6 text-cream-muted" key={item}><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />{item}</li>)}
              </ul>
              <div className="mt-7"><Button href={index === 2 ? "/#projects" : "/ai-workflow-audit"} variant={index === 0 ? "primary" : "secondary"}>{option.action}</Button></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
