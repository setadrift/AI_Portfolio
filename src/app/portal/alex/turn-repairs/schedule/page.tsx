import { listTurnRepairRecords, type TurnRepairRecord } from "@/lib/portal/alex/turn-repairs";

export default async function TurnRepairSchedulePage() {
  const records = await listTurnRepairRecords().catch(() => []);
  const active = records.filter((record) => record.status !== "Done");
  const unassigned = active.filter((record) => !record.contractor);
  const unscheduled = active.filter((record) => !record.targetDate && !record.scheduledDate);
  const waiting = active.filter((record) => record.waitingOn);
  const deadlineRisk = active.filter(
    (record) => record.majorItem || (!record.contractor && record.priority.toLowerCase().includes("high")),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Schedule / next actions
      </p>
      <h1 className="mb-3 font-display text-4xl">Who is doing what, and what is at risk</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        This page covers the coordination layer in Alex&apos;s notes: contractor assignments, target
        dates, waiting-on items, and move-in deadline pressure.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Metric label="Active repairs" value={active.length} />
        <Metric label="Unassigned" value={unassigned.length} />
        <Metric label="Unscheduled" value={unscheduled.length} />
        <Metric label="Deadline risk" value={deadlineRisk.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Contractor schedule">
          <RepairList records={groupPriority(active.filter((record) => record.contractor))} empty="No contractor-assigned records yet." />
        </Panel>
        <Panel title="Next action queue">
          <RepairList records={groupPriority(waiting.length ? waiting : active)} empty="No waiting-on items yet." />
        </Panel>
        <Panel title="Unassigned / unscheduled">
          <RepairList records={groupPriority([...unassigned, ...unscheduled])} empty="No unassigned or unscheduled records." />
        </Panel>
        <Panel title="Deadline risk">
          <RepairList records={groupPriority(deadlineRisk)} empty="No deadline-risk records in the current view." />
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-3xl font-semibold text-accent">{value}</div>
      <div className="mt-1 text-sm text-cream-muted">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function RepairList({ records, empty }: { records: TurnRepairRecord[]; empty: string }) {
  if (!records.length) return <p className="text-sm text-cream-muted">{empty}</p>;

  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <article key={`${record.id}-${index}`} className="rounded-lg border border-border bg-surface-elevated p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{record.repair}</h3>
              <p className="mt-1 text-sm text-cream-muted">
                {[record.property, record.area, record.contractor || "Unassigned"].filter(Boolean).join(" / ")}
              </p>
            </div>
            {record.majorItem && <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">Major</span>}
          </div>
          <dl className="mt-3 grid gap-2 text-xs text-cream-muted sm:grid-cols-2">
            <Info label="Target" value={record.targetDate || "Not set"} />
            <Info label="Waiting on" value={record.waitingOn || "Not set"} />
            <Info label="Next action" value={record.nextAction || "Not set"} />
            <Info label="Move-in" value={record.moveInDeadline || "Not set"} />
          </dl>
        </article>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold uppercase tracking-[0.12em] text-cream-dim">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function groupPriority(records: TurnRepairRecord[]): TurnRepairRecord[] {
  const seen = new Set<string>();
  return records
    .filter((record) => {
      const key = JSON.stringify(record);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.majorItem !== b.majorItem) return a.majorItem ? -1 : 1;
      return (a.targetDate || "9999").localeCompare(b.targetDate || "9999") || a.repair.localeCompare(b.repair);
    });
}
