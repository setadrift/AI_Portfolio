import {
  consultingProjects,
  consultingTasks,
  formatDate,
  projectValue,
  type ConsultingProject,
} from "@/lib/portal/admin/consulting";

const statusOrder = ["Proposal", "Active", "Discovery", "Waiting on Client", "Paused", "Complete", "Lost"];

export default function AdminProjectsPage() {
  const projects = [...consultingProjects].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Consulting
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-cream-muted">
          One row per engagement: state, value, and the next thing that matters.
        </p>
      </header>

      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="hidden grid-cols-[1.2fr_0.7fr_0.8fr_1.4fr] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream-dim lg:grid">
          <span>Client</span>
          <span>Status</span>
          <span>Value</span>
          <span>Next action</span>
        </div>
        <div className="divide-y divide-border">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
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
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_0.7fr_0.8fr_1.4fr]">
      <div>
        <p className="font-semibold text-foreground">{project.client}</p>
        <p className="mt-1 text-sm text-cream-muted">{project.project}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-cream-dim">
          target {formatDate(project.targetDate)}
        </p>
      </div>

      <div>
        <MobileLabel>Status</MobileLabel>
        <Status>{project.status}</Status>
        <p className="mt-2 text-sm text-cream-muted">{project.phase}</p>
      </div>

      <div>
        <MobileLabel>Value</MobileLabel>
        <p className="font-semibold text-foreground">{projectValue(project)}</p>
        <p className="mt-2 text-sm text-cream-muted">{project.paymentStatus}</p>
      </div>

      <div>
        <MobileLabel>Next action</MobileLabel>
        <p className="text-sm leading-6 text-foreground">{project.nextAction}</p>
        {openTasks.length ? (
          <p className="mt-2 text-xs text-cream-muted">
            {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="mt-2 text-xs text-cream-muted">No open tasks</p>
        )}
      </div>
    </article>
  );
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-cream-dim lg:hidden">
      {children}
    </p>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  );
}
