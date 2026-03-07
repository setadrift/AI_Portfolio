import { useTranslations } from "next-intl";
import SectionWrapper from "@/components/ui/SectionWrapper";
import ProjectCard from "@/components/ui/ProjectCard";
import { PROJECTS } from "@/lib/constants";

const SLUG_TO_KEY: Record<string, string> = {
  "dispute-defender": "disputeDefender",
  "deal-engine": "dealEngine",
  "the-lineup": "theLineup",
};

export default function Projects() {
  const t = useTranslations("projects");

  return (
    <SectionWrapper id="projects" alternate>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
        {t("label")}
      </p>
      <h2 className="mb-4 font-display text-3xl text-cream md:text-4xl">
        {t("heading")}
      </h2>
      <p className="mb-12 max-w-2xl text-cream-muted">{t("description")}</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => {
          const key = SLUG_TO_KEY[project.slug];
          return (
            <ProjectCard
              key={project.slug}
              slug={project.slug}
              clientType={t(`${key}.clientType`)}
              title={t(`${key}.title`)}
              challenge={t(`${key}.challenge`)}
              result={t(`${key}.result`)}
              readCaseStudy={t("readCaseStudy")}
            />
          );
        })}
      </div>
    </SectionWrapper>
  );
}
