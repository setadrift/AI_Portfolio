import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import WorkflowVerticalLandingPage from "@/components/ads/WorkflowVerticalLandingPage";
import {
  getWorkflowVertical,
  WORKFLOW_VERTICALS,
} from "@/lib/ai-workflow-verticals";
import { SITE } from "@/lib/constants";

type PageProps = {
  params: Promise<{ locale: string; workflow: string }>;
};

export function generateStaticParams() {
  return ["en", "fr"].flatMap((locale) =>
    WORKFLOW_VERTICALS.map((vertical) => ({
      locale,
      workflow: vertical.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, workflow } = await params;
  const vertical = getWorkflowVertical(workflow);

  if (!vertical) {
    return {};
  }

  const prefix = locale === "en" ? "" : `/${locale}`;
  const path = `${prefix}/ai-workflow-audit/${vertical.slug}`;

  return {
    title: `${vertical.shortTitle} Workflow Audit | Duncan Anderson`,
    description: vertical.metaDescription,
    alternates: {
      canonical: `${SITE.url}${path}`,
    },
  };
}

export default async function WorkflowAuditVerticalPage({ params }: PageProps) {
  const { locale, workflow } = await params;
  setRequestLocale(locale);

  const vertical = getWorkflowVertical(workflow);

  if (!vertical) {
    notFound();
  }

  const related = WORKFLOW_VERTICALS.filter(
    (item) => item.slug !== vertical.slug,
  ).slice(0, 3);

  return (
    <WorkflowVerticalLandingPage
      locale={locale}
      vertical={vertical}
      related={related}
    />
  );
}
