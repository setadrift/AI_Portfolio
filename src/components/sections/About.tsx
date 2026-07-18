import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import SectionWrapper from "@/components/ui/SectionWrapper";

export default function About() {
  const t = useTranslations("about");
  const context = useLocale() === "fr"
    ? [["Basé à", "Montréal, Canada"], ["Travaille avec", "Équipes nord-américaines"], ["Responsabilité", "Directement avec Duncan"]]
    : [["Based in", "Montreal, Canada"], ["Works with", "North American teams"], ["Accountability", "Directly with Duncan"]];

  return (
    <SectionWrapper id="about">
      <div className="grid gap-12 md:grid-cols-5 md:items-center">
        <div className="flex justify-center md:col-span-2">
          <div className="relative">
            <Image
              src="/duncs.png"
              alt={t("imageAlt")}
              width={400}
              height={400}
              className="h-72 w-72 object-cover transition-all duration-500 hover:scale-[1.03] md:h-80 md:w-80"
              sizes="(max-width: 768px) 288px, 320px"
            />
            <div className="absolute -inset-3 -z-10 border border-accent/20" />
          </div>
        </div>

        <div className="md:col-span-3">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
            {t("label")}
          </p>
          <h2 className="mb-6 font-display text-3xl text-cream md:text-4xl">
            {t("heading")}
          </h2>
          <div className="space-y-5 text-cream-muted leading-relaxed">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
          </div>
          <dl className="mt-8 grid gap-4 border-y border-border py-5 sm:grid-cols-3">
            {context.map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-[0.14em] text-cream-dim">{label}</dt><dd className="mt-1 text-sm font-semibold text-cream">{value}</dd></div>)}
          </dl>
        </div>
      </div>
    </SectionWrapper>
  );
}
