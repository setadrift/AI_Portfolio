import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";

export const runtime = "nodejs";

export default async function AdminProjectsPage() {
  const data = await readAcquisitionData();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Won work and delivery
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Projects
        </h1>
        <p className="mt-1 text-sm text-cream-muted">
          Durable handoffs from pipeline wins plus existing engagements.
        </p>
      </header>
      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="divide-y divide-border">
          {data.projects.map((project) => {
            const opportunity = data.opportunities.find(
              (item) => item.id === project.opportunityId,
            );
            const open = data.commitments.filter(
              (item) =>
                item.projectId === project.id &&
                !["done", "cancelled"].includes(item.status),
            );
            return (
              <article
                key={project.id}
                className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_.7fr_.7fr_1.3fr]"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {project.client}
                  </p>
                  <p className="mt-1 text-sm text-cream-muted">
                    {project.project}
                  </p>
                  {opportunity ? (
                    <p className="mt-2 text-xs text-accent">
                      From {opportunity.sourceFamily} pipeline
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-cream-dim">
                    Status
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {project.status} · {project.phase}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-cream-dim">
                    Value
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {project.feeCents
                      ? `${project.currencyCode || ""} ${(project.feeCents / 100).toLocaleString()}`
                      : project.valueEstimate || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-cream-dim">
                    Next action
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {project.nextAction}
                  </p>
                  <p className="mt-2 text-xs text-cream-muted">
                    {open.length} open commitment{open.length === 1 ? "" : "s"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
