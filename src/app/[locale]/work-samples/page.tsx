import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import WorkSamplesPage from "@/app/work-samples/page";
import { SITE } from "@/lib/constants";

const frenchSamples = [
  {
    title: "Vérification d'inscription Mindbody",
    href: "/mindbody-enrollment-automation",
    category: "Prototype exécutable",
    summary:
      "Exemple d'automatisation qui vérifie les visites Mindbody existantes avant de préparer les inscriptions manquantes.",
    result:
      "Évite les doublons et protège les champs HubSpot déjà contrôlés par une synchronisation existante.",
    systems: ["Make.com", "Mindbody", "HubSpot", "Google Sheets"],
    englishOnly: true,
  },
  {
    title: "WillowOps",
    href: "/willowops-prototype",
    category: "Prototype exécutable",
    summary:
      "Prototype de données structurées pour transformer une source désordonnée en enregistrements prêts pour révision.",
    result:
      "Montre une approche review-first avant toute écriture vers Monday, Studio Designer, Xero ou une base centrale.",
    systems: ["Monday.com", "Make", "Microsoft 365", "Studio Designer"],
    englishOnly: true,
  },
  {
    title: "Portail opérations locatives",
    category: "Sandbox workflow",
    summary:
      "Prototype privé pour capter réparations, reçus, photos, suivis Gmail et transferts entrepreneurs.",
    result:
      "Garde Airtable comme source de vérité tout en ajoutant une couche de révision plus simple pour le terrain.",
    systems: ["Airtable", "Next.js", "Gmail", "Files de révision"],
  },
  {
    title: "Extraction de reçus locatifs",
    category: "Sandbox workflow",
    summary:
      "Surface de révision qui transforme reçus, factures ou notes terrain en champs structurés.",
    result:
      "Déplace la saisie désordonnée vers une étape d'approbation avant toute écriture permanente.",
    systems: ["Next.js", "Extraction documentaire", "Workflow de révision"],
  },
  {
    title: "Trauma Therapy Group Publisher",
    category: "Sandbox workflow",
    summary:
      "Espace privé qui transforme un Google Doc en brouillon WordPress nettoyé, révisable et prêt pour SEO.",
    result:
      "Réduit le copier-coller manuel tout en gardant la publication finale sous contrôle humain.",
    systems: ["Google Docs", "WordPress", "Elementor", "Yoast SEO"],
  },
  {
    title: "Dispute Defender",
    href: "/fr/projects/dispute-defender",
    category: "Étude de cas",
    summary:
      "Pipeline IA qui rassemble les preuves de réservation et prépare des réponses adaptées aux contestations.",
    result:
      "Récupère des revenus et réduit le travail manuel répétitif autour des rétrofacturations.",
    systems: ["Python", "Machine learning", "APIs", "Pipelines de données"],
  },
  {
    title: "Deal Engine",
    href: "/fr/projects/deal-engine",
    category: "Étude de cas",
    summary:
      "Moteur de classement qui analyse l'inventaire de vols et met en avant les meilleures offres.",
    result:
      "Remplace la curation manuelle par un classement toujours actif lié à l'intention d'achat.",
    systems: ["Python", "SQL", "Analytique temps réel", "Recommandations"],
  },
  {
    title: "The Lineup",
    href: "/fr/projects/the-lineup",
    category: "Étude de cas",
    summary:
      "Produit payant d'analytique sportive avec projections ML, cotes en direct, facturation et règlement automatisé.",
    result:
      "Montre une propriété produit complète : modèles, pipelines, billing, monitoring et décisions utilisateur.",
    systems: ["Python", "FastAPI", "Next.js", "PostgreSQL", "Stripe"],
  },
];

function FrenchWorkSamplesPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 py-24 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-500">Exemples de portfolio</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-slate-950">
            Exemples construits autour de vrais problèmes opérationnels.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Un index pratique de prototypes, sandboxes et systèmes livrés. Chaque exemple montre des entrées claires, des décisions visibles, des garde-fous et des sorties utiles pour une équipe.
          </p>
        </header>

        <section className="mt-8 grid gap-3 border-y border-slate-200 py-5 sm:grid-cols-3">
          <SummaryMetric label="Exemples" value={frenchSamples.length.toString()} />
          <SummaryMetric
            label="Liens publics"
            value={frenchSamples.filter((sample) => sample.href).length.toString()}
          />
          <SummaryMetric label="Systèmes représentés" value="25+" />
        </section>

        <div className="mt-10 grid gap-5">
          {frenchSamples.map((sample) => (
            <article className="rounded-lg border border-slate-200 bg-white" key={sample.title}>
              <div className="grid gap-0 lg:grid-cols-[1fr_19rem]">
                <div className="px-6 py-6 sm:px-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {sample.category}
                    </span>
                    {sample.englishOnly ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
                        Prototype en anglais
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">{sample.title}</h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{sample.summary}</p>
                  <p className="mt-4 max-w-3xl rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
                    {sample.result}
                  </p>

                  <div className="mt-6">
                    {sample.href ? (
                      <Link
                        className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        href={sample.href}
                      >
                        Ouvrir l&apos;exemple
                      </Link>
                    ) : (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
                        Sandbox privé; résumé public seulement.
                      </span>
                    )}
                  </div>
                </div>

                <aside className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 lg:border-l lg:border-t-0">
                  <p className="text-sm font-semibold text-slate-500">Systèmes montrés</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    {sample.systems.map((system) => (
                      <li key={system}>{system}</li>
                    ))}
                  </ul>
                </aside>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFrench = locale === "fr";

  return {
    title: isFrench
      ? "Exemples de systèmes IA et automatisation | Duncan Anderson"
      : "AI and Automation Work Samples | Duncan Anderson",
    description: isFrench
      ? "Exemples de prototypes, workflows et systèmes livrés autour de vrais problèmes opérationnels."
      : "A practical index of prototypes, workflow sandboxes, and shipped systems built around real operating problems.",
    alternates: {
      canonical: `${SITE.url}${isFrench ? "/fr" : ""}/work-samples`,
      languages: {
        en: `${SITE.url}/work-samples`,
        fr: `${SITE.url}/fr/work-samples`,
      },
    },
  };
}

export default async function LocalizedWorkSamplesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === "fr") {
    return <FrenchWorkSamplesPage />;
  }

  return <WorkSamplesPage />;
}
