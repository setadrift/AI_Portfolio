import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import SelectedWorkPage from "@/components/portfolio/SelectedWorkPage";
import { SITE } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFrench = locale === "fr";

  return {
    title: isFrench ? "Travaux sélectionnés | Duncan Anderson" : "Selected AI and Automation Work | Duncan Anderson",
    description: isFrench
      ? "Un dossier de preuves sur des produits en ligne, systèmes d'entreprise et livraisons client."
      : "A proof-led dossier of live products, enterprise systems, and client-delivered automation work.",
    alternates: {
      canonical: `${SITE.url}${isFrench ? "/fr" : ""}/work-samples`,
      languages: {
        en: `${SITE.url}/work-samples`,
        fr: `${SITE.url}/fr/work-samples`,
      },
    },
  };
}

export default async function LocalizedWorkSamplesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SelectedWorkPage locale={locale === "fr" ? "fr" : "en"} />;
}
