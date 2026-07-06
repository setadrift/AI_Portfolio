import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  return WORKFLOW_VERTICALS.map((vertical) => ({
    locale: "en",
    workflow: vertical.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, workflow } = await params;
  if (locale !== "en") {
    return {
      title: "Audit de workflow IA | Duncan Anderson",
      description:
        "Systèmes IA pratiques pour workflows d'affaires désordonnés.",
      alternates: {
        canonical: `${SITE.url}/fr/ai-workflow-audit`,
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const vertical = getWorkflowVertical(workflow);

  if (!vertical) {
    return {};
  }

  return {
    title: `${vertical.shortTitle} Workflow Audit | Duncan Anderson`,
    description: vertical.metaDescription,
    alternates: {
      canonical: `${SITE.url}/ai-workflow-audit/${vertical.slug}`,
    },
  };
}

export default async function WorkflowAuditVerticalPage({ params }: PageProps) {
  const { locale, workflow } = await params;
  if (locale !== "en") {
    redirect("/fr/ai-workflow-audit");
  }

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
