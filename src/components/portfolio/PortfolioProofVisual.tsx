import Image from "next/image";
import type { PortfolioVisual } from "@/lib/portfolio";

type VisualLocale = "en" | "fr";

const visualCopy = {
  en: {
    frame: "Operational proof", evidenceView: "Evidence view", currentProduct: "Current iOS product", live: "Live",
    case: "Case 02491", service: "Service provided", review: "Review", sources: ["Booking record", "Payment history", "Customer communication"],
    records: "records", package: "Evidence package", readyReview: "Ready for operator review", linked: "Sources linked", missing: "Missing evidence",
    none: "None detected", approval: "A person approves the final response. Source records remain attached to the case.",
    repairDesk: "Turn repair desk", fieldView: "Field view · 3 active items", shopping: "Shopping", walkthrough: "Walkthrough",
    room: "Room", work: "Work", status: "Status", due: "Due", propertyRows: [["Kitchen", "Replace faucet", "Materials ready", "Today"], ["Bedroom 2", "Patch + paint", "Contractor assigned", "Tue"], ["Exterior", "Gutter repair", "Needs review", "—"]],
    fieldNotes: "Field notes staged", promote: "Ready to promote", ownerReview: "Needs owner review",
    source: "Google Doc", approved: "Approved source", seoReview: "SEO + image", wordpress: "WordPress", draftOnly: "Draft only",
    articleDraft: "Article draft", articleTitle: "When anxiety does not feel temporary", draft: "Draft", formatting: "Formatting", ready: "Ready",
    seoFields: "SEO fields", needsApproval: "Needs approval", image: "Featured image", selected: "Selected", publication: "Publication remains a human action inside WordPress.",
  },
  fr: {
    frame: "Preuve opérationnelle", evidenceView: "Vue des preuves", currentProduct: "Produit iOS actuel", live: "En ligne",
    case: "Dossier 02491", service: "Service fourni", review: "Révision", sources: ["Dossier de réservation", "Historique de paiement", "Communication client"],
    records: "dossiers", package: "Dossier de preuves", readyReview: "Prêt pour révision", linked: "Sources liées", missing: "Preuves manquantes",
    none: "Aucune détectée", approval: "Une personne approuve la réponse finale. Les dossiers sources restent liés au cas.",
    repairDesk: "Centre de réparations", fieldView: "Vue terrain · 3 éléments actifs", shopping: "Achats", walkthrough: "Inspection",
    room: "Pièce", work: "Travail", status: "Statut", due: "Échéance", propertyRows: [["Cuisine", "Remplacer le robinet", "Matériaux prêts", "Aujourd'hui"], ["Chambre 2", "Réparer et peindre", "Entrepreneur assigné", "Mar."], ["Extérieur", "Réparer la gouttière", "À réviser", "—"]],
    fieldNotes: "Notes terrain en attente", promote: "Prêtes à confirmer", ownerReview: "Révision requise",
    source: "Google Doc", approved: "Source approuvée", seoReview: "SEO et image", wordpress: "WordPress", draftOnly: "Brouillon seulement",
    articleDraft: "Brouillon d'article", articleTitle: "Quand l'anxiété ne semble pas temporaire", draft: "Brouillon", formatting: "Formatage", ready: "Prêt",
    seoFields: "Champs SEO", needsApproval: "Approbation requise", image: "Image en vedette", selected: "Sélectionnée", publication: "La publication demeure une action humaine dans WordPress.",
  },
};

const lineupScreens = [
  {
    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4c/00/eb/4c00eb9e-7290-9d20-c066-4ad687cc4923/02-best-bets.png/600x1300bb.webp",
    alt: "The Lineup best bets screen",
  },
  {
    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c6/50/1b/c6501bde-dcb0-1cdf-219d-365559307de7/04-projections.png/600x1300bb.webp",
    alt: "The Lineup projections screen",
  },
  {
    src: "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/1b/fe/6f/1bfe6fdc-7530-4893-2137-0379c72cc5c7/01-results.png/600x1300bb.webp",
    alt: "The Lineup results screen",
  },
];

export default function PortfolioProofVisual({
  visual,
  compact = false,
  locale = "en",
}: {
  visual: PortfolioVisual;
  compact?: boolean;
  locale?: VisualLocale;
}) {
  if (visual === "lineup") {
    return <LineupVisual compact={compact} locale={locale} />;
  }

  if (visual === "disputes") {
    return <DisputesVisual compact={compact} locale={locale} />;
  }

  if (visual === "property") {
    return <PropertyVisual compact={compact} locale={locale} />;
  }

  return <PublisherVisual compact={compact} locale={locale} />;
}

function Frame({ children, compact, locale }: { children: React.ReactNode; compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];
  return (
    <div
      className={`overflow-hidden border border-slate-300 bg-slate-950 ${
        compact ? "min-h-[19rem]" : "min-h-[26rem]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>{copy.frame}</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {copy.evidenceView}
        </span>
      </div>
      {children}
    </div>
  );
}

function LineupVisual({ compact, locale }: { compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];
  return (
    <Frame compact={compact} locale={locale}>
      <div className={`relative overflow-hidden ${compact ? "h-[17rem]" : "h-[32rem]"}`}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 text-white">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">The Lineup</p>
            <p className="mt-1 text-sm font-semibold">{copy.currentProduct}</p>
          </div>
          <span className="border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            {copy.live}
          </span>
        </div>
        <div className={`absolute inset-x-0 flex justify-center gap-3 px-4 ${compact ? "top-16" : "top-20"}`}>
          {lineupScreens.map((screen, index) => (
            <div
              className={`relative overflow-hidden rounded-[1.25rem] border border-white/15 bg-black shadow-2xl ${
                compact ? "h-56 w-[6.45rem]" : "h-[27rem] w-[12.5rem]"
              } ${index === 1 ? "-translate-y-2" : "translate-y-3"}`}
              key={screen.src}
            >
              <Image
                alt={screen.alt}
                className="object-cover object-top"
                fill
                sizes={compact ? "110px" : "210px"}
                src={screen.src}
              />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function DisputesVisual({ compact, locale }: { compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];
  const sources = copy.sources;

  return (
    <Frame compact={compact} locale={locale}>
      <div className={`grid gap-4 p-4 text-slate-100 ${compact ? "" : "md:grid-cols-[0.82fr_1.18fr] md:p-6"}`}>
        <div className="border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.case}</p>
              <p className="mt-2 text-lg font-semibold">{copy.service}</p>
            </div>
            <span className="bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-amber-300">{copy.review}</span>
          </div>
          <div className="mt-5 space-y-2">
            {sources.map((source, index) => (
              <div className="flex items-center justify-between border-t border-white/10 py-2.5 text-xs" key={source}>
                <span className="text-slate-300">{source}</span>
                <span className="text-emerald-300">{index + 2} {copy.records}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-white/10 bg-white p-4 text-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.package}</p>
              <p className="mt-1 text-sm font-semibold">{copy.readyReview}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-4 space-y-3">
            <EvidenceLine width="w-full" />
            <EvidenceLine width="w-5/6" />
            <EvidenceLine width="w-11/12" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
            <div className="border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-400">{copy.linked}</p>
              <p className="mt-1 font-semibold">8 / 8</p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-3">
              <p className="text-slate-400">{copy.missing}</p>
              <p className="mt-1 font-semibold">{copy.none}</p>
            </div>
          </div>
          <div className="mt-4 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-950">
            {copy.approval}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function EvidenceLine({ width }: { width: string }) {
  return (
    <div>
      <div className={`h-2 bg-slate-200 ${width}`} />
      <div className="mt-1.5 h-1.5 w-2/3 bg-slate-100" />
    </div>
  );
}

function PropertyVisual({ compact, locale }: { compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];
  const rows = copy.propertyRows;

  return (
    <Frame compact={compact} locale={locale}>
      <div className={`p-4 text-slate-100 ${compact ? "" : "p-6"}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{copy.repairDesk}</p>
            <p className="mt-2 text-xl font-semibold">Cedar House</p>
            <p className="mt-1 text-xs text-slate-400">{copy.fieldView}</p>
          </div>
          <div className="flex gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <span className="border border-white/10 px-2.5 py-1.5 text-slate-300">{copy.shopping}</span>
            <span className="bg-white px-2.5 py-1.5 text-slate-950">{copy.walkthrough}</span>
          </div>
        </div>

        <div className="mt-5 overflow-hidden border border-white/10 bg-white text-slate-950">
          <div className="hidden grid-cols-[0.8fr_1.4fr_1.2fr_0.5fr] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:grid">
            <span>{copy.room}</span><span>{copy.work}</span><span>{copy.status}</span><span>{copy.due}</span>
          </div>
          {rows.map((row, index) => (
            <div className="grid gap-1 border-b border-slate-100 px-4 py-3 text-xs last:border-0 sm:grid-cols-[0.8fr_1.4fr_1.2fr_0.5fr] sm:items-center sm:gap-2" key={row[1]}>
              <span className="font-semibold">{row[0]}</span>
              <span className="text-slate-600">{row[1]}</span>
              <span className={index === 2 ? "text-amber-700" : "text-emerald-700"}>{row[2]}</span>
              <span className="text-slate-400">{row[3]}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SmallStatus label={copy.fieldNotes} value="4" />
          <SmallStatus label={copy.promote} value="2" />
          <SmallStatus label={copy.ownerReview} value="1" attention />
        </div>
      </div>
    </Frame>
  );
}

function SmallStatus({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${attention ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

function PublisherVisual({ compact, locale }: { compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];
  return (
    <Frame compact={compact} locale={locale}>
      <div className={`p-4 ${compact ? "" : "p-6"}`}>
        <div className="grid gap-3 sm:grid-cols-[0.85fr_auto_0.85fr_auto_1fr] sm:items-center">
          <PipelineStep number="01" label={copy.source} detail={copy.approved} />
          <Arrow />
          <PipelineStep number="02" label={copy.review} detail={copy.seoReview} />
          <Arrow />
          <PipelineStep number="03" label={copy.wordpress} detail={copy.draftOnly} active />
        </div>

        <div className={`mt-5 grid gap-4 ${compact ? "" : "md:grid-cols-[1.1fr_0.9fr]"}`}>
          <div className="border border-white/10 bg-white p-4 text-slate-950">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.articleDraft}</p>
                <p className="mt-1 text-sm font-semibold">{copy.articleTitle}</p>
              </div>
              <span className="bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase text-amber-800">{copy.draft}</span>
            </div>
            <div className="mt-4 space-y-3">
              <EvidenceLine width="w-11/12" />
              <EvidenceLine width="w-full" />
              <EvidenceLine width="w-4/5" />
            </div>
          </div>

          <div className="space-y-3">
            <ReviewRow label={copy.formatting} value={copy.ready} />
            <ReviewRow label={copy.seoFields} value={copy.needsApproval} attention />
            <ReviewRow label={copy.image} value={copy.selected} />
            <div className="border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[11px] leading-5 text-emerald-200">
              {copy.publication}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function PipelineStep({ number, label, detail, active = false }: { number: string; label: string; detail: string; active?: boolean }) {
  return (
    <div className={`border p-3 ${active ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]"}`}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{number}</p>
      <p className="mt-1 text-sm font-semibold text-white">{label}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{detail}</p>
    </div>
  );
}

function Arrow() {
  return <span className="hidden text-center text-slate-600 sm:block">→</span>;
}

function ReviewRow({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={attention ? "text-amber-300" : "text-emerald-300"}>{value}</span>
    </div>
  );
}
