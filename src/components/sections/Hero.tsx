import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="grain relative overflow-hidden px-6 pb-24 pt-36 md:pb-32 md:pt-44">
      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="animate-fade-in-up mb-6 font-mono text-xs uppercase tracking-[0.3em] text-accent">
          {t("subtitle")}
        </p>
        <h1 className="animate-fade-in-up delay-1 mb-8 max-w-4xl font-display text-4xl leading-[1.1] tracking-tight text-cream md:text-6xl lg:text-7xl">
          {t("heading")}
          <br className="hidden md:block" />
          <span className="text-accent">{t("headingLine2")}</span>
        </h1>
        <p className="animate-fade-in-up delay-2 mb-10 max-w-2xl text-lg leading-relaxed text-cream-muted">
          {t("description")}
        </p>
        <div className="animate-fade-in-up delay-3 flex flex-col gap-4 sm:flex-row">
          <Button href="/#contact">{t("cta")}</Button>
          <Button href="/#projects" variant="secondary">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
    </section>
  );
}
