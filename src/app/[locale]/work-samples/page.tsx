import { setRequestLocale } from "next-intl/server";
import WorkSamplesPage from "@/app/work-samples/page";

export default async function LocalizedWorkSamplesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WorkSamplesPage />;
}
