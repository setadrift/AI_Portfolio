export type PortfolioLocale = "en" | "fr";

export type PortfolioVisual = "lineup" | "operations" | "disputes" | "publisher";

type Localized = {
  en: string;
  fr: string;
};

export interface PortfolioProject {
  slug: string;
  visual: PortfolioVisual;
  status: Localized;
  role: Localized;
  clientType: Localized;
  title: Localized;
  headline: Localized;
  summary: Localized;
  result: Localized;
  whatChanged: Localized;
  before: Localized[];
  after: Localized[];
  responsibilities: Localized[];
  proof: Localized[];
  trust: Localized;
  visualNote: Localized;
  tech: string[];
  external?: {
    label: Localized;
    href: string;
  }[];
}

const l = (en: string, fr: string): Localized => ({ en, fr });

export const FEATURED_PORTFOLIO: PortfolioProject[] = [
  {
    slug: "the-lineup",
    visual: "lineup",
    status: l("Live product", "Produit en ligne"),
    role: l("Founder, product owner, solo builder", "Fondateur, responsable produit et seul développeur"),
    clientType: l("Sports analytics", "Analytique sportive"),
    title: l("The Lineup", "The Lineup"),
    headline: l(
      "Models, live markets, subscriptions, and public results in one operating product.",
      "Modèles, marchés en direct, abonnements et résultats publics dans un seul produit.",
    ),
    summary: l(
      "I built and operate the full product: data ingestion, projection models, market comparison, user-facing decisions, billing, automated grading, and the systems that keep it running.",
      "J'ai construit et j'exploite le produit complet : ingestion de données, modèles de projection, comparaison de marchés, décisions utilisateurs, facturation, classement automatisé et systèmes d'exploitation.",
    ),
    result: l(
      "A public multi-sport product that has to earn trust every day, not a one-off model or demo.",
      "Un produit multisport public qui doit mériter la confiance chaque jour, pas un modèle ponctuel ni une démo.",
    ),
    whatChanged: l(
      "A collection of models and data feeds became a product where a customer can inspect a market, understand the projection context, act on it, and return later to see how it graded.",
      "Un ensemble de modèles et de flux de données est devenu un produit où le client peut inspecter un marché, comprendre la projection, agir et revenir voir le résultat.",
    ),
    before: [
      l("Sports data, model output, and sportsbook prices lived in separate systems.", "Les données sportives, sorties de modèles et cotes vivaient dans des systèmes séparés."),
      l("A prediction had no useful product loop without price context and a recorded result.", "Une prédiction n'avait pas de boucle produit utile sans contexte de prix ni résultat enregistré."),
      l("Billing, access, freshness, and settlement were operational work around the model.", "Facturation, accès, fraîcheur et règlement étaient du travail opérationnel autour du modèle."),
    ],
    after: [
      l("Live prices are normalized and compared against model context.", "Les prix en direct sont normalisés et comparés au contexte du modèle."),
      l("Customers see decisions through focused product surfaces on web and iOS.", "Les clients voient les décisions dans des interfaces ciblées sur le web et iOS."),
      l("Results are graded automatically so the product remains accountable.", "Les résultats sont classés automatiquement pour que le produit reste responsable."),
    ],
    responsibilities: [
      l("Projection and market data pipelines", "Pipelines de projections et de marchés"),
      l("FastAPI, Next.js, PostgreSQL, and Redis application stack", "Stack applicative FastAPI, Next.js, PostgreSQL et Redis"),
      l("Web and iOS product delivery", "Livraison web et iOS"),
      l("Subscriptions, analytics, monitoring, and operational tooling", "Abonnements, analytique, monitoring et outils opérationnels"),
    ],
    proof: [
      l("Public web product", "Produit web public"),
      l("Published iOS application", "Application iOS publiée"),
      l("Automated grading and public result history", "Classement automatisé et historique public"),
    ],
    trust: l(
      "Model output is not presented as truth without consequence. Prices, timestamps, grading, and result history create an inspectable loop around every decision.",
      "La sortie d'un modèle n'est pas présentée comme vérité sans conséquence. Prix, horodatages, classement et historique créent une boucle vérifiable autour de chaque décision.",
    ),
    visualNote: l(
      "Faithful reconstruction of the live product's accountability loop",
      "Reconstruction fidèle de la boucle de responsabilité du produit en ligne",
    ),
    tech: ["Python", "FastAPI", "Next.js", "PostgreSQL", "Redis", "LightGBM", "Stripe", "RevenueCat"],
    external: [
      { label: l("Open the live product", "Ouvrir le produit"), href: "https://www.thelineup.pro/" },
      { label: l("View on the App Store", "Voir sur l'App Store"), href: "https://apps.apple.com/app/the-lineup-pro/id6756733266" },
    ],
  },
  {
    slug: "the-lineup-ai-operations",
    visual: "operations",
    status: l("Production operations system", "Système opérationnel en production"),
    role: l("Founder, system designer, and operator", "Fondateur, concepteur du système et opérateur"),
    clientType: l("Governed AI operations", "Opérations d'IA gouvernées"),
    title: l("The Lineup AI Operations", "Opérations IA de The Lineup"),
    headline: l(
      "Four specialized AI workers monitor the business—but they cannot quietly change production.",
      "Quatre agents d'IA spécialisés surveillent l'entreprise—sans pouvoir modifier silencieusement la production.",
    ),
    summary: l(
      "I built an internal control plane that schedules recurring work across data, predictive models, user growth, and executive oversight—then records findings, proposed actions, approvals, and outcome evidence.",
      "J'ai construit un centre de contrôle interne qui planifie le travail récurrent sur les données, les modèles prédictifs, la croissance et la supervision—puis consigne les constats, actions proposées, approbations et preuves de résultat.",
    ),
    result: l(
      "Recurring AI work became a visible operating process with clear owners, blocked states, approval boundaries, and durable proof.",
      "Le travail récurrent de l'IA est devenu un processus opérationnel visible avec des responsables, des blocages, des limites d'approbation et des preuves durables.",
    ),
    whatChanged: l(
      "Instead of treating an agent run as proof of useful work, the control plane follows an inspectable sequence: request, finding, one selected action, approval when required, and evidence of what actually happened.",
      "Au lieu de traiter l'exécution d'un agent comme preuve de travail utile, le centre de contrôle suit une séquence vérifiable : demande, constat, une action sélectionnée, approbation au besoin et preuve du résultat réel.",
    ),
    before: [
      l("Recurring monitoring lived across scripts, dashboards, and operator memory.", "La surveillance récurrente était répartie entre scripts, tableaux de bord et mémoire de l'opérateur."),
      l("A completed agent run did not prove that an action was delivered or resolved.", "Une exécution terminée ne prouvait pas qu'une action avait été livrée ou résolue."),
      l("Risky writes needed a reliable stop before production systems changed.", "Les écritures risquées exigeaient un arrêt fiable avant toute modification en production."),
    ],
    after: [
      l("Four domain-specific operating lanes can run on schedules or explicit requests.", "Quatre fonctions opérationnelles spécialisées peuvent s'exécuter selon un horaire ou une demande explicite."),
      l("Material findings and actions move through a durable, visible lifecycle.", "Les constats et actions importants suivent un cycle de vie durable et visible."),
      l("Protected changes stop for approval, while delivery claims require verifiable evidence.", "Les changements protégés attendent une approbation et les livraisons exigent une preuve vérifiable."),
    ],
    responsibilities: [
      l("Control-plane architecture and durable action model", "Architecture du centre de contrôle et modèle d'action durable"),
      l("Data, model, growth, and executive operating loops", "Boucles opérationnelles de données, modèles, croissance et direction"),
      l("Approval gates, blocked states, and fail-closed behavior", "Portes d'approbation, états bloqués et arrêts sécurisés"),
      l("Operator dashboard, reliability checks, and automated tests", "Tableau de bord opérateur, vérifications de fiabilité et tests automatisés"),
    ],
    proof: [
      l("Four specialized operating lanes in one control plane", "Quatre fonctions spécialisées dans un seul centre de contrôle"),
      l("Scheduled and manual requests with durable run and action records", "Demandes planifiées et manuelles avec dossiers durables"),
      l("Approval and reliability checks expose incomplete or blocked work", "Les contrôles d'approbation et de fiabilité exposent le travail incomplet ou bloqué"),
    ],
    trust: l(
      "Runs are not presented as outcomes. The system separates monitoring, proposed action, completed work, and verified evidence. Consequential changes remain approval-gated.",
      "Les exécutions ne sont pas présentées comme des résultats. Le système distingue surveillance, action proposée, travail terminé et preuve vérifiée. Les changements importants restent soumis à approbation.",
    ),
    visualNote: l(
      "Faithful reconstruction of a private operations dashboard · no production data shown",
      "Reconstruction fidèle d'un tableau de bord privé · aucune donnée de production affichée",
    ),
    tech: ["Python", "Next.js", "PostgreSQL", "Supabase", "Automation orchestration", "Approval workflows", "Reliability gates"],
  },
  {
    slug: "dispute-defender",
    visual: "disputes",
    status: l("Production enterprise system", "Système d'entreprise en production"),
    role: l(
      "Data scientist and system builder while employed",
      "Scientifique des données et concepteur du système dans le cadre de mon emploi",
    ),
    clientType: l("Travel operations", "Opérations de voyage"),
    title: l("Dispute Defender", "Dispute Defender"),
    headline: l(
      "Turn a high-volume dispute queue into evidence-backed responses.",
      "Transformer une file de litiges à fort volume en réponses étayées par des preuves.",
    ),
    summary: l(
      "A production pipeline gathered booking and transaction evidence, classified dispute context, and assembled tailored response packages for an online travel business.",
      "Un pipeline de production rassemblait les preuves de réservation et de transaction, classait le contexte du litige et préparait des réponses adaptées pour une entreprise de voyage en ligne.",
    ),
    result: l(
      "Repetitive investigation became a repeatable operating system, allowing more disputes to receive specific evidence instead of a generic response.",
      "L'enquête répétitive est devenue un système reproductible, permettant à davantage de litiges de recevoir des preuves précises plutôt qu'une réponse générique.",
    ),
    whatChanged: l(
      "Instead of asking an operator to reconstruct every case from several systems, the pipeline prepared a traceable evidence package and left the reviewer with a focused decision.",
      "Au lieu de demander à un opérateur de reconstruire chaque dossier dans plusieurs systèmes, le pipeline préparait un dossier de preuves traçable et laissait au réviseur une décision ciblée.",
    ),
    before: [
      l("Operators searched booking and payment records case by case.", "Les opérateurs cherchaient les dossiers de réservation et de paiement au cas par cas."),
      l("Evidence quality depended on available time and individual judgment.", "La qualité des preuves dépendait du temps disponible et du jugement individuel."),
      l("High queue volume encouraged generic or incomplete responses.", "Le volume élevé encourageait des réponses génériques ou incomplètes."),
    ],
    after: [
      l("Relevant records are gathered into one case context.", "Les dossiers pertinents sont rassemblés dans un seul contexte."),
      l("The dispute reason drives the evidence and response structure.", "Le motif du litige détermine les preuves et la structure de réponse."),
      l("The final package remains connected to its underlying sources.", "Le dossier final reste lié à ses sources sous-jacentes."),
    ],
    responsibilities: [
      l("Evidence retrieval and data normalization", "Récupération et normalisation des preuves"),
      l("Case classification and response assembly", "Classification des dossiers et préparation des réponses"),
      l("Operational pipeline design", "Conception du pipeline opérationnel"),
      l("Production reliability and exception handling", "Fiabilité en production et traitement des exceptions"),
    ],
    proof: [
      l("Built for high-volume operational use", "Conçu pour une utilisation opérationnelle à fort volume"),
      l("Evidence remained traceable to source records", "Les preuves restaient traçables jusqu'aux dossiers sources"),
      l("Production enterprise deployment", "Déploiement d'entreprise en production"),
    ],
    trust: l(
      "The system organized evidence and prepared a defensible response; it did not manufacture facts. The public visual is representative because the original company and customer data are confidential.",
      "Le système organisait les preuves et préparait une réponse défendable; il n'inventait pas de faits. Le visuel public est représentatif puisque les données de l'entreprise et des clients sont confidentielles.",
    ),
    visualNote: l("Representative workflow · identifying data removed", "Workflow représentatif · données identifiantes retirées"),
    tech: ["Python", "Machine learning", "REST APIs", "Data pipelines"],
  },
  {
    slug: "trauma-therapy-group-publisher",
    visual: "publisher",
    status: l("Client delivery", "Livraison client"),
    role: l("Workflow designer and implementation consultant", "Concepteur de workflow et consultant en implémentation"),
    clientType: l("Healthcare content operations", "Opérations de contenu en santé"),
    title: l("Trauma Therapy Group Publisher", "Trauma Therapy Group Publisher"),
    headline: l(
      "Move a reviewed Google Doc into WordPress without rebuilding the article by hand.",
      "Passer d'un Google Doc révisé à WordPress sans reconstruire l'article à la main.",
    ),
    summary: l(
      "A private publishing workflow handles document cleanup, article structure, editable SEO fields, image preparation, and Elementor draft creation while keeping final publication human-controlled.",
      "Un workflow privé gère le nettoyage du document, la structure, les champs SEO modifiables, la préparation d'images et la création d'un brouillon Elementor tout en gardant la publication sous contrôle humain.",
    ),
    result: l(
      "The team received a repeatable path from approved source content to a review-ready WordPress draft.",
      "L'équipe a reçu un parcours reproductible du contenu source approuvé jusqu'au brouillon WordPress prêt à réviser.",
    ),
    whatChanged: l(
      "The process stopped treating every article as a fresh copy-and-paste exercise. Formatting, metadata, imagery, and draft assembly became one visible workflow with review before publication.",
      "Le processus a cessé de traiter chaque article comme un nouvel exercice de copier-coller. Formatage, métadonnées, images et assemblage du brouillon sont devenus un seul workflow visible avec révision avant publication.",
    ),
    before: [
      l("Approved copy still required manual HTML and WordPress cleanup.", "Le texte approuvé exigeait encore un nettoyage manuel HTML et WordPress."),
      l("SEO fields, imagery, and Elementor assembly were separate tasks.", "Les champs SEO, les images et l'assemblage Elementor étaient des tâches séparées."),
      l("Automation could not be allowed to publish healthcare content directly.", "L'automatisation ne pouvait pas publier directement du contenu de santé."),
    ],
    after: [
      l("The shared document becomes structured article content.", "Le document partagé devient un article structuré."),
      l("SEO and image choices remain editable before draft creation.", "Les choix SEO et d'image restent modifiables avant la création du brouillon."),
      l("WordPress receives a draft, never an automatic publication.", "WordPress reçoit un brouillon, jamais une publication automatique."),
    ],
    responsibilities: [
      l("Google Docs extraction and HTML cleanup", "Extraction Google Docs et nettoyage HTML"),
      l("Editable SEO and image review", "Révision modifiable du SEO et des images"),
      l("WordPress REST and Elementor draft assembly", "Assemblage du brouillon via WordPress REST et Elementor"),
      l("Human approval and safe publishing boundary", "Approbation humaine et limite de publication sécuritaire"),
    ],
    proof: [
      l("Completed client phase", "Phase client terminée"),
      l("End-to-end document-to-draft workflow", "Workflow complet du document au brouillon"),
      l("Human review retained before publication", "Révision humaine conservée avant publication"),
    ],
    trust: l(
      "The automation prepares and organizes the draft. It does not make the final clinical or publishing decision, and it does not auto-publish content.",
      "L'automatisation prépare et organise le brouillon. Elle ne prend pas la décision clinique ou éditoriale finale et ne publie rien automatiquement.",
    ),
    visualNote: l("Representative workflow · client content anonymized", "Workflow représentatif · contenu client anonymisé"),
    tech: ["Google Docs", "WordPress REST API", "Elementor", "Yoast SEO", "Image generation", "Next.js"],
    external: [
      { label: l("Visit the client website", "Visiter le site du client"), href: "https://traumatherapygroup.com/" },
    ],
  },
];

export function localize(value: Localized, locale: string) {
  return locale === "fr" ? value.fr : value.en;
}

export function getPortfolioProject(slug: string) {
  return FEATURED_PORTFOLIO.find((project) => project.slug === slug);
}

export function portfolioStatusClass(project: PortfolioProject) {
  if (project.visual === "lineup") return "bg-emerald-100 text-emerald-900";
  if (project.visual === "operations") return "bg-amber-100 text-amber-950";
  if (project.visual === "disputes") return "bg-slate-200 text-slate-800";
  return "bg-blue-100 text-blue-900";
}
