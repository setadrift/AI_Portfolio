import { setRequestLocale } from "next-intl/server";
import WillowOpsPrototypePage from "@/app/willowops-prototype/page";

export default async function LocalizedWillowOpsPrototypePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WillowOpsPrototypePage />;
}
