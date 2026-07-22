import { useLocale } from "next-intl";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    eyebrow: "One Workflow Sprint · AI and automation consulting",
    heading: "Turn one messy workflow into a working system in 10 business days.",
    body: "I help founders and operators replace one recurring manual process with a practical system their team can review, run, and improve.",
    cta: "Book a 20-minute fit call",
    secondary: "See what ships",
    note: "Most sprints: CAD $5,000–$9,000 · Fixed scope before work begins",
    proof: ["Working system", "Human review built in", "Documentation + handoff"],
    visual: {
      label: "Example workflow",
      live: "Review-first",
      incoming: "Messy intake",
      incomingDetail: "Email · PDF · voice note",
      structure: "Structured work",
      structureDetail: "Owner · status · next step",
      review: "Human review",
      reviewDetail: "1 exception held",
      handoff: "Completed handoff",
      handoffDetail: "Team notified · record updated",
      footer: "The routine work moves. Your team keeps the judgment.",
    },
  },
  fr: {
    eyebrow: "Sprint d’un workflow · Conseil en IA et automatisation",
    heading: "Transformez un workflow désordonné en système fonctionnel en 10 jours ouvrables.",
    body: "J’aide les fondateurs et responsables des opérations à remplacer un processus manuel récurrent par un système pratique que leur équipe peut réviser, utiliser et améliorer.",
    cta: "Réserver un appel de 20 minutes",
    secondary: "Voir ce qui est livré",
    note: "La plupart des sprints : 5 000–9 000 $ CA · Portée fixe avant le début",
    proof: ["Système fonctionnel", "Révision humaine intégrée", "Documentation et transfert"],
    visual: {
      label: "Exemple de workflow",
      live: "Avec révision",
      incoming: "Entrées désordonnées",
      incomingDetail: "Courriel · PDF · note vocale",
      structure: "Travail structuré",
      structureDetail: "Responsable · statut · suite",
      review: "Révision humaine",
      reviewDetail: "1 exception retenue",
      handoff: "Transfert complété",
      handoffDetail: "Équipe avisée · dossier à jour",
      footer: "Le travail routinier avance. Votre équipe garde le jugement.",
    },
  },
};

function WorkflowVisual({ t }: { t: (typeof copy)["en"]["visual"] }) {
  const steps = [
    { number: "01", title: t.incoming, detail: t.incomingDetail, state: "source" },
    { number: "02", title: t.structure, detail: t.structureDetail, state: "working" },
    { number: "03", title: t.review, detail: t.reviewDetail, state: "review" },
    { number: "04", title: t.handoff, detail: t.handoffDetail, state: "done" },
  ];

  return (
    <div className="workflow-visual" aria-label={`${t.label}: ${steps.map((step) => step.title).join(", ")}`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t.label}</p>
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          {t.live}
        </span>
      </div>
      <ol className="relative px-5 py-2">
        {steps.map((step, index) => (
          <li className={`workflow-step workflow-step-${index + 1}`} key={step.number}>
            <span className={`workflow-step-marker is-${step.state}`} aria-hidden="true">{step.number}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-slate-950">{step.title}</h2>
                {index === 2 ? <span className="bg-amber-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-900">Check</span> : null}
                {index === 3 ? <span className="bg-emerald-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-900">Done</span> : null}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-600">{t.footer}</p>
    </div>
  );
}

export default function Hero() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];

  return (
    <section className="relative overflow-hidden border-b border-border bg-[#f7f5f1] px-5 pb-14 pt-28 sm:px-6 md:pb-20 md:pt-36" aria-labelledby="hero-heading">
      <div className="absolute inset-y-0 right-0 hidden w-[37%] border-l border-slate-200 bg-[#efece5] lg:block" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent sm:text-xs">{t.eyebrow}</p>
          <h1 id="hero-heading" className="mt-5 max-w-3xl font-display text-[2.65rem] leading-[1.01] tracking-[-0.035em] text-cream sm:text-5xl md:text-6xl lg:text-[4.15rem]">
            {t.heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-cream-muted">{t.body}</p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <BookingConversionLink
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 sm:w-auto"
            >
              {t.cta}
            </BookingConversionLink>
            <a className="inline-flex min-h-12 items-center text-sm font-semibold text-cream underline decoration-slate-300 underline-offset-4 hover:text-accent" href="#services">
              {t.secondary}
            </a>
          </div>
          <p className="mt-4 text-sm leading-6 text-cream-dim">{t.note}</p>
          <ul className="mt-8 flex flex-col gap-3 border-t border-slate-300 pt-5 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {t.proof.map((item) => (
              <li className="flex items-center gap-2 text-xs font-semibold text-slate-700" key={item}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <WorkflowVisual t={t.visual} />
      </div>
    </section>
  );
}
