import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    offer: {
      eyebrow: "What ships",
      heading: "A bounded build, not an open-ended AI engagement.",
      intro: "We choose one recurring workflow with a visible finish line, then build the smallest reliable system that can carry it.",
      deliverables: [
        ["Current workflow mapped", "Inputs, owners, handoffs, exceptions, and the places work stalls."],
        ["Working system delivered", "A practical pilot or bounded production workflow connected to the tools that matter."],
        ["Review points designed in", "Uncertain or consequential decisions stay with the right person."],
        ["Team handoff included", "Documentation, walkthrough, and 30 days of defect correction."],
      ],
      boundaryLabel: "One clear boundary",
      boundary: "One workflow, one defined outcome, 10 business days. Company-wide strategy, unlimited integrations, and additional workflows are scoped separately.",
    },
    method: {
      eyebrow: "The 10-day sprint",
      heading: "From the work as it happens to a system your team can run.",
      intro: "The build stays short because the scope stays honest. You see the system early, review the risky parts, and finish with something usable.",
      phases: [
        ["Days 1–2", "Map and lock scope", "Trace the real workflow, agree on the finish line, and identify what must remain human."],
        ["Days 3–7", "Build the working path", "Connect the essential tools, structure the routine work, and handle expected exceptions."],
        ["Days 8–9", "Review with your team", "Test realistic cases, correct the gaps, and make ownership visible."],
        ["Day 10", "Handoff and run", "Deliver documentation, walkthrough the system, and agree on what happens next."],
      ],
      reviewLabel: "Built for operational trust",
      review: ["No automatic action where judgment is required", "Exceptions have an owner and a next step", "The system is documented before handoff"],
    },
    proof: {
      eyebrow: "Relevant proof",
      heading: "Systems built around real handoffs, reviews, and source-of-truth constraints.",
      intro: "No invented savings claims. The proof is what was built, how the operating risk was handled, and what the client can now review or run.",
      result: "What changed",
      trust: "Why it is trustworthy",
      open: "Open case study",
      primary: {
        type: "Healthcare operations · Private client delivery",
        title: "A leadership dashboard built around the decisions the owner makes each week",
        body: "The TTG dashboard turns a controlled reporting workbook into a clear view of practice performance, clinical capacity, financial controls, source freshness, and the items that need owner attention.",
        trust: "Every view exposes its reporting period, source cutoffs, data lineage, and unresolved warnings. The dashboard supports decisions without hiding gaps in the underlying data.",
      },
      secondary: [
        {
          type: "Property operations · Client delivery",
          title: "Field work becomes a review queue—not a risky Airtable update",
          body: "Turn-repair notes, receipts, and contractor handoffs are staged in a phone-friendly workflow before promotion to the live record.",
          trust: "Uncertain extraction and incomplete work stay visible for owner review.",
          link: "/projects/alex-parker-property-ops",
          visual: "property",
        },
        {
          type: "Travel operations · Confidential enterprise work",
          title: "Evidence assembled around each dispute instead of chased by hand",
          body: "A production pipeline connected booking, payment, and communication records into tailored evidence packages.",
          trust: "Public details are intentionally limited; the workflow reconstruction separates source evidence from final review.",
          link: "/projects/dispute-defender",
          visual: "dispute",
        },
        {
          type: "Sports analytics · Founder-operated product",
          title: "A live paid product with data, decisions, billing, and settlement in one loop",
          body: "The Lineup combines multi-sport data pipelines, projections, market tools, subscriptions, and automated result settlement.",
          trust: "The public product is operating today; live availability is evidence of operation, not a claim of profitability.",
          link: "/projects/the-lineup",
          visual: "lineup",
        },
      ],
      more: "Review the full proof dossier",
      aboutLabel: "Founder-led, personally delivered",
      imageAlt: "Duncan Anderson, AI workflow consultant",
      about: "I’m Duncan Anderson—a data scientist, product builder, and operator. I spent years building data and automation systems inside a travel business, and I now build and operate The Lineup as a live paid product. I map, build, test, and hand off every consulting sprint myself.",
    },
    pricing: {
      eyebrow: "Straightforward pricing",
      heading: "Most One Workflow Sprints cost CAD $5,000–$9,000.",
      body: "After a free 20-minute fit call, I confirm the workflow, the finish line, and a fixed price before work begins. A typical sprint plans around CAD $7,500.",
      factorsLabel: "What moves the price",
      factors: ["Number of systems involved", "Custom logic and exception paths", "Data, security, or compliance constraints", "Review, monitoring, or interface requirements"],
      includedLabel: "Included in the sprint",
      included: ["Fixed scope and delivery plan", "Working pilot or bounded production system", "Documentation and team walkthrough", "30 days of defect correction"],
      terms: "Standard terms: 50% to begin and 50% on delivery. Third-party software and usage costs are separate. Work beyond the sprint boundary is quoted as a separate CAD $10,000–$15,000+ engagement.",
    },
    final: {
      eyebrow: "Start with the workflow",
      heading: "Bring the recurring process your team is tired of holding together by hand.",
      body: "In 20 minutes, we can decide whether it has a clear enough finish line for a One Workflow Sprint. If it does, I’ll follow up with a fixed scope and price.",
      cta: "Book the fit call",
      note: "Free · 20 minutes · No company-wide AI pitch",
      fit: "Best fit: frequent work, recognizable inputs, a repeatable decision path, and a person who can review the result.",
    },
  },
  fr: {
    offer: {
      eyebrow: "Ce qui est livré",
      heading: "Une construction bien délimitée, pas un mandat IA sans fin.",
      intro: "Nous choisissons un workflow récurrent avec une ligne d’arrivée visible, puis construisons le plus petit système fiable capable de le prendre en charge.",
      deliverables: [
        ["Workflow actuel cartographié", "Entrées, responsables, transferts, exceptions et endroits où le travail bloque."],
        ["Système fonctionnel livré", "Un pilote pratique ou un workflow de production limité, relié aux outils essentiels."],
        ["Points de révision intégrés", "Les décisions incertaines ou importantes restent entre les bonnes mains."],
        ["Transfert à l’équipe inclus", "Documentation, walkthrough et 30 jours de correction de défauts."],
      ],
      boundaryLabel: "Une limite claire",
      boundary: "Un workflow, un résultat défini, 10 jours ouvrables. La stratégie globale, les intégrations illimitées et les workflows additionnels sont chiffrés séparément.",
    },
    method: {
      eyebrow: "Le sprint de 10 jours",
      heading: "Du travail tel qu’il se fait à un système que votre équipe peut utiliser.",
      intro: "La livraison reste courte parce que la portée reste honnête. Vous voyez le système tôt, révisez les éléments risqués et terminez avec quelque chose d’utilisable.",
      phases: [
        ["Jours 1–2", "Cartographier et fixer la portée", "Tracer le vrai workflow, convenir de la ligne d’arrivée et déterminer ce qui doit rester humain."],
        ["Jours 3–7", "Construire le parcours fonctionnel", "Relier les outils essentiels, structurer le travail routinier et gérer les exceptions prévues."],
        ["Jours 8–9", "Réviser avec l’équipe", "Tester des cas réalistes, corriger les écarts et rendre la responsabilité visible."],
        ["Jour 10", "Transférer et exécuter", "Livrer la documentation, présenter le système et convenir de la suite."],
      ],
      reviewLabel: "Conçu pour la confiance opérationnelle",
      review: ["Aucune action automatique lorsque le jugement est requis", "Chaque exception a un responsable et une prochaine étape", "Le système est documenté avant le transfert"],
    },
    proof: {
      eyebrow: "Preuves pertinentes",
      heading: "Des systèmes construits autour de vrais transferts, révisions et sources de vérité.",
      intro: "Aucune économie inventée. La preuve est ce qui a été construit, la façon dont le risque opérationnel est géré et ce que le client peut maintenant réviser ou utiliser.",
      result: "Ce qui a changé",
      trust: "Pourquoi c’est fiable",
      open: "Ouvrir l’étude de cas",
      primary: {
        type: "Opérations en santé · Livraison client privée",
        title: "Un tableau de bord de direction construit autour des décisions hebdomadaires de la propriétaire",
        body: "Le tableau de bord TTG transforme un workbook contrôlé en vue claire de la performance, de la capacité clinique, des contrôles financiers, de la fraîcheur des sources et des éléments qui exigent l’attention de la propriétaire.",
        trust: "Chaque vue expose sa période, les dates limites des sources, la lignée des données et les avertissements ouverts. Le tableau soutient les décisions sans cacher les lacunes des données.",
      },
      secondary: [
        { type: "Opérations immobilières · Livraison client", title: "Le travail terrain devient une file de révision, pas une mise à jour Airtable risquée", body: "Les notes, reçus et transferts aux entrepreneurs sont préparés dans un workflow mobile avant d’atteindre le dossier réel.", trust: "L’extraction incertaine et le travail incomplet restent visibles pour la révision du propriétaire.", link: "/projects/alex-parker-property-ops", visual: "property" },
        { type: "Opérations voyage · Travail d’entreprise confidentiel", title: "Les preuves sont assemblées autour de chaque litige au lieu d’être cherchées à la main", body: "Un pipeline de production reliait les dossiers de réservation, paiements et communications dans des ensembles de preuves adaptés.", trust: "Les détails publics sont volontairement limités; la reconstruction sépare les preuves sources de la révision finale.", link: "/projects/dispute-defender", visual: "dispute" },
        { type: "Analytique sportive · Produit exploité par le fondateur", title: "Un produit payant en ligne réunit données, décisions, facturation et règlement", body: "The Lineup combine pipelines multisports, projections, outils de marché, abonnements et règlement automatisé des résultats.", trust: "Le produit public est en fonction; sa disponibilité prouve l’opération, pas la rentabilité.", link: "/projects/the-lineup", visual: "lineup" },
      ],
      more: "Voir le dossier de preuves complet",
      aboutLabel: "Dirigé et livré personnellement",
      imageAlt: "Duncan Anderson, consultant en workflows IA",
      about: "Je suis Duncan Anderson—scientifique des données, créateur de produits et opérateur. J’ai bâti des systèmes de données et d’automatisation dans une entreprise de voyage, et j’exploite maintenant The Lineup comme produit payant en ligne. Je cartographie, construis, teste et transfère moi-même chaque sprint.",
    },
    pricing: {
      eyebrow: "Tarification simple",
      heading: "La plupart des sprints coûtent 5 000–9 000 $ CA.",
      body: "Après un appel de 20 minutes gratuit, je confirme le workflow, la ligne d’arrivée et un prix fixe avant le début. Un sprint typique est planifié autour de 7 500 $ CA.",
      factorsLabel: "Ce qui influence le prix",
      factors: ["Nombre de systèmes concernés", "Logique personnalisée et chemins d’exception", "Contraintes de données, sécurité ou conformité", "Besoins de révision, suivi ou interface"],
      includedLabel: "Inclus dans le sprint",
      included: ["Portée fixe et plan de livraison", "Pilote fonctionnel ou système de production limité", "Documentation et walkthrough d’équipe", "30 jours de correction de défauts"],
      terms: "Modalités standard : 50 % au départ et 50 % à la livraison. Les logiciels et frais d’utilisation sont séparés. Le travail hors sprint devient un mandat distinct de 10 000–15 000 $ CA ou plus.",
    },
    final: {
      eyebrow: "Commencez par le workflow",
      heading: "Apportez le processus récurrent que votre équipe ne veut plus tenir ensemble à la main.",
      body: "En 20 minutes, nous pouvons décider si sa ligne d’arrivée est assez claire pour un sprint. Si oui, je vous envoie une portée et un prix fixes.",
      cta: "Réserver l’appel",
      note: "Gratuit · 20 minutes · Aucun pitch IA global",
      fit: "Meilleur fit : travail fréquent, entrées reconnaissables, décisions répétables et une personne capable de réviser le résultat.",
    },
  },
};

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.22em] ${dark ? "text-blue-300" : "text-accent"}`}>{children}</p>;
}

function PrimaryProofVisual({ locale }: { locale: "en" | "fr" }) {
  const labels = locale === "fr"
    ? ["Performance", "Capacité clinique", "Contrôles financiers", "Index des sources"]
    : ["Practice performance", "Clinical capacity", "Financial controls", "Source index"];

  return (
    <div className="border border-slate-300 bg-slate-950 p-4 text-white sm:p-6" aria-label={labels.join(", ")}>
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">TTG leadership dashboard</p>
          <p className="mt-1 text-sm font-semibold">Weekly owner review</p>
        </div>
        <span className="bg-amber-400/10 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300">2 items to review</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {labels.map((label, index) => (
          <div className={`border p-3 ${index === 3 ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]"}`} key={label}>
            <p className="font-mono text-[9px] text-slate-500">0{index + 1}</p>
            <p className="mt-5 text-xs font-semibold leading-5">{label}</p>
            <div className="mt-3 h-1 bg-white/10"><span className={`block h-full ${index === 3 ? "w-full bg-emerald-400" : index === 1 ? "w-3/5 bg-blue-400" : "w-4/5 bg-blue-400"}`} /></div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="border-l-2 border-amber-400 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-300">
          {locale === "fr" ? "Période, dates limites des sources et avertissements visibles avant chaque décision." : "Reporting period, source cutoffs, and open warnings stay visible before each decision."}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Source-aware</span>
      </div>
    </div>
  );
}

function ProofMiniVisual({ type }: { type: string }) {
  if (type === "property") {
    return (
      <div className="proof-mini bg-[#eef2ee] text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-300 px-4 py-3"><span>Cedar House · Turn desk</span><span className="text-amber-800">1 review</span></div>
        {["Kitchen · Materials ready", "Bedroom 2 · Contractor assigned", "Exterior · Needs owner"].map((row, index) => <div className="flex justify-between border-b border-slate-200 px-4 py-3 last:border-0" key={row}><span>{row}</span><span className={index === 2 ? "text-amber-700" : "text-emerald-700"}>{index === 2 ? "Hold" : "Ready"}</span></div>)}
      </div>
    );
  }
  if (type === "dispute") {
    return (
      <div className="proof-mini bg-slate-950 text-slate-200">
        <div className="border-b border-white/10 px-4 py-3 text-slate-400">Case 02491 · Evidence package</div>
        <div className="grid grid-cols-3 gap-2 p-4 text-center"><span className="border border-white/10 p-3">Booking<br /><b>3</b></span><span className="border border-white/10 p-3">Payment<br /><b>2</b></span><span className="border border-white/10 p-3">Messages<br /><b>3</b></span></div>
        <p className="mx-4 mb-4 border-l-2 border-amber-400 pl-3 text-slate-400">Final response held for review</p>
      </div>
    );
  }
  return (
    <div className="proof-mini bg-[#10141f] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span>The Lineup · Operations</span><span className="text-emerald-300">Live</span></div>
      <div className="grid grid-cols-3 gap-px bg-white/10"><span className="bg-[#10141f] p-4">Data<br /><b>Freshness</b></span><span className="bg-[#10141f] p-4">Markets<br /><b>EV + odds</b></span><span className="bg-[#10141f] p-4">Results<br /><b>Settled</b></span></div>
      <p className="px-4 py-3 text-slate-400">Ingestion → decision surface → settlement</p>
    </div>
  );
}

export default function LandingSections() {
  const locale = useLocale() === "fr" ? "fr" : "en";
  const t = copy[locale];

  return (
    <>
      <section id="services" className="scroll-mt-20 bg-white px-5 py-14 sm:px-6 md:py-20" aria-labelledby="offer-heading">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr] md:gap-14">
            <div><Eyebrow>{t.offer.eyebrow}</Eyebrow><h2 id="offer-heading" className="mt-4 max-w-xl font-display text-3xl leading-tight text-cream sm:text-4xl md:text-5xl">{t.offer.heading}</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-cream-muted md:pt-7">{t.offer.intro}</p>
          </div>
          <div className="mt-10 border-y border-border">
            {t.offer.deliverables.map(([title, body], index) => (
              <article className="grid gap-2 border-b border-border py-5 last:border-0 sm:grid-cols-[3rem_15rem_1fr] sm:items-start sm:gap-5" key={title}>
                <span className="font-mono text-xs text-accent">0{index + 1}</span><h3 className="font-semibold text-cream">{title}</h3><p className="text-sm leading-6 text-cream-muted">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-3 border-l-2 border-accent bg-accent-subtle p-5 sm:grid-cols-[12rem_1fr] sm:gap-6"><p className="font-semibold text-cream">{t.offer.boundaryLabel}</p><p className="text-sm leading-6 text-cream-muted">{t.offer.boundary}</p></div>
        </div>
      </section>

      <section id="method" className="scroll-mt-16 bg-cream px-5 py-14 text-white sm:px-6 md:py-20" aria-labelledby="method-heading">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.72fr] lg:gap-16">
          <div>
            <Eyebrow dark>{t.method.eyebrow}</Eyebrow>
            <h2 id="method-heading" className="mt-4 max-w-3xl font-display text-3xl leading-tight sm:text-4xl md:text-5xl">{t.method.heading}</h2>
            <p className="mt-5 max-w-2xl leading-7 text-white/65">{t.method.intro}</p>
            <ol className="mt-9 border-y border-white/15">
              {t.method.phases.map(([days, title, body]) => <li className="grid gap-2 border-b border-white/15 py-5 last:border-0 sm:grid-cols-[6rem_12rem_1fr] sm:gap-5" key={days}><span className="font-mono text-xs text-blue-300">{days}</span><h3 className="font-semibold text-white">{title}</h3><p className="text-sm leading-6 text-white/60">{body}</p></li>)}
            </ol>
          </div>
          <aside className="self-end border-t-2 border-emerald-400 bg-white/[0.06] p-6" aria-label={t.method.reviewLabel}>
            <h3 className="font-display text-2xl">{t.method.reviewLabel}</h3>
            <ul className="mt-5 space-y-4">{t.method.review.map((item) => <li className="flex gap-3 text-sm leading-6 text-white/80" key={item}><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />{item}</li>)}</ul>
          </aside>
        </div>
      </section>

      <section id="projects" className="scroll-mt-16 bg-[#f7f5f1] px-5 py-14 sm:px-6 md:py-20" aria-labelledby="proof-heading">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-[1fr_0.72fr] md:items-end md:gap-12"><div><Eyebrow>{t.proof.eyebrow}</Eyebrow><h2 id="proof-heading" className="mt-4 font-display text-3xl leading-tight text-cream sm:text-4xl md:text-5xl">{t.proof.heading}</h2></div><p className="text-sm leading-6 text-cream-muted">{t.proof.intro}</p></div>
          <article className="mt-10 grid gap-7 border-y border-slate-300 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10">
            <PrimaryProofVisual locale={locale} />
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t.proof.primary.type}</p><h3 className="mt-3 font-display text-3xl leading-tight text-cream">{t.proof.primary.title}</h3><p className="mt-5 text-sm leading-6 text-cream-muted">{t.proof.primary.body}</p><p className="mt-5 border-l-2 border-emerald-600 pl-4 text-sm leading-6 text-cream"><b>{t.proof.trust}:</b> {t.proof.primary.trust}</p></div>
          </article>
          <div className="divide-y divide-slate-300">
            {t.proof.secondary.map((project, index) => <article className="grid gap-6 py-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-10" key={project.title}><div className={index % 2 ? "lg:order-2" : ""}><ProofMiniVisual type={project.visual} /></div><div className={index % 2 ? "lg:order-1" : ""}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{project.type}</p><h3 className="mt-3 font-display text-2xl leading-tight text-cream sm:text-3xl">{project.title}</h3><p className="mt-4 text-sm leading-6 text-cream-muted">{project.body}</p><p className="mt-4 text-sm leading-6 text-cream"><b>{t.proof.trust}:</b> {project.trust}</p><Link href={project.link} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-slate-300 underline-offset-4 hover:text-accent-hover">{t.proof.open}</Link></div></article>)}
          </div>
          <Link href="/work-samples" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-slate-300 underline-offset-4 hover:text-accent-hover">{t.proof.more}</Link>
          <div id="about" className="scroll-mt-20 mt-12 border-t border-slate-300 pt-9"><div className="grid items-center gap-7 md:grid-cols-[10rem_1fr] md:gap-10"><Image src="/duncs.jpg" alt={t.proof.imageAlt} width={880} height={1168} unoptimized className="aspect-[3/4] w-40 justify-self-center object-cover object-top md:justify-self-start" /><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-cream-dim">{t.proof.aboutLabel}</p><p className="mt-4 max-w-3xl text-base leading-7 text-cream-muted">{t.proof.about}</p></div></div></div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-6 md:py-20" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 border-y border-slate-300 py-9 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
            <div><Eyebrow>{t.pricing.eyebrow}</Eyebrow><h2 id="pricing-heading" className="mt-4 max-w-3xl font-display text-3xl leading-tight text-cream sm:text-4xl md:text-5xl">{t.pricing.heading}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-cream-muted">{t.pricing.body}</p></div>
            <div className="grid gap-7 sm:grid-cols-2"><div><h3 className="text-sm font-semibold text-cream">{t.pricing.factorsLabel}</h3><ul className="mt-4 space-y-3">{t.pricing.factors.map(item => <li className="flex gap-3 text-sm leading-6 text-cream-muted" key={item}><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" />{item}</li>)}</ul></div><div><h3 className="text-sm font-semibold text-cream">{t.pricing.includedLabel}</h3><ul className="mt-4 space-y-3">{t.pricing.included.map(item => <li className="flex gap-3 text-sm leading-6 text-cream-muted" key={item}><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{item}</li>)}</ul></div></div>
          </div>
          <p className="mt-5 max-w-4xl text-xs leading-5 text-cream-dim">{t.pricing.terms}</p>
        </div>
      </section>

      <section id="fit-call" className="bg-[#e9eef9] px-5 py-14 sm:px-6 md:py-20" aria-labelledby="final-cta-heading">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-14">
          <div><Eyebrow>{t.final.eyebrow}</Eyebrow><h2 id="final-cta-heading" className="mt-4 max-w-4xl font-display text-3xl leading-tight text-cream sm:text-4xl md:text-5xl">{t.final.heading}</h2><p className="mt-5 max-w-2xl text-base leading-7 text-cream-muted">{t.final.body}</p><p className="mt-5 max-w-2xl border-l-2 border-accent pl-4 text-sm leading-6 text-cream">{t.final.fit}</p></div>
          <div className="lg:text-right"><BookingConversionLink href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 sm:w-auto">{t.final.cta}</BookingConversionLink><p className="mt-3 text-xs text-cream-dim">{t.final.note}</p></div>
        </div>
      </section>
    </>
  );
}
