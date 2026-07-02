import { setRequestLocale } from "next-intl/server";
import MindbodyEnrollmentAutomationPage from "@/app/mindbody-enrollment-automation/page";

export default async function LocalizedMindbodyEnrollmentAutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MindbodyEnrollmentAutomationPage />;
}
