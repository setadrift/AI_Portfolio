import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    offer: {
      number: "01 / The engagement",
      heading: "One recurring workflow. Ten business days. A working system.",
      intro: "The sprint is intentionally narrow. We trace the work as it actually happens, agree on a visible finish line, and build the smallest reliable system that can carry it.",
      moves: [
        ["Days 1–2", "Map", "Inputs, owners, handoffs, exceptions."],
        ["Days 3–7", "Build", "The working path and essential connections."],
        ["Days 8–9", "Review", "Real cases, human decisions, visible gaps."],
        ["Day 10", "Hand off", "Documentation, walkthrough, next steps."],
      ],
      closing: "One workflow. One defined outcome. No company-wide transformation theatre.",
    },
    ttg: {
      number: "02 / Selected work",
      type: "Healthcare operations · Private client delivery",
      heading: "A weekly leadership review built around what the owner needs to decide.",
      body: "The TTG dashboard turns a controlled reporting workbook into a clear operating view—while keeping source coverage, reporting periods, and unresolved questions visible.",
      artifactLabel: "Leadership review",
      artifactTitle: "What needs attention this week?",
      signals: ["Reporting period visible", "Source coverage traced", "Open questions held"],
      footer: "Decision support without hiding the gaps",
    },
    property: {
      type: "Property operations · Client delivery",
      heading: "Field notes become a clean owner review—not a risky database update.",
      body: "Repair notes, receipts, photos, and contractor handoffs move through a phone-friendly review path before anything reaches the live Airtable record.",
      link: "Read the case study",
      inputs: ["Voice note", "Receipt", "Site photo", "Contractor update"],
      output: "Owner review",
    },
    dispute: {
      type: "Travel operations · Confidential enterprise work",
      heading: "Evidence assembled around the case instead of chased across systems.",
      body: "Booking, payment, and communication records were brought together into a tailored evidence package with the final response held for review.",
      link: "Read the case study",
      sources: ["Booking record", "Payment history", "Customer messages", "Case policy"],
      output: "Evidence package / review ready",
    },
    operator: {
      number: "03 / The operator",
      heading: "Designed, built, and handed off by the person in the room.",
      body: "I’m Duncan Anderson—a data scientist, product builder, and operator. I spent years building data and automation systems inside a travel business and now build every consulting sprint personally.",
      link: "Review the full proof dossier",
      alt: "Duncan Anderson, independent systems consultant",
    },
    pricing: {
      number: "04 / Investment",
      heading: "Most One Workflow Sprints cost CAD $5,000–$9,000.",
      body: "Every sprint is fixed-scope. After a 20-minute fit call, you receive a written finish line, delivery plan, and fixed quote before work begins.",
      cta: "Discuss your workflow",
    },
    final: {
      number: "05 / Start here",
      heading: "What is your team still holding together by hand?",
      body: "Bring the recurring process. We’ll decide whether it has a clear enough finish line for a sprint.",
      email: "duncan@duncananderson.ca",
      cta: "Book a fit call",
    },
  },
  fr: {
    offer: {
      number: "01 / Le mandat",
      heading: "Un workflow récurrent. Dix jours ouvrables. Un système fonctionnel.",
      intro: "Le sprint reste volontairement étroit. Nous retraçons le travail réel, convenons d’une ligne d’arrivée visible et construisons le plus petit système fiable capable de le prendre en charge.",
      moves: [
        ["Jours 1–2", "Cartographier", "Entrées, responsables, transferts, exceptions."],
        ["Jours 3–7", "Construire", "Le parcours fonctionnel et les connexions essentielles."],
        ["Jours 8–9", "Réviser", "Cas réels, décisions humaines, écarts visibles."],
        ["Jour 10", "Transférer", "Documentation, présentation et prochaines étapes."],
      ],
      closing: "Un workflow. Un résultat défini. Aucun théâtre de transformation globale.",
    },
    ttg: {
      number: "02 / Travail sélectionné",
      type: "Opérations en santé · Livraison client privée",
      heading: "Une révision de direction hebdomadaire centrée sur les décisions de la propriétaire.",
      body: "Le tableau de bord TTG transforme un workbook contrôlé en vue opérationnelle claire, tout en gardant visibles la couverture des sources, les périodes et les questions ouvertes.",
      artifactLabel: "Révision de direction",
      artifactTitle: "Qu’est-ce qui exige une décision cette semaine?",
      signals: ["Période visible", "Couverture des sources tracée", "Questions ouvertes retenues"],
      footer: "Soutien décisionnel sans cacher les lacunes",
    },
    property: {
      type: "Opérations immobilières · Livraison client",
      heading: "Les notes terrain deviennent une révision claire, pas une mise à jour risquée.",
      body: "Notes, reçus, photos et transferts aux entrepreneurs passent par une révision mobile avant d’atteindre le dossier Airtable réel.",
      link: "Lire l’étude de cas",
      inputs: ["Note vocale", "Reçu", "Photo du site", "Mise à jour entrepreneur"],
      output: "Révision propriétaire",
    },
    dispute: {
      type: "Opérations voyage · Travail d’entreprise confidentiel",
      heading: "Les preuves sont assemblées autour du dossier au lieu d’être cherchées partout.",
      body: "Réservation, paiement et communications étaient réunis dans un dossier de preuves adapté, avec la réponse finale retenue pour révision.",
      link: "Lire l’étude de cas",
      sources: ["Dossier de réservation", "Historique de paiement", "Messages client", "Politique du dossier"],
      output: "Dossier de preuves / prêt à réviser",
    },
    operator: {
      number: "03 / L’opérateur",
      heading: "Conçu, construit et transféré par la personne dans la pièce.",
      body: "Je suis Duncan Anderson—scientifique des données, créateur de produits et opérateur. J’ai bâti des systèmes de données et d’automatisation dans une entreprise de voyage et je livre maintenant chaque sprint personnellement.",
      link: "Voir le dossier de preuves complet",
      alt: "Duncan Anderson, consultant indépendant en systèmes",
    },
    pricing: {
      number: "04 / Investissement",
      heading: "La plupart des sprints coûtent 5 000–9 000 $ CA.",
      body: "Chaque sprint a une portée fixe. Après un appel de 20 minutes, vous recevez une ligne d’arrivée, un plan de livraison et un prix fixe avant le début.",
      cta: "Discuter de votre workflow",
    },
    final: {
      number: "05 / Commencez ici",
      heading: "Quel travail votre équipe tient-elle encore ensemble à la main?",
      body: "Apportez le processus récurrent. Nous déciderons si sa ligne d’arrivée est assez claire pour un sprint.",
      email: "duncan@duncananderson.ca",
      cta: "Réserver un appel",
    },
  },
};

function TTGArtifact({ t }: { t: (typeof copy)["en"]["ttg"] }) {
  return (
    <div className="ttg-editorial-artifact" aria-label={`${t.artifactTitle}: ${t.signals.join(", ")}`}>
      <div className="ttg-artifact-head"><span>{t.artifactLabel}</span><span>TTG / 07.22</span></div>
      <h3>{t.artifactTitle}</h3>
      <div className="ttg-artifact-chart" aria-hidden="true">
        <span style={{ height: "34%" }} /><span style={{ height: "54%" }} /><span style={{ height: "47%" }} /><span style={{ height: "78%" }} /><span style={{ height: "66%" }} /><span style={{ height: "88%" }} />
        <i />
      </div>
      <ol>{t.signals.map((signal, index) => <li key={signal}><span>0{index + 1}</span>{signal}</li>)}</ol>
      <p>{t.footer}</p>
    </div>
  );
}

function PropertyArtifact({ t }: { t: (typeof copy)["en"]["property"] }) {
  return (
    <div className="property-artifact" aria-label={`${t.inputs.join(", ")} — ${t.output}`}>
      {t.inputs.map((input, index) => <span className={`property-slip property-slip-${index + 1}`} key={input}><i>0{index + 1}</i>{input}</span>)}
      <strong>{t.output}<b aria-hidden="true">→</b></strong>
    </div>
  );
}

function DisputeArtifact({ t }: { t: (typeof copy)["en"]["dispute"] }) {
  return (
    <div className="dispute-artifact" aria-label={`${t.sources.join(", ")} — ${t.output}`}>
      <div className="dispute-index"><span>CASE</span><strong>02491</strong><i>REVIEW</i></div>
      <ol>{t.sources.map((source, index) => <li key={source}><span>0{index + 1}</span><b>{source}</b><i aria-hidden="true" /></li>)}</ol>
      <p>{t.output}</p>
    </div>
  );
}

export default function LandingSections() {
  const locale = useLocale() === "fr" ? "fr" : "en";
  const t = copy[locale];

  return (
    <>
      <section id="services" className="editorial-offer" aria-labelledby="offer-heading">
        <div className="editorial-shell">
          <p className="section-index">{t.offer.number}</p>
          <div className="offer-intro">
            <h2 id="offer-heading">{t.offer.heading}</h2>
            <p>{t.offer.intro}</p>
          </div>
          <ol className="sprint-moves">
            {t.offer.moves.map(([days, title, body], index) => <li key={title}><span>0{index + 1}</span><time>{days}</time><h3>{title}</h3><p>{body}</p></li>)}
          </ol>
          <p className="offer-closing">{t.offer.closing}</p>
        </div>
      </section>

      <section id="projects" className="ttg-proof" aria-labelledby="ttg-heading">
        <div className="editorial-shell ttg-proof-grid">
          <div className="proof-copy">
            <p className="section-index section-index-light">{t.ttg.number}</p>
            <p className="proof-type">{t.ttg.type}</p>
            <h2 id="ttg-heading">{t.ttg.heading}</h2>
            <p>{t.ttg.body}</p>
          </div>
          <TTGArtifact t={t.ttg} />
        </div>
      </section>

      <section className="case-story case-story-property" aria-labelledby="property-heading">
        <div className="editorial-shell case-story-grid">
          <PropertyArtifact t={t.property} />
          <div className="case-copy">
            <p className="proof-type">{t.property.type}</p>
            <h2 id="property-heading">{t.property.heading}</h2>
            <p>{t.property.body}</p>
            <Link href="/projects/alex-parker-property-ops">{t.property.link}<span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="case-story case-story-dispute" aria-labelledby="dispute-heading">
        <div className="editorial-shell case-story-grid case-story-grid-reverse">
          <DisputeArtifact t={t.dispute} />
          <div className="case-copy">
            <p className="proof-type">{t.dispute.type}</p>
            <h2 id="dispute-heading">{t.dispute.heading}</h2>
            <p>{t.dispute.body}</p>
            <Link href="/projects/dispute-defender">{t.dispute.link}<span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section id="about" className="operator-section" aria-labelledby="operator-heading">
        <div className="editorial-shell operator-grid">
          <div className="operator-image"><Image src="/duncs.jpg" alt={t.operator.alt} width={880} height={1168} unoptimized /></div>
          <div className="operator-copy">
            <p className="section-index">{t.operator.number}</p>
            <h2 id="operator-heading">{t.operator.heading}</h2>
            <p>{t.operator.body}</p>
            <Link href="/work-samples">{t.operator.link}<span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="investment-section" aria-labelledby="investment-heading">
        <div className="editorial-shell investment-grid">
          <p className="section-index section-index-light">{t.pricing.number}</p>
          <h2 id="investment-heading">{t.pricing.heading}</h2>
          <div><p>{t.pricing.body}</p><BookingConversionLink href={BOOKING_URL} target="_blank" rel="noopener noreferrer">{t.pricing.cta}<span aria-hidden="true">↗</span></BookingConversionLink></div>
        </div>
      </section>

      <section className="final-editorial-cta" aria-labelledby="final-heading">
        <div className="editorial-shell">
          <p className="section-index">{t.final.number}</p>
          <h2 id="final-heading">{t.final.heading}</h2>
          <p>{t.final.body}</p>
          <div className="final-links"><a href={`mailto:${t.final.email}`}>{t.final.email}</a><BookingConversionLink href={BOOKING_URL} target="_blank" rel="noopener noreferrer">{t.final.cta}<span aria-hidden="true">↗</span></BookingConversionLink></div>
        </div>
      </section>
    </>
  );
}
