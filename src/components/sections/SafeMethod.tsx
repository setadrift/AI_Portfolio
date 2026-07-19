import { useLocale } from "next-intl";

const copy = {
  en: {
    label: "How the work stays safe",
    heading: "The useful system is usually smaller than the first idea.",
    intro: "I map the real process, remove avoidable friction, and only automate the decisions that can be tested and reviewed.",
    steps: [
      ["Map the actual work", "Inputs, owners, handoffs, exceptions, delays, and the system that remains authoritative."],
      ["Simplify before automating", "Remove duplicate steps and unclear decisions before adding a model or integration."],
      ["Build against test cases", "Use representative records, explicit failure states, and the smallest useful production boundary."],
      ["Keep review and recovery visible", "People approve consequential changes; exceptions have an owner; credentials and logs stay controlled."],
      ["Operate and hand off", "Document the workflow, monitor what matters, and decide whether the next phase has earned its place."],
    ],
    staysHuman: "What stays human",
    boundary: "Commercial judgment, clinical or legal decisions, final publication, uncertain data promotion, and other consequential approvals remain with the client team.",
  },
  fr: {
    label: "Comment le travail reste sécuritaire",
    heading: "Le système utile est souvent plus petit que la première idée.",
    intro: "Je cartographie le vrai processus, retire la friction évitable et automatise seulement les décisions qui peuvent être testées et révisées.",
    steps: [
      ["Cartographier le vrai travail", "Entrées, responsables, transferts, exceptions, délais et système qui demeure la source officielle."],
      ["Simplifier avant d’automatiser", "Retirer les doublons et décisions floues avant d’ajouter un modèle ou une intégration."],
      ["Construire avec des cas de test", "Utiliser des dossiers représentatifs, des échecs explicites et la plus petite limite de production utile."],
      ["Garder la révision et la reprise visibles", "Les personnes approuvent les changements importants; les exceptions ont un responsable; les accès et journaux restent contrôlés."],
      ["Opérer et transférer", "Documenter le workflow, surveiller l’important et décider si la prochaine phase a mérité sa place."],
    ],
    staysHuman: "Ce qui reste humain",
    boundary: "Le jugement commercial, les décisions cliniques ou juridiques, la publication finale, la promotion de données incertaines et les approbations importantes restent avec l’équipe client.",
  },
};

export default function SafeMethod() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];
  return (
    <section id="method" className="bg-cream px-6 py-20 text-white md:py-28" aria-labelledby="method-heading">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-blue-300">{t.label}</p>
            <h2 id="method-heading" className="mt-4 font-display text-4xl leading-tight md:text-5xl">{t.heading}</h2>
            <p className="mt-6 max-w-xl leading-7 text-white/65">{t.intro}</p>
            <div className="mt-9 border-l-2 border-amber-400 pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{t.staysHuman}</p>
              <p className="mt-3 text-sm leading-6 text-white/75">{t.boundary}</p>
            </div>
          </div>
          <ol className="divide-y divide-white/15 border-y border-white/15">
            {t.steps.map(([title, body], index) => (
              <li className="grid gap-3 py-5 sm:grid-cols-[3rem_1fr]" key={title}>
                <span className="font-mono text-xs text-blue-300">0{index + 1}</span>
                <div><h3 className="font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-6 text-white/60">{body}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
