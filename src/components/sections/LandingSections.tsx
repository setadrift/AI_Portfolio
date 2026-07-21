import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    fit: {
      eyebrow: "Where I can help",
      heading: "A good fit when important work still depends on memory and follow-up.",
      intro: "You do not need an AI strategy for the whole company. You need one recurring workflow where the friction is visible and the result can be reviewed.",
      items: [
        ["Follow-up keeps slipping", "Quotes, inquiries, approvals, or open work lose momentum because the next owner or date is unclear."],
        ["Documents need the same review", "Forms, PDFs, receipts, photos, or email attachments are repeatedly sorted, checked, and copied by hand."],
        ["The inbox is the operating system", "Requests arrive through several channels while status and responsibility live in someone’s head or spreadsheet."],
      ],
    },
    method: {
      eyebrow: "The diagnostic",
      heading: "Understand the work before building anything.",
      intro: "The first engagement is deliberately contained. Its job is to determine what is worth changing, what should stay human, and what a sensible first implementation would require.",
      steps: [
        ["Map the current workflow", "We trace inputs, owners, handoffs, exceptions, tools, and the places where work stalls or gets repeated."],
        ["Prioritize worthwhile opportunities", "We compare frequency, effort, risk, data readiness, and likely time or cost impact using stated assumptions."],
        ["Build the implementation plan", "You receive a practical sequence, review boundaries, tool requirements, and a clear scope for any next phase."],
      ],
      outputLabel: "What you leave with",
      output: ["A current-state workflow map", "A prioritized opportunity list", "Credible impact assumptions", "A practical implementation plan"],
      boundary: "No obligation to hire me for implementation. Any build is proposed and scoped separately.",
    },
    proof: {
      eyebrow: "Relevant work",
      heading: "Built around real operating constraints.",
      intro: "These are delivered systems, described without invented savings or performance claims.",
      projects: [
        {
          type: "Property operations · Client delivery",
          title: "A safer path from field work to Airtable",
          body: "A private, phone-friendly workflow stages repair notes, receipts, contractor handoffs, and extracted details for review before anything reaches the live record.",
          trust: "Uncertain extraction stays in review; Airtable remains the source of truth.",
        },
        {
          type: "Healthcare publishing · Client delivery",
          title: "From approved Google Doc to review-ready WordPress draft",
          body: "A publishing workflow handles document cleanup, article structure, editable SEO fields, image preparation, and draft assembly without publishing automatically.",
          trust: "The client keeps final review and publication control.",
        },
      ],
      more: "See detailed work samples",
      aboutLabel: "Founder-led, personally delivered",
      imageAlt: "Duncan Anderson, AI workflow consultant",
      about: "I’m Duncan Anderson, a data scientist, product builder, and operator. I spent years building data and automation systems inside a travel business and now build and run The Lineup, a live paid analytics product. I lead every consulting engagement myself.",
    },
    final: {
      eyebrow: "Start with one workflow",
      heading: "Bring the recurring work your team is tired of holding together by hand.",
      body: "We’ll use a short discovery call to decide whether it is a strong candidate for a fixed-scope diagnostic.",
      cta: "Book a discovery call",
      note: "20 minutes · No broad AI pitch",
    },
  },
  fr: {
    fit: {
      eyebrow: "Là où je peux aider",
      heading: "Un bon fit lorsque du travail important dépend encore de la mémoire et des suivis.",
      intro: "Vous n’avez pas besoin d’une stratégie IA pour toute l’entreprise. Vous avez besoin d’un workflow récurrent où la friction est visible et le résultat peut être révisé.",
      items: [
        ["Les suivis glissent", "Devis, demandes, approbations ou dossiers ouverts perdent leur élan faute de responsable ou de date claire."],
        ["Les documents exigent la même révision", "Formulaires, PDF, reçus, photos ou pièces jointes sont continuellement triés, vérifiés et copiés à la main."],
        ["La boîte courriel sert de système", "Les demandes arrivent de plusieurs canaux tandis que le statut et la responsabilité vivent dans la tête de quelqu’un ou une feuille de calcul."],
      ],
    },
    method: {
      eyebrow: "Le diagnostic",
      heading: "Comprendre le travail avant de construire.",
      intro: "Le premier mandat est volontairement circonscrit. Il sert à déterminer ce qui mérite d’être changé, ce qui doit rester humain et ce qu’exigerait une première implémentation raisonnable.",
      steps: [
        ["Cartographier le workflow actuel", "Nous retraçons les entrées, responsables, transferts, exceptions, outils et endroits où le travail bloque ou se répète."],
        ["Prioriser les bonnes occasions", "Nous comparons fréquence, effort, risque, état des données et impact probable sur le temps ou les coûts avec des hypothèses explicites."],
        ["Construire le plan d’implémentation", "Vous recevez une séquence pratique, les limites de révision, les outils requis et une portée claire pour toute phase suivante."],
      ],
      outputLabel: "Ce que vous obtenez",
      output: ["Une carte du workflow actuel", "Une liste d’occasions priorisées", "Des hypothèses d’impact crédibles", "Un plan d’implémentation pratique"],
      boundary: "Aucune obligation de me confier l’implémentation. Toute construction est proposée et définie séparément.",
    },
    proof: {
      eyebrow: "Travail pertinent",
      heading: "Construit autour de vraies contraintes opérationnelles.",
      intro: "Des systèmes livrés, décrits sans économies ni résultats de performance inventés.",
      projects: [
        {
          type: "Opérations immobilières · Livraison client",
          title: "Un parcours plus sûr du terrain vers Airtable",
          body: "Un workflow privé et adapté au téléphone prépare les notes de réparation, reçus, transferts aux entrepreneurs et données extraites pour révision avant le dossier en production.",
          trust: "L’extraction incertaine reste en révision; Airtable demeure la source de vérité.",
        },
        {
          type: "Publication en santé · Livraison client",
          title: "Du Google Doc approuvé au brouillon WordPress prêt à réviser",
          body: "Un workflow de publication gère le nettoyage, la structure, les champs SEO modifiables, la préparation d’image et le brouillon sans publication automatique.",
          trust: "Le client conserve la révision finale et le contrôle de la publication.",
        },
      ],
      more: "Voir les exemples détaillés",
      aboutLabel: "Dirigé et livré personnellement",
      imageAlt: "Duncan Anderson, consultant en workflows IA",
      about: "Je suis Duncan Anderson, scientifique des données, créateur de produits et opérateur. J’ai passé des années à construire des systèmes de données et d’automatisation dans une entreprise de voyage, et je construis et exploite maintenant The Lineup, un produit analytique payant en ligne. Je dirige moi-même chaque mandat de conseil.",
    },
    final: {
      eyebrow: "Commencez par un workflow",
      heading: "Apportez le travail récurrent que votre équipe ne veut plus tenir ensemble à la main.",
      body: "Un court appel découverte nous permettra de décider s’il s’agit d’un bon candidat pour un diagnostic à portée fixe.",
      cta: "Réserver un appel découverte",
      note: "20 minutes · Aucun pitch IA général",
    },
  },
};

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.22em] ${dark ? "text-blue-300" : "text-accent"}`}>{children}</p>;
}

export default function LandingSections() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];

  return (
    <>
      <section id="services" className="scroll-mt-20 bg-white px-5 py-14 sm:px-6 md:py-20" aria-labelledby="fit-heading">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
            <div>
              <Eyebrow>{t.fit.eyebrow}</Eyebrow>
              <h2 id="fit-heading" className="mt-4 max-w-xl font-display text-3xl leading-tight text-cream sm:text-4xl">{t.fit.heading}</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-cream-muted md:pt-7">{t.fit.intro}</p>
          </div>
          <div className="mt-9 divide-y divide-border border-y border-border">
            {t.fit.items.map(([title, body], index) => (
              <article className="grid gap-2 py-5 sm:grid-cols-[3rem_15rem_1fr] sm:items-start sm:gap-5" key={title}>
                <span className="font-mono text-xs text-accent">0{index + 1}</span>
                <h3 className="font-semibold text-cream">{title}</h3>
                <p className="text-sm leading-6 text-cream-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="scroll-mt-16 bg-cream px-5 py-14 text-white sm:px-6 md:py-20" aria-labelledby="method-heading">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.72fr] lg:gap-16">
          <div>
            <Eyebrow dark>{t.method.eyebrow}</Eyebrow>
            <h2 id="method-heading" className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">{t.method.heading}</h2>
            <p className="mt-5 max-w-2xl leading-7 text-white/65">{t.method.intro}</p>
            <ol className="mt-8 divide-y divide-white/15 border-y border-white/15">
              {t.method.steps.map(([title, body], index) => (
                <li className="grid gap-2 py-5 sm:grid-cols-[3rem_12rem_1fr] sm:gap-5" key={title}>
                  <span className="font-mono text-xs text-blue-300">0{index + 1}</span>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-6 text-white/60">{body}</p>
                </li>
              ))}
            </ol>
          </div>
          <aside className="self-end border-t-2 border-blue-400 bg-white/[0.06] p-6" aria-label={t.method.outputLabel}>
            <h3 className="font-display text-2xl">{t.method.outputLabel}</h3>
            <ul className="mt-5 space-y-3">
              {t.method.output.map((item) => <li className="flex gap-3 text-sm text-white/80" key={item}><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-blue-300" />{item}</li>)}
            </ul>
            <p className="mt-6 border-t border-white/15 pt-5 text-sm leading-6 text-white/55">{t.method.boundary}</p>
          </aside>
        </div>
      </section>

      <section id="projects" className="scroll-mt-16 bg-background px-5 py-14 sm:px-6 md:py-20" aria-labelledby="proof-heading">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-[1fr_0.72fr] md:items-end md:gap-12">
            <div>
              <Eyebrow>{t.proof.eyebrow}</Eyebrow>
              <h2 id="proof-heading" className="mt-4 font-display text-3xl leading-tight text-cream sm:text-4xl">{t.proof.heading}</h2>
            </div>
            <p className="text-sm leading-6 text-cream-muted">{t.proof.intro}</p>
          </div>
          <div className="mt-9 grid border-y border-border md:grid-cols-2 md:divide-x md:divide-border">
            {t.proof.projects.map((project) => (
              <article className="border-b border-border py-7 last:border-b-0 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0" key={project.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cream-dim">{project.type}</p>
                <h3 className="mt-3 font-display text-2xl leading-tight text-cream">{project.title}</h3>
                <p className="mt-4 text-sm leading-6 text-cream-muted">{project.body}</p>
                <p className="mt-5 border-l-2 border-accent pl-4 text-sm leading-6 text-cream">{project.trust}</p>
              </article>
            ))}
          </div>
          <Link href="/work-samples" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-border underline-offset-4 hover:text-accent-hover">{t.proof.more}</Link>

          <div id="about" className="scroll-mt-20 mt-10 border-t border-border pt-8">
            <div className="grid items-center gap-7 md:grid-cols-[13rem_1fr] md:gap-10">
              <Image
                src="/duncs.png"
                alt={t.proof.imageAlt}
                width={880}
                height={1168}
                unoptimized
                className="aspect-[3/4] w-48 justify-self-center object-cover object-top md:w-52 md:justify-self-start"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cream-dim">{t.proof.aboutLabel}</p>
                <p className="mt-4 max-w-3xl text-base leading-7 text-cream-muted">{t.proof.about}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-6 md:py-20" aria-labelledby="final-cta-heading">
        <div className="mx-auto max-w-6xl border-l-4 border-accent pl-5 sm:pl-8">
          <Eyebrow>{t.final.eyebrow}</Eyebrow>
          <h2 id="final-cta-heading" className="mt-4 max-w-3xl font-display text-3xl leading-tight text-cream sm:text-4xl">{t.final.heading}</h2>
          <p className="mt-4 max-w-2xl leading-7 text-cream-muted">{t.final.body}</p>
          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            <BookingConversionLink href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 sm:w-auto">{t.final.cta}</BookingConversionLink>
            <p className="text-sm text-cream-dim">{t.final.note}</p>
          </div>
        </div>
      </section>
    </>
  );
}
