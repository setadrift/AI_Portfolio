import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import MindbodyEnrollmentAutomationPage from "@/app/mindbody-enrollment-automation/page";
import { SITE } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: "Mindbody Enrollment Automation | Duncan Anderson",
    description:
      "A runnable work sample for checking Mindbody enrollments, preparing missing sessions, and protecting CRM sync boundaries.",
    alternates: {
      canonical: `${SITE.url}/mindbody-enrollment-automation`,
    },
    robots:
      locale === "fr"
        ? {
            index: false,
            follow: true,
          }
        : undefined,
  };
}

export default async function LocalizedMindbodyEnrollmentAutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "en") {
    redirect("/mindbody-enrollment-automation");
  }

  setRequestLocale(locale);

  return <MindbodyEnrollmentAutomationPage />;
}
