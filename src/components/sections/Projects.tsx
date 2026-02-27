import SectionWrapper from "@/components/ui/SectionWrapper";
import ProjectCard from "@/components/ui/ProjectCard";
import { PROJECTS } from "@/lib/constants";

export default function Projects() {
  return (
    <SectionWrapper id="projects" alternate>
      <h2 className="mb-4 text-3xl font-bold text-slate-900">
        Featured Projects
      </h2>
      <p className="mb-10 max-w-2xl text-slate-600">
        Real results for real businesses. Here are a few examples of how
        I&apos;ve helped small teams work smarter with AI.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.title} {...project} />
        ))}
      </div>
    </SectionWrapper>
  );
}
