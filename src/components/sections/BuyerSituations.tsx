import { useLocale } from "next-intl";

const copy = {
  en: {
    label: "Good first workflows",
    heading: "Start where missed details already have a cost.",
    intro: "The best first project repeats often, has recognizable inputs, and gives a person a clear review point.",
    items: [
      ["Follow-up that goes stale", "Quotes, inquiries, recommendations, or open work lose momentum because the next owner and date are unclear.", "A visible queue, next action, and review-ready follow-up."],
      ["Documents that need sorting", "PDFs, forms, photos, receipts, or email attachments arrive incomplete and require the same review every time.", "Structured intake, missing-info checks, and approval before records change."],
      ["An inbox acting as the system", "Requests arrive through too many channels, while status and responsibility live in memory or a spreadsheet.", "One operating view for owner, status, aging, exceptions, and next step."],
    ],
  },
  fr: {
    label: "Bons premiers workflows",
    heading: "Commencez là où les détails oubliés ont déjà un coût.",
    intro: "Le meilleur premier projet revient souvent, possède des entrées reconnaissables et donne à une personne un point de révision clair.",
    items: [
      ["Des suivis qui s’essoufflent", "Devis, demandes, recommandations ou dossiers ouverts perdent leur élan faute de responsable et de date clairs.", "Une file visible, une prochaine action et un suivi prêt à réviser."],
      ["Des documents à trier", "PDF, formulaires, photos, reçus ou pièces jointes arrivent incomplets et exigent toujours la même révision.", "Entrée structurée, vérification des éléments manquants et approbation avant toute modification."],
      ["Une boîte courriel devenue système", "Les demandes arrivent par trop de canaux, tandis que le statut et la responsabilité restent dans la mémoire ou une feuille de calcul.", "Une vue opérationnelle pour responsable, statut, ancienneté, exceptions et prochaine étape."],
    ],
  },
};

export default function BuyerSituations() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];
  return (
    <section className="bg-cream px-6 py-20 text-white md:py-24" aria-labelledby="situations-heading">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 border-b border-white/15 pb-9 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-blue-300">{t.label}</p>
            <h2 id="situations-heading" className="mt-4 max-w-3xl font-display text-4xl leading-tight md:text-5xl">{t.heading}</h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-white/65">{t.intro}</p>
        </div>
        <div className="grid divide-y divide-white/15 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {t.items.map(([title, problem, result], index) => (
            <article className="py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0" key={title}>
              <p className="font-mono text-xs text-blue-300">0{index + 1}</p>
              <h3 className="mt-4 font-display text-2xl">{title}</h3>
              <p className="mt-4 text-sm leading-6 text-white/60">{problem}</p>
              <p className="mt-5 border-l-2 border-blue-400 pl-4 text-sm leading-6 text-white/85">{result}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
