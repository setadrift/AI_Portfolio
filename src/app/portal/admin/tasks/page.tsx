import {
  formatDate,
  getTasksByBucket,
  type ConsultingTask,
} from "@/lib/portal/admin/consulting";

const buckets: Array<{
  key: keyof ReturnType<typeof getTasksByBucket>;
  title: string;
  empty: string;
}> = [
  { key: "overdue", title: "Overdue", empty: "No overdue tasks." },
  { key: "today", title: "Today", empty: "No tasks due today." },
  { key: "thisWeek", title: "This Week", empty: "No upcoming tasks this week." },
  { key: "waiting", title: "Waiting", empty: "Nothing is waiting on someone else." },
  { key: "backlog", title: "Backlog", empty: "No unscheduled backlog tasks." },
];

export default function AdminTasksPage() {
  const tasksByBucket = getTasksByBucket();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
          Action queue
        </p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Tasks</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-cream-muted">
          A cross-project list of the next actions that keep consulting work moving.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {buckets.map((bucket) => (
          <section key={bucket.key} className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">{bucket.title}</h2>
              <span className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-cream-muted">
                {tasksByBucket[bucket.key].length}
              </span>
            </div>
            <div className="divide-y divide-border p-4">
              {tasksByBucket[bucket.key].length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface-elevated px-3 py-4 text-sm text-cream-muted">
                  {bucket.empty}
                </p>
              ) : (
                tasksByBucket[bucket.key].map((task) => <TaskRow key={task.id} task={task} />)
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: ConsultingTask }) {
  return (
    <article className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{task.title}</p>
          <StatusPill>{task.priority}</StatusPill>
          <StatusPill>{task.status}</StatusPill>
        </div>
        <p className="mt-1 text-sm text-cream-muted">
          {task.client} · {task.type}
        </p>
        <p className="mt-2 text-sm leading-6 text-cream-muted">{task.notes}</p>
      </div>
      <div className="text-sm text-cream-muted sm:text-right">
        <p className="font-medium text-foreground">{formatDate(task.dueAt)}</p>
        {task.projectId && (
          <p className="mt-1 break-all text-xs uppercase tracking-[0.12em] text-cream-dim">
            {task.projectId}
          </p>
        )}
      </div>
    </article>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent">
      {children}
    </span>
  );
}
