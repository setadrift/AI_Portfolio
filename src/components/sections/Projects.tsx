import SectionWrapper from "@/components/ui/SectionWrapper";
import ProjectCard from "@/components/ui/ProjectCard";
import { PROJECTS } from "@/lib/constants";

export default function Projects() {
  return (
    <SectionWrapper id="projects" alternate>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Portfolio
      </p>
      <h2 className="mb-4 font-display text-3xl text-cream md:text-4xl">
        Featured Projects
      </h2>
      <p className="mb-12 max-w-2xl text-cream-muted">
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
