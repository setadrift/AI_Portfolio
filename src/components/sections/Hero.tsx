import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export default function Hero() {
  const t = useTranslations("hero");
  const cardInputs = t.raw("cardInputs") as string[];
  const cardOutputs = t.raw("cardOutputs") as string[];

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pb-28 md:pt-44">
      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.98fr_0.72fr] lg:items-center">
        <div>
          <h1 className="animate-fade-in-up max-w-4xl font-display text-5xl leading-[0.98] tracking-tight text-cream md:text-7xl">
            {t("heading")}
            <br className="hidden md:block" />
            <span className="text-accent">{t("headingLine2")}</span>
          </h1>
          <p className="animate-fade-in-up delay-1 mt-7 max-w-2xl text-lg leading-8 text-cream-muted">
            {t("description")}
          </p>
          <div className="animate-fade-in-up delay-2 mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button href="/ai-workflow-audit">{t("cta")}</Button>
            <a
              href="#projects"
              className="text-sm font-medium uppercase tracking-wide text-accent underline decoration-border underline-offset-4 transition-colors hover:text-accent-hover"
            >
              {t("ctaSecondary")}
            </a>
          </div>
        </div>

        <div className="animate-fade-in-up delay-3 border border-border bg-white p-5 shadow-[0_18px_60px_rgba(26,26,46,0.07)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="space-y-3">
              {cardInputs.map((item) => (
                <div
                  key={item}
                  className="border border-border bg-background px-3 py-2 text-sm text-cream-muted"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="h-px w-12 bg-border" />
            <div className="border border-cream bg-cream p-4 text-white">
              <p className="font-display text-2xl leading-tight">{t("cardTitle")}</p>
              <div className="mt-5 space-y-3">
                {cardOutputs.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between border-b border-white/15 pb-2 text-sm text-white/75"
                  >
                    <span>{item}</span>
                    <span className="h-2 w-2 bg-accent" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
    </section>
  );
}
