import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
        {t("code")}
      </p>
      <h1 className="mb-4 font-display text-4xl tracking-tight text-cream">
        {t("heading")}
      </h1>
      <p className="mb-8 max-w-md text-lg text-cream-muted">
        {t("description")}
      </p>
      <Button href="/">{t("backHome")}</Button>
    </section>
  );
}
