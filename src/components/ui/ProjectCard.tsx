import { Link } from "@/i18n/navigation";

interface ProjectCardProps {
  slug: string;
  clientType: string;
  title: string;
  challenge: string;
  result: string;
  readCaseStudy: string;
}

export default function ProjectCard({
  slug,
  clientType,
  title,
  challenge,
  result,
  readCaseStudy,
}: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${slug}`}
      className="group relative flex flex-col border border-border bg-surface p-7 transition-all duration-300 hover:border-accent/40 hover:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
    >
      <span className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        {clientType}
      </span>
      <h3 className="mb-3 font-display text-xl text-cream">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-cream-muted">{challenge}</p>
      <p className="mt-auto border-t border-border pt-4 text-sm font-medium text-cream-dim">
        {result}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent transition-all duration-200 group-hover:gap-3">
        {readCaseStudy}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </span>
    </Link>
  );
}
