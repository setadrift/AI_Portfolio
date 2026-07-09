import Link from "next/link";
import {
  consultingLeads,
  formatDate,
  getActiveProjects,
  getDueTasks,
  getFollowUpLeads,
  getOpenTasks,
  getProposalProjects,
  getWaitingTasks,
  projectValue,
  type ConsultingProject,
  type ConsultingTask,
} from "@/lib/portal/admin/consulting";

export default function AdminDashboardPage() {
  const activeProjects = getActiveProjects();
  const proposalProjects = getProposalProjects();
  const dueTasks = getDueTasks();
  const waitingTasks = getWaitingTasks();
  const followUpLeads = getFollowUpLeads();
  const openTasks = getOpenTasks();
  const ownerTasks = openTasks.filter((task) => task.status !== "Waiting");
  const currentLeads = consultingLeads.filter((lead) => lead.status !== "Dormant");
  const primaryProject = activeProjects[0] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            What needs attention
          </h1>
          <p className="mt-1 text-sm text-cream-muted">
            Current client state, proposal work, and the smallest useful next step.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <NavLink href="/portal/admin/leads">Lead board</NavLink>
          <NavLink href="/portal/admin/projects">Projects</NavLink>
          <NavLink href="/portal/admin/tasks">Tasks</NavLink>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Open tasks" value={openTasks.length} />
        <Metric label="Due now" value={dueTasks.length} tone={dueTasks.length ? "attention" : "neutral"} />
        <Metric label="Waiting" value={waitingTasks.length} />
        <Metric label="Proposals" value={proposalProjects.length} />
      </section>

      {primaryProject ? <PriorityProject project={primaryProject} /> : null}

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Next Actions" href="/portal/admin/tasks">
          <TaskList
            tasks={[...dueTasks, ...ownerTasks.filter((task) => !dueTasks.includes(task))].slice(0, 5)}
            empty="No owner-side action is due. Current work is waiting on client materials or feedback."
          />
        </Panel>

        <Panel title="Waiting On" href="/portal/admin/tasks">
          <TaskList tasks={waitingTasks.slice(0, 5)} empty="Nothing is blocked on someone else." />
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Pipeline" href="/portal/admin/projects">
          <div className="divide-y divide-border">
            {activeProjects.map((project) => (
              <ProjectLine key={project.id} project={project} />
            ))}
          </div>
        </Panel>

        <Panel title="Follow Ups" href="/portal/admin/leads">
          {followUpLeads.length === 0 ? (
            <Empty>No lead follow-ups due.</Empty>
          ) : (
            <div className="divide-y divide-border">
              {followUpLeads.map((lead) => (
                <div key={lead.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium text-foreground">{lead.business}</p>
                  <p className="mt-1 text-sm text-cream-muted">{lead.name}</p>
                  <p className="mt-2 text-sm leading-5 text-cream-muted">{lead.notes}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <Panel title="Current Lead State" href="/portal/admin/leads">
        <div className="grid gap-3 sm:grid-cols-2">
          {currentLeads.slice(0, 4).map((lead) => (
            <div key={lead.id} className="border-l-2 border-border py-1 pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{lead.business}</p>
                <Status>{lead.status}</Status>
              </div>
              <p className="mt-1 text-sm text-cream-muted">{lead.painPoint}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-cream-dim">
                next follow-up {formatDate(lead.nextFollowUpAt)}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function PriorityProject({ project }: { project: ConsultingProject }) {
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-dim">
            Primary focus
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{project.client}</h2>
          <p className="mt-1 text-sm text-cream-muted">{project.project}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground">{project.nextAction}</p>
        </div>
        <div className="min-w-48 rounded-md border border-border bg-surface-elevated p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-cream-dim">value</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{projectValue(project)}</p>
          <p className="mt-2 text-xs text-cream-muted">{project.phase}</p>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "attention";
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream-dim">{label}</p>
      <p className={tone === "attention" ? "mt-1 text-2xl font-semibold text-amber-700" : "mt-1 text-2xl font-semibold text-foreground"}>
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-accent hover:text-accent-hover">
            Open
          </Link>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function TaskList({
  tasks,
  empty = "No open tasks.",
}: {
  tasks: ConsultingTask[];
  empty?: string;
}) {
  if (tasks.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="divide-y divide-border">
      {tasks.map((task) => (
        <div key={task.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{task.title}</p>
            <Status>{task.status}</Status>
          </div>
          <p className="mt-1 text-sm text-cream-muted">
            {task.client} · {formatDate(task.dueAt)}
          </p>
          <p className="mt-2 text-sm leading-5 text-cream-muted">{task.notes}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectLine({ project }: { project: ConsultingProject }) {
  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{project.client}</p>
          <Status>{project.status}</Status>
        </div>
        <p className="mt-1 text-sm text-cream-muted">{project.nextAction}</p>
      </div>
      <p className="text-sm font-medium text-foreground sm:text-right">{projectValue(project)}</p>
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
      {children}
    </span>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-surface px-3 py-2 text-foreground hover:border-accent"
    >
      {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-cream-muted">{children}</p>;
}
