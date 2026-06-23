import {
  consultingProjects,
  consultingTasks,
  currency,
  formatDate,
  type ConsultingLink,
  type ConsultingProject,
} from "@/lib/portal/admin/consulting";

export default function AdminProjectsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
          Consulting work
        </p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Projects</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-muted">
          Active engagements, internal builds, current phase, money status, and next action.
        </p>
      </header>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_1.2fr] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim lg:grid">
          <span>Project</span>
          <span>Status</span>
          <span>Fee</span>
          <span>Target</span>
          <span>Next action</span>
        </div>
        <div className="divide-y divide-border">
          {consultingProjects.length === 0 ? (
            <p className="p-4 text-sm text-cream-muted">No projects yet.</p>
          ) : (
            consultingProjects.map((project) => <ProjectRow key={project.id} project={project} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ProjectRow({ project }: { project: ConsultingProject }) {
  const openTasks = consultingTasks.filter(
    (task) => task.projectId === project.id && task.status !== "Done",
  );

  return (
    <article className="grid gap-4 px-4 py-5 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_1.2fr]">
      <div>
        <p className="font-semibold text-foreground">{project.project}</p>
        <p className="mt-1 text-sm text-cream-muted">{project.client}</p>
        <p className="mt-3 text-sm leading-6 text-cream-muted">{project.scope}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.links.map((link) => (
            <ProjectLink key={`${project.id}-${link.label}`} link={link} />
          ))}
        </div>
      </div>

      <div>
        <MobileLabel>Status</MobileLabel>
        <div className="flex flex-wrap gap-2">
          <StatusPill>{project.status}</StatusPill>
          <StatusPill>{project.paymentStatus}</StatusPill>
        </div>
        <p className="mt-3 text-sm text-cream-muted">{project.phase}</p>
      </div>

      <div>
        <MobileLabel>Fee</MobileLabel>
        <p className="font-display text-2xl text-foreground">{currency(project.feeCents)}</p>
      </div>

      <div>
        <MobileLabel>Target</MobileLabel>
        <p className="text-sm text-foreground">{formatDate(project.targetDate)}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cream-dim">
          started {formatDate(project.startedAt)}
        </p>
      </div>

      <div>
        <MobileLabel>Next action</MobileLabel>
        <p className="text-sm leading-6 text-foreground">{project.nextAction}</p>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">
            Open tasks
          </p>
          {openTasks.length === 0 ? (
            <p className="mt-2 text-sm text-cream-muted">No open tasks.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-cream-muted">
              {openTasks.slice(0, 3).map((task) => (
                <li key={task.id}>- {task.title}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function ProjectLink({ link }: { link: ConsultingLink }) {
  if (link.href) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-border px-3 py-1 text-xs text-cream-muted hover:border-accent hover:text-accent"
      >
        {link.label}
      </a>
    );
  }

  return (
    <span className="rounded-full border border-border px-3 py-1 text-xs text-cream-muted">
      {link.label}
    </span>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim lg:hidden">
      {children}
    </p>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  );
}
