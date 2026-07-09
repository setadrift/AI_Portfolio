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
  { key: "thisWeek", title: "Next 7 Days", empty: "No scheduled work this week." },
  { key: "waiting", title: "Waiting", empty: "Nothing is waiting on someone else." },
  { key: "backlog", title: "Backlog", empty: "No unscheduled tasks." },
];

export default function AdminTasksPage() {
  const tasksByBucket = getTasksByBucket();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Action queue
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Tasks</h1>
        <p className="mt-1 text-sm text-cream-muted">
          Sorted by urgency. Waiting items stay visible without pretending they are due today.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {buckets.map((bucket) => (
          <section key={bucket.key} className="rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">{bucket.title}</h2>
              <span className="text-sm text-cream-muted">{tasksByBucket[bucket.key].length}</span>
            </div>
            <div className="divide-y divide-border p-4">
              {tasksByBucket[bucket.key].length === 0 ? (
                <p className="text-sm text-cream-muted">{bucket.empty}</p>
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
    <article className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{task.title}</p>
          <Status>{task.priority}</Status>
          <Status>{task.status}</Status>
        </div>
        <p className="mt-1 text-sm text-cream-muted">
          {task.client} · {task.type}
        </p>
        <p className="mt-2 text-sm leading-5 text-cream-muted">{task.notes}</p>
      </div>
      <p className="text-sm text-cream-muted sm:text-right">{formatDate(task.dueAt)}</p>
    </article>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
      {children}
    </span>
  );
}
