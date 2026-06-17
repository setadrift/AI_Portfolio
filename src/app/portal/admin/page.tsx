import Link from "next/link";
import {
  consultingProjects,
  currency,
  formatDate,
  getActiveProjects,
  getBookedRevenueForMonth,
  getDueTasks,
  getFollowUpLeads,
  getPendingCommercialItems,
  getWaitingTasks,
  importantAdminLinks,
  type ConsultingLink,
  type ConsultingProject,
} from "@/lib/portal/admin/consulting";

export default function AdminDashboardPage() {
  const activeProjects = getActiveProjects();
  const dueTasks = getDueTasks();
  const waitingTasks = getWaitingTasks();
  const followUpLeads = getFollowUpLeads();
  const pendingCommercialItems = getPendingCommercialItems();
  const bookedRevenue = getBookedRevenueForMonth();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
          Consulting command center
        </p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-muted">
          A simple internal view of active consulting work, follow-ups, and next actions.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Active projects" value={activeProjects.length.toString()} />
        <Metric label="Follow-ups due" value={followUpLeads.length.toString()} />
        <Metric label="Tasks due" value={dueTasks.length.toString()} />
        <Metric label="Pending money" value={pendingCommercialItems.length.toString()} />
        <Metric label="Booked this month" value={currency(bookedRevenue)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel title="Today" actionHref="/portal/admin/tasks" actionLabel="View tasks">
          <ItemList
            empty="No tasks due today."
            items={dueTasks.map((task) => ({
              id: task.id,
              title: task.title,
              meta: `${task.client} · ${task.priority} · ${task.type}`,
              note: task.notes,
            }))}
          />
        </Panel>

        <Panel title="Waiting on Client" actionHref="/portal/admin/tasks" actionLabel="View queue">
          <ItemList
            empty="Nothing is waiting on a client."
            items={waitingTasks.map((task) => ({
              id: task.id,
              title: task.title,
              meta: `${task.client} · due ${formatDate(task.dueAt)}`,
              note: task.notes,
            }))}
          />
        </Panel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <Panel title="Active Projects" actionHref="/portal/admin/projects" actionLabel="View projects">
          <div className="divide-y divide-border">
            {activeProjects.length === 0 ? (
              <EmptyState>No active projects.</EmptyState>
            ) : (
              activeProjects.map((project) => <ProjectRow key={project.id} project={project} />)
            )}
          </div>
        </Panel>

        <Panel title="Follow-Ups" actionHref="/portal/admin/leads" actionLabel="View leads">
          <ItemList
            empty="No lead follow-ups due."
            items={followUpLeads.map((lead) => ({
              id: lead.id,
              title: lead.name,
              meta: `${lead.source} · ${lead.status} · ${lead.valueEstimate ?? "No estimate"}`,
              note: lead.painPoint,
            }))}
          />
        </Panel>
      </section>

      <Panel title="Important Links">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ...importantAdminLinks,
            ...consultingProjects.flatMap((project) =>
              project.links.slice(0, 1).map((link) => ({
                ...link,
                label: `${project.client}: ${link.label}`,
              })),
            ),
          ].map((link) => (
            <LinkTile key={`${link.label}-${link.href ?? link.reference}`} link={link} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-cream-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-foreground">{value}</p>
    </div>
  );
}

function Panel({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {actionHref && actionLabel && (
          <Link href={actionHref} className="text-sm text-accent hover:text-accent-hover">
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ItemList({
  items,
  empty,
}: {
  items: Array<{ id: string; title: string; meta: string; note: string }>;
  empty: string;
}) {
  if (items.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="py-3 first:pt-0 last:pb-0">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cream-dim">{item.meta}</p>
          <p className="mt-2 text-sm leading-6 text-cream-muted">{item.note}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ project }: { project: ConsultingProject }) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{project.project}</p>
          <StatusPill>{project.status}</StatusPill>
          <StatusPill>{project.paymentStatus}</StatusPill>
        </div>
        <p className="mt-1 text-sm text-cream-muted">{project.client}</p>
        <p className="mt-2 text-sm leading-6 text-cream-muted">{project.nextAction}</p>
      </div>
      <div className="text-left md:text-right">
        <p className="font-display text-2xl text-foreground">{currency(project.feeCents)}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-cream-dim">
          target {formatDate(project.targetDate)}
        </p>
      </div>
    </div>
  );
}

function LinkTile({ link }: { link: ConsultingLink }) {
  if (link.href) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-border bg-surface-elevated p-3 text-sm transition-colors hover:border-accent"
      >
        <span className="font-medium text-foreground">{link.label}</span>
        <span className="mt-1 block break-all text-cream-muted">{link.href}</span>
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3 text-sm">
      <p className="font-medium text-foreground">{link.label}</p>
      <code className="mt-1 block break-all text-xs text-cream-muted">{link.reference}</code>
    </div>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface-elevated px-3 py-4 text-sm text-cream-muted">
      {children}
    </p>
  );
}
