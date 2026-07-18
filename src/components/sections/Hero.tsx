import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export default function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale() === "fr" ? "fr" : "en";
  const proof = locale === "fr"
    ? {
        label: "Preuves de production",
        title: "Des systèmes qui restent utiles après la démo.",
        items: [
          ["Produit en ligne", "The Lineup · données, modèles, paiements et résultats"],
          ["Système d’entreprise", "Automatisation de litiges à haut volume"],
          ["Livraisons client", "Opérations immobilières et publication en santé"],
        ],
        boundary: "L’automatisation prépare et organise. Une personne garde les décisions sensibles.",
      }
    : {
        label: "Production proof",
        title: "Systems that stay useful after the demo.",
        items: [
          ["Live product", "The Lineup · data, models, billing, and results"],
          ["Enterprise system", "High-volume dispute automation"],
          ["Client deliveries", "Property operations and healthcare publishing"],
        ],
        boundary: "Automation prepares and organizes. A person keeps the consequential decisions.",
      };

  return (
    <section className="relative overflow-hidden border-b border-border px-6 pb-20 pt-32 md:pb-28 md:pt-40">
      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.08fr_0.72fr] lg:items-end">
        <div>
          <p className="animate-fade-in-up font-mono text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            {t("subtitle")}
          </p>
          <h1 className="animate-fade-in-up delay-1 mt-5 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.035em] text-cream md:text-7xl">
            {t("heading")}
            <span className="block text-accent">{t("headingLine2")}</span>
          </h1>
          <p className="animate-fade-in-up delay-2 mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
            {t("description")}
          </p>
          <div className="animate-fade-in-up delay-3 mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button href="/ai-workflow-audit">{t("cta")}</Button>
            <a
              href="#projects"
              className="text-sm font-medium uppercase tracking-wide text-accent underline decoration-border underline-offset-4 transition-colors hover:text-accent-hover"
            >
              {t("ctaSecondary")}
            </a>
          </div>
        </div>

        <aside className="animate-fade-in-up delay-4 border-t-4 border-cream bg-white p-6 shadow-[0_18px_50px_rgba(26,26,46,0.06)] sm:p-8" aria-label={proof.label}>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{proof.label}</p>
          <h2 className="mt-4 font-display text-3xl leading-tight text-cream">{proof.title}</h2>
          <dl className="mt-7 divide-y divide-border border-y border-border">
            {proof.items.map(([term, detail]) => (
              <div className="py-4" key={term}>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">{term}</dt>
                <dd className="mt-1.5 text-sm leading-6 text-cream-muted">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-l-2 border-amber-400 pl-4 text-sm leading-6 text-cream-muted">{proof.boundary}</p>
        </aside>
      </div>
    </section>
  );
}
