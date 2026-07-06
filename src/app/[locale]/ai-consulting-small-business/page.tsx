import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import AiWorkflowAuditForm from "@/components/ads/AiWorkflowAuditForm";
import Button from "@/components/ui/Button";
import { BOOKING_URL, SITE } from "@/lib/constants";

const proofItems = [
  ["The Lineup", "Built and operate a paid analytics product with ML projections, live data pipelines, subscriptions, and automated settlement."],
  ["Travel automation", "Built high-volume AI systems for disputes, deal ranking, revenue workflows, and operational review inside a travel business."],
  ["Property operations", "Built practical internal tools for tenant, maintenance, vendor, and field-work coordination across 13 rental houses."],
];

const localizedCopy = {
  en: {
    eyebrow: "Practical AI consulting",
    title: "AI consulting for small businesses with messy workflows",
    body: "I help owner-led businesses turn inboxes, spreadsheets, PDFs, calls, and follow-up into practical AI-assisted systems people actually use.",
    bookCall: "Book a 15-minute workflow fit call",
    sendWorkflow: "Send one workflow",
    proofEyebrow: "Proof before pitch",
    proofItems,
    fitSignals: [
      "Your team repeats the same admin workflow every week.",
      "The work moves through inboxes, spreadsheets, PDFs, forms, calls, or follow-up notes.",
      "A person still needs final judgment, but the prep work should be cleaner.",
    ],
    methodEyebrow: "How this works",
    methodTitle: "AI implementation starts with one real workflow",
    methodBody:
      "The workflow audit is the mechanism. The goal is a practical AI system that makes repeated work easier without removing human judgment where it matters.",
    serviceSteps: [
      ["Map", "Find the workflow, owner, inputs, handoffs, and review points."],
      ["Prioritize", "Separate automate, redesign, buy, and keep-human decisions."],
      ["Build", "Ship the smallest useful system your team can actually trust."],
    ],
    startEyebrow: "Start small",
    startTitle: "Send one workflow",
    startBody:
      "A few plain sentences are enough. If it looks like a fit, the next step is a focused review of the workflow, tools, handoffs, and AI implementation options.",
    contextLabel: "AI consulting for small businesses",
    placeholder:
      "Example: every week we copy customer requests from email into a spreadsheet, check missing details, assign an owner, and follow up manually.",
  },
  fr: {
    eyebrow: "Consultation IA pratique",
    title: "Consultation IA pour petites entreprises avec workflows désordonnés",
    body: "J'aide les entreprises dirigées par leur propriétaire à transformer courriels, feuilles de calcul, PDF, appels et suivis en systèmes assistés par IA que les gens utilisent vraiment.",
    bookCall: "Réserver un appel de 15 minutes",
    sendWorkflow: "Envoyer un workflow",
    proofEyebrow: "Preuve avant le pitch",
    proofItems: [
      ["The Lineup", "Produit d'analytique payant que je bâtis et opère avec projections ML, pipelines en direct, abonnements et règlement automatisé."],
      ["Automatisation voyage", "Systèmes IA à fort volume pour contestations, classement d'offres, workflows de revenus et révision opérationnelle dans une entreprise de voyages."],
      ["Opérations immobilières", "Outils internes pratiques pour coordonner locataires, maintenance, fournisseurs et travail terrain sur 13 maisons locatives."],
    ],
    fitSignals: [
      "Votre équipe répète le même workflow administratif chaque semaine.",
      "Le travail passe par courriels, feuilles de calcul, PDF, formulaires, appels ou notes de suivi.",
      "Une personne doit encore juger au final, mais la préparation devrait être plus propre.",
    ],
    methodEyebrow: "Comment ça fonctionne",
    methodTitle: "L'implémentation IA commence par un vrai workflow",
    methodBody:
      "L'audit de workflow est le mécanisme. Le but est un système IA pratique qui facilite le travail répétitif sans retirer le jugement humain là où il compte.",
    serviceSteps: [
      ["Cartographier", "Trouver le workflow, le responsable, les entrées, les transferts et les points de révision."],
      ["Prioriser", "Séparer ce qui doit être automatisé, repensé, acheté ou gardé humain."],
      ["Construire", "Livrer le plus petit système utile auquel votre équipe peut faire confiance."],
    ],
    startEyebrow: "Commencer petit",
    startTitle: "Envoyez un workflow",
    startBody:
      "Quelques phrases simples suffisent. Si cela semble pertinent, la prochaine étape est une révision ciblée du workflow, des outils, des transferts et des options d'implémentation IA.",
    contextLabel: "Consultation IA pour petites entreprises",
    placeholder:
      "Exemple : chaque semaine, nous copions les demandes clients des courriels vers une feuille de calcul, vérifions les détails manquants, assignons un responsable et faisons le suivi manuellement.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = locale === "fr" ? localizedCopy.fr : localizedCopy.en;
  const path =
    locale === "fr"
      ? "/fr/ai-consulting-small-business"
      : "/ai-consulting-small-business";

  return {
    title: `${copy.title} | Duncan Anderson`,
    description: copy.body,
    alternates: {
      canonical: `${SITE.url}${path}`,
      languages: {
        en: `${SITE.url}/ai-consulting-small-business`,
        fr: `${SITE.url}/fr/ai-consulting-small-business`,
      },
    },
  };
}

export default async function AiConsultingSmallBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = locale === "fr" ? localizedCopy.fr : localizedCopy.en;

  return (
    <>
      <section className="bg-background px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_0.75fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-cream md:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
              {copy.body}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <BookingConversionLink
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-none bg-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-white transition-all duration-200 hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
              >
                {copy.bookCall}
              </BookingConversionLink>
              <Button href="#audit-form" variant="secondary">
                {copy.sendWorkflow}
              </Button>
            </div>
          </div>

          <aside className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              {copy.proofEyebrow}
            </p>
            <div className="mt-6 space-y-5">
              {copy.proofItems.map(([title, body]) => (
                <div key={title} className="border-l border-border pl-4">
                  <h2 className="font-display text-2xl text-cream">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-cream-muted">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-y border-border bg-white px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {copy.fitSignals.map((item) => (
            <article key={item} className="border-l border-border pl-5">
              <p className="text-sm leading-6 text-cream-muted">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              {copy.methodEyebrow}
            </p>
            <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
              {copy.methodTitle}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
              {copy.methodBody}
            </p>
          </div>
          <div className="grid gap-0 border-y border-border">
            {copy.serviceSteps.map(([title, body], index) => (
              <div
                key={title}
                className="grid gap-4 border-b border-border py-6 last:border-b-0 md:grid-cols-[100px_1fr]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                  0{index + 1}
                </p>
                <div>
                  <h3 className="font-display text-2xl text-cream">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-cream-muted">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1fr] lg:items-start">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
              {copy.startEyebrow}
            </p>
            <h2 className="font-display text-4xl leading-tight text-cream md:text-5xl">
              {copy.startTitle}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-cream-muted">
              {copy.startBody}
            </p>
          </div>
          <AiWorkflowAuditForm
            contextLabel={copy.contextLabel}
            workflowPlaceholder={copy.placeholder}
          />
        </div>
      </section>
    </>
  );
}
