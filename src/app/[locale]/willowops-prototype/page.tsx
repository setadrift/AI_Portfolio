import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import WillowOpsPrototypePage from "@/app/willowops-prototype/page";
import { SITE } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Willow Grey Data-Entry Prototype | Duncan Anderson",
    description:
      "A review-first prototype that turns messy notes into structured, human-approved records.",
    alternates: {
      canonical: `${SITE.url}/willowops-prototype`,
    },
    robots: { index: false, follow: false },
  };
}

export default async function LocalizedWillowOpsPrototypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") {
    redirect("/willowops-prototype");
  }

  setRequestLocale(locale);

  return <WillowOpsPrototypePage />;
}
