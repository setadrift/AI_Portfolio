import type { PortfolioVisual } from "@/lib/portfolio";

type VisualLocale = "en" | "fr";

const visualCopy = {
  en: {
    frame: "Operational proof", evidenceView: "Evidence view", currentProduct: "Live decision product", live: "Live",
    decisionLoop: "One decision, full context", productSteps: [["01", "Live inputs", "Current market context"], ["02", "Model view", "Projection and confidence"], ["03", "Recorded result", "Automatically graded"]],
    accountability: "Accountability loop", accountabilityRows: [["Price", "Timestamped"], ["Model context", "Attached"], ["Final result", "Recorded"]],
    aiOperations: "AI operations control plane", operatingLanes: "Four operating lanes", selectedAction: "Selected action", actionTitle: "Freshness exception requires review",
    operationRows: [["Data and pricing", "Monitoring"], ["Models and forecasts", "Finding"], ["User growth", "Scheduled"], ["Executive oversight", "Needs approval"]],
    actionSteps: [["01", "Finding recorded"], ["02", "One action selected"], ["03", "Production change held"]], approvalRequired: "Human approval required",
    case: "Case 02491", service: "Service provided", review: "Review", sources: ["Booking record", "Payment history", "Customer communication"],
    records: "records", package: "Evidence package", readyReview: "Ready for operator review", linked: "Sources linked", missing: "Missing evidence",
    none: "None detected", approval: "A person approves the final response. Source records remain attached to the case.",
    source: "Google Doc", approved: "Approved source", seoReview: "SEO + image", wordpress: "WordPress", draftOnly: "Draft only",
    articleDraft: "Article draft", articleTitle: "When anxiety does not feel temporary", draft: "Draft", formatting: "Formatting", ready: "Ready",
    seoFields: "SEO fields", needsApproval: "Needs approval", image: "Featured image", selected: "Selected", publication: "Publication remains a human action inside WordPress.",
  },
  fr: {
    frame: "Preuve opérationnelle", evidenceView: "Vue des preuves", currentProduct: "Produit décisionnel en ligne", live: "En ligne",
    decisionLoop: "Une décision, tout le contexte", productSteps: [["01", "Données en direct", "Contexte actuel du marché"], ["02", "Vue du modèle", "Projection et confiance"], ["03", "Résultat consigné", "Classé automatiquement"]],
    accountability: "Boucle de responsabilité", accountabilityRows: [["Prix", "Horodaté"], ["Contexte du modèle", "Joint"], ["Résultat final", "Consigné"]],
    aiOperations: "Centre de contrôle des opérations IA", operatingLanes: "Quatre fonctions opérationnelles", selectedAction: "Action sélectionnée", actionTitle: "Une exception de fraîcheur exige une révision",
    operationRows: [["Données et prix", "Surveillance"], ["Modèles et prévisions", "Constat"], ["Croissance", "Planifié"], ["Supervision", "Approbation requise"]],
    actionSteps: [["01", "Constat consigné"], ["02", "Une action sélectionnée"], ["03", "Changement retenu"]], approvalRequired: "Approbation humaine requise",
    case: "Dossier 02491", service: "Service fourni", review: "Révision", sources: ["Dossier de réservation", "Historique de paiement", "Communication client"],
    records: "dossiers", package: "Dossier de preuves", readyReview: "Prêt pour révision", linked: "Sources liées", missing: "Preuves manquantes",
    none: "Aucune détectée", approval: "Une personne approuve la réponse finale. Les dossiers sources restent liés au cas.",
    source: "Google Doc", approved: "Source approuvée", seoReview: "SEO et image", wordpress: "WordPress", draftOnly: "Brouillon seulement",
    articleDraft: "Brouillon d'article", articleTitle: "Quand l'anxiété ne semble pas temporaire", draft: "Brouillon", formatting: "Formatage", ready: "Prêt",
    seoFields: "Champs SEO", needsApproval: "Approbation requise", image: "Image en vedette", selected: "Sélectionnée", publication: "La publication demeure une action humaine dans WordPress.",
  },
};

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

  if (visual === "operations") {
    return <OperationsVisual compact={compact} locale={locale} />;
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
      <div className={`p-4 text-white ${compact ? "" : "p-6"}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">The Lineup</p>
            <p className="mt-1 text-sm font-semibold">{copy.currentProduct}</p>
          </div>
          <span className="border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
            {copy.live}
          </span>
        </div>

        <div className={`mt-4 grid gap-px overflow-hidden border border-white/10 bg-white/10 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
          {copy.productSteps.map(([number, label, detail]) => (
            <div className="bg-slate-950 p-3 sm:p-4" key={number}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">{number}</p>
              <p className="mt-2 text-xs font-semibold sm:text-sm">{label}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>

        <div className={`mt-4 grid gap-4 ${compact ? "grid-cols-[1.15fr_0.85fr]" : "md:grid-cols-[1.2fr_0.8fr]"}`}>
          <div className="border border-white/10 bg-white p-4 text-slate-950">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.decisionLoop}</p>
            <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4 border-y border-slate-200 py-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-950 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                ML
              </div>
              <div>
                <div className="h-2 w-full bg-slate-200" />
                <div className="mt-2 h-2 w-3/4 bg-slate-100" />
              </div>
            </div>
            {!compact ? (
              <p className="mt-4 border-l-2 border-emerald-500 pl-3 text-[11px] leading-5 text-slate-600">
                {locale === "fr"
                  ? "Le contexte reste lié à la décision jusqu'au résultat final."
                  : "The context stays attached to the decision through the final result."}
              </p>
            ) : null}
          </div>

          <div className="border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.accountability}</p>
            <div className="mt-3">
              {copy.accountabilityRows.map(([label, value]) => (
                <div className="flex items-center justify-between border-t border-white/10 py-2.5 text-[10px] sm:text-xs" key={label}>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-emerald-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
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

function OperationsVisual({ compact, locale }: { compact: boolean; locale: VisualLocale }) {
  const copy = visualCopy[locale];

  return (
    <Frame compact={compact} locale={locale}>
      <div className={`p-4 text-slate-100 ${compact ? "" : "p-6"}`}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">The Lineup</p>
            <p className="mt-2 text-lg font-semibold sm:text-xl">{copy.aiOperations}</p>
          </div>
          <span className="border border-white/10 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            {copy.operatingLanes}
          </span>
        </div>

        <div className={`mt-4 grid gap-4 ${compact ? "grid-cols-[0.9fr_1.1fr]" : "md:grid-cols-[0.82fr_1.18fr]"}`}>
          <div className="border border-white/10 bg-white/[0.04]">
            {copy.operationRows.map(([label, status], index) => (
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 last:border-0" key={label}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${index === 1 || index === 3 ? "bg-amber-300" : index === 2 ? "bg-blue-300" : "bg-emerald-300"}`} />
                  <span className="truncate text-[10px] font-semibold sm:text-xs">{label}</span>
                </div>
                <span className={`hidden text-[9px] uppercase tracking-[0.08em] sm:block ${index === 1 || index === 3 ? "text-amber-300" : "text-slate-400"}`}>{status}</span>
              </div>
            ))}
          </div>

          <div className="border border-white/10 bg-white p-4 text-slate-950">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{copy.selectedAction}</p>
            <p className="mt-2 text-sm font-semibold leading-5">{copy.actionTitle}</p>
            <div className="mt-4">
              {copy.actionSteps.map(([number, label]) => (
                <div className="grid grid-cols-[2rem_1fr] gap-2 border-t border-slate-200 py-2 text-[10px]" key={number}>
                  <span className="font-semibold text-slate-400">{number}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-950">
              {copy.approvalRequired}
            </div>
          </div>
        </div>
      </div>
    </Frame>
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
