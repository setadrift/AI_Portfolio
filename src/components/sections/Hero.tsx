import { useLocale } from "next-intl";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import { BOOKING_URL } from "@/lib/constants";

const copy = {
  en: {
    eyebrow: "AI workflow consulting for founder-led businesses",
    heading: "Find the manual work worth fixing—and leave with a practical AI plan.",
    body: "I help founders and operators map repetitive work, identify useful AI or automation opportunities, and decide what to implement first.",
    cta: "Book a discovery call",
    note: "Fixed-scope diagnostic first. Implementation is scoped separately.",
    points: ["Your real workflow, mapped", "Time and cost impact, estimated", "A prioritized implementation plan"],
  },
  fr: {
    eyebrow: "Conseil en workflows IA pour entreprises dirigées par leur fondateur",
    heading: "Trouvez le travail manuel qui mérite d’être corrigé et repartez avec un plan IA pratique.",
    body: "J’aide les fondateurs et les responsables des opérations à cartographier le travail répétitif, repérer les bonnes occasions d’IA ou d’automatisation et décider quoi mettre en œuvre en premier.",
    cta: "Réserver un appel découverte",
    note: "Diagnostic à portée fixe d’abord. L’implémentation est définie séparément.",
    points: ["Votre vrai workflow, cartographié", "Impact sur le temps et les coûts, estimé", "Un plan d’implémentation priorisé"],
  },
};

export default function Hero() {
  const t = copy[useLocale() === "fr" ? "fr" : "en"];

  return (
    <section className="border-b border-border bg-background px-5 pb-14 pt-28 sm:px-6 md:pb-20 md:pt-36" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent sm:text-xs">
          {t.eyebrow}
        </p>
        <h1 id="hero-heading" className="mt-5 max-w-4xl font-display text-[2.65rem] leading-[1.02] tracking-[-0.03em] text-cream sm:text-5xl md:text-6xl lg:text-[4.5rem]">
          {t.heading}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-cream-muted">
          {t.body}
        </p>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <BookingConversionLink
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 sm:w-auto"
          >
            {t.cta}
          </BookingConversionLink>
          <p className="text-sm leading-6 text-cream-dim">{t.note}</p>
        </div>

        <ul className="mt-12 grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
          {t.points.map((point, index) => (
            <li className="flex items-center gap-3 border-b border-border py-4 text-sm font-medium text-cream last:border-b-0 sm:border-b-0 sm:px-5 sm:first:pl-0" key={point}>
              <span className="font-mono text-xs text-accent">0{index + 1}</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
