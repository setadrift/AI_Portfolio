import Link from "next/link";
import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import { acquisitionMetrics } from "@/lib/portal/admin/consulting-metrics";
import { stageLabel } from "@/lib/portal/admin/acquisition";
import { readLeadDashboardData } from "@/lib/portal/admin/leads";

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const [data, discovery] = await Promise.all([
    readAcquisitionData(),
    readLeadDashboardData(),
  ]);
  const metrics = acquisitionMetrics(data);
  const now = new Date();
  const openCommitments = data.commitments
    .filter((item) => !["done", "cancelled"].includes(item.status))
    .sort(
      (a, b) =>
        commitmentPriority(a, opportunityByIdPlaceholder(data), now) -
          commitmentPriority(b, opportunityByIdPlaceholder(data), now) ||
        a.dueAt.localeCompare(b.dueAt),
    );
  const opportunityById = new Map(
    data.opportunities.map((item) => [item.id, item]),
  );
  const partnerById = new Map(data.partners.map((item) => [item.id, item]));
  const defects = data.opportunities.filter(
    (item) =>
      !["won", "lost"].includes(item.stage) &&
      (!item.nextAction || !item.nextActionDueAt),
  );
  const activePipeline = data.opportunities.filter(
    (item) => !["won", "lost", "nurture"].includes(item.stage),
  );
  const qualifiedWaiting = activePipeline.filter(
    (item) =>
      ["qualified", "ready_to_contact"].includes(item.stage) &&
      !item.lastContactAt &&
      (businessHoursElapsed(new Date(item.createdAt), now) >= 8 ||
        (item.nextActionDueAt && new Date(item.nextActionDueAt) <= now)),
  );
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const freshLeads = discovery.sources
    .flatMap((source) =>
      (source.digest?.leads ?? []).map((lead) => ({ lead, source: source.id })),
    )
    .filter(({ lead, source }) => {
      const state =
        discovery.leadStates[
          `${source}:${lead.url || `${lead.subreddit}:${lead.title}`}`
        ];
      const discovered = new Date(
        `${lead.discoveredDate || lead.postedDate}T00:00:00`,
      );
      return (
        discovered >= yesterday &&
        !state?.dismissed &&
        !["commented", "dm_sent", "converted", "dismissed"].includes(
          state?.action || "new",
        ) &&
        (Number(lead.score) >= 4 ||
          /rfp|hire|paid|consultant|contract/i.test(
            `${lead.title} ${lead.reason}`,
          ))
      );
    })
    .sort((a, b) => Number(b.lead.score) - Number(a.lead.score));
  const scannerWarnings = discovery.sources.filter(
    (source) => !source.diagnostic.usable || source.diagnostic.warning,
  );
  const recentMovement = data.activities
    .filter((item) =>
      ["reply", "proposal", "stage_change"].includes(item.activityType),
    )
    .slice(0, 5);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-dim">
          Consulting acquisition
        </p>
        <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              What moves revenue today
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-cream-muted">
              Fresh opportunities first, then replies, proposals, follow-ups,
              and the weekly relationship work that creates the next contract.
            </p>
          </div>
          <Link
            href="/portal/admin/pipeline"
            className="w-fit rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:bg-cream-muted"
          >
            Open pipeline
          </Link>
        </div>
      </header>

      {!data.configured ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          The acquisition database is not available. Apply the consulting
          acquisition migration before relying on this dashboard.
        </section>
      ) : null}
      {scannerWarnings.length ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Discovery health needs attention
          </p>
          {scannerWarnings.map((source) => (
            <p key={source.id} className="mt-1 text-sm text-amber-800">
              {source.label}:{" "}
              {source.diagnostic.warning || "The current digest is not usable."}
            </p>
          ))}
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Due today"
          value={metrics.dueToday}
          detail={`${metrics.overdueCommitments} overdue`}
          tone={metrics.overdueCommitments ? "risk" : "neutral"}
        />
        <Metric
          label="Active opportunities"
          value={activePipeline.length}
          detail={`${metrics.stageCounts.proposal_sent ?? 0} proposals out`}
        />
        <Metric
          label="Partner contacts"
          value={`${metrics.partnerContacts}/${metrics.partnerTarget}`}
          detail="this week"
          tone={
            metrics.partnerContacts < metrics.partnerTarget
              ? "attention"
              : "success"
          }
        />
        <Metric
          label="Warm conversations"
          value={`${metrics.warmConversations}/${metrics.warmTarget}`}
          detail={`${metrics.proofAssetsAdvanced}/${metrics.proofTarget} proof asset`}
          tone={
            metrics.warmConversations < metrics.warmTarget
              ? "attention"
              : "success"
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Do next"
          description="Ordered by revenue priority, then due date. Completing outreach can create the next useful follow-up."
        >
          {freshLeads.length ? (
            <div className="mb-4 space-y-2 border-b border-border pb-4">
              {freshLeads.slice(0, 3).map(({ lead, source }) => (
                <Link
                  key={`${source}:${lead.url}`}
                  href="/portal/admin/leads"
                  className="block rounded border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Priority 1 · Fresh high-intent lead
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {lead.title}
                  </p>
                  <p className="mt-1 text-sm text-cream-muted">
                    Explicit public request discovered in the last 24 hours;
                    qualify or dismiss it before older follow-ups.
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
          {qualifiedWaiting.length ? (
            <div className="mb-4 space-y-2 border-b border-border pb-4">
              {qualifiedWaiting.map((item) => (
                <Link
                  key={item.id}
                  href="/portal/admin/pipeline"
                  className="block rounded border border-border p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {item.opportunityType === "partner_overflow"
                      ? "Priority 2 · Partner overflow"
                      : "Qualified lead · Response window elapsed"}
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {item.organization}
                  </p>
                  <p className="mt-1 text-sm text-cream-muted">
                    {item.nextAction} Duncan has not recorded an outbound
                    activity within the eight-hour response window.
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
          {openCommitments.length ? (
            <div className="divide-y divide-border">
              {openCommitments.slice(0, 7).map((item) => {
                const opportunity = item.opportunityId
                  ? opportunityById.get(item.opportunityId)
                  : null;
                const partner = item.partnerId
                  ? partnerById.get(item.partnerId)
                  : null;
                const overdue = new Date(item.dueAt) < now;
                return (
                  <div
                    key={item.id}
                    className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <span
                          className={
                            overdue
                              ? "rounded bg-red-50 px-2 py-0.5 text-xs text-red-700"
                              : "rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                          }
                        >
                          {overdue ? "Overdue" : item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-cream-muted">
                        {opportunity?.organization ||
                          partner?.organization ||
                          "Internal delivery"}
                      </p>
                      <p className="mt-1 text-xs font-medium text-accent">
                        {commitmentReason(item, opportunity || undefined)}
                      </p>
                      {item.notes ? (
                        <p className="mt-2 text-sm leading-5 text-cream-muted">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm text-cream-muted sm:text-right">
                      {formatDateTime(item.dueAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty>
              No commitments are due. Add the next action to an active
              opportunity.
            </Empty>
          )}
          <Link
            href="/portal/admin/tasks"
            className="mt-4 inline-flex text-sm font-medium text-accent hover:text-accent-hover"
          >
            Manage commitments
          </Link>
        </Panel>

        <div className="grid gap-4">
          <Panel
            title="Weekly rhythm"
            description="Relationships and proof keep the pipeline from depending on job boards."
          >
            <Progress
              label="Targeted partner contacts"
              value={metrics.partnerContacts}
              target={metrics.partnerTarget}
              href="/portal/admin/partners"
            />
            <Progress
              label="Warm-network conversations"
              value={metrics.warmConversations}
              target={metrics.warmTarget}
              href="/portal/admin/partners"
            />
            <Progress
              label="Proof asset advanced"
              value={metrics.proofAssetsAdvanced}
              target={metrics.proofTarget}
              href="/portal/admin/proof"
            />
          </Panel>
          <Panel
            title="Open pipeline"
            description="Currencies stay separate so the total remains honest."
          >
            {Object.keys(metrics.pipelineByCurrency).length ? (
              <div className="space-y-2">
                {Object.entries(metrics.pipelineByCurrency).map(
                  ([currency, cents]) => (
                    <div
                      key={currency}
                      className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-sm text-cream-muted">
                        {currency}
                      </span>
                      <span className="font-semibold text-foreground">
                        {money(cents, currency)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <Empty>No valued opportunities yet.</Empty>
            )}
          </Panel>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Opportunities in motion"
          description="Every active row should have one clear next action and date."
        >
          {activePipeline.length ? (
            <div className="divide-y divide-border">
              {activePipeline.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {item.organization}
                      </p>
                      <span className="rounded bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                        {stageLabel(item.stage)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-cream-muted">
                      {item.nextAction || "Missing next action"}
                    </p>
                  </div>
                  <p className="text-sm text-cream-muted sm:text-right">
                    {item.nextActionDueAt
                      ? formatDateTime(item.nextActionDueAt)
                      : "No date"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              Promote a reviewed lead or add a warm opportunity to start the
              pipeline.
            </Empty>
          )}
        </Panel>
        <Panel
          title="Pipeline defects"
          description="These are preventable acquisition leaks, not harmless missing fields."
        >
          {defects.length ? (
            <div className="space-y-3">
              {defects.map((item) => (
                <div key={item.id} className="border-l-2 border-red-300 pl-3">
                  <p className="font-medium text-foreground">
                    {item.organization}
                  </p>
                  <p className="mt-1 text-sm text-cream-muted">
                    Add a next action and due date.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Every active opportunity has a dated next action.</Empty>
          )}
        </Panel>
        <Panel
          title="Recent movement"
          description="Replies, proposals, and stage changes recorded from durable activity."
        >
          {recentMovement.length ? (
            <div className="divide-y divide-border">
              {recentMovement.map((item) => (
                <div key={item.id} className="py-2 first:pt-0">
                  <p className="text-sm font-medium text-foreground">
                    {stageLabel(item.activityType)}
                  </p>
                  <p className="mt-1 text-sm text-cream-muted">
                    {item.summary}
                  </p>
                  <p className="mt-1 text-xs text-cream-dim">
                    {formatDateTime(item.occurredAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No replies or proposal movement recorded yet.</Empty>
          )}
        </Panel>
      </section>
    </div>
  );
}

function opportunityByIdPlaceholder(
  data: Awaited<ReturnType<typeof readAcquisitionData>>,
) {
  return new Map(data.opportunities.map((item) => [item.id, item]));
}
function commitmentPriority(
  item: Awaited<ReturnType<typeof readAcquisitionData>>["commitments"][number],
  opportunities: Map<
    string,
    Awaited<ReturnType<typeof readAcquisitionData>>["opportunities"][number]
  >,
  now: Date,
) {
  const opportunity = item.opportunityId
    ? opportunities.get(item.opportunityId)
    : undefined;
  if (
    opportunity &&
    /rfp|paid request|hiring/i.test(
      `${opportunity.painPoint} ${opportunity.evidenceSummary}`,
    )
  )
    return 1;
  if (opportunity?.opportunityType === "partner_overflow") return 2;
  if (opportunity?.stage === "replied") return 3;
  if (
    opportunity &&
    [
      "discovery_booked",
      "discovery_complete",
      "proposal_drafting",
      "proposal_sent",
    ].includes(opportunity.stage)
  )
    return 4;
  if (new Date(item.dueAt) <= now || item.commitmentType === "follow_up")
    return 5;
  if (item.partnerId) return 6;
  if (item.assetId) return 7;
  return 8;
}
function commitmentReason(
  item: Awaited<ReturnType<typeof readAcquisitionData>>["commitments"][number],
  opportunity?: Awaited<
    ReturnType<typeof readAcquisitionData>
  >["opportunities"][number],
) {
  if (
    opportunity &&
    /rfp|paid request|hiring/i.test(
      `${opportunity.painPoint} ${opportunity.evidenceSummary}`,
    )
  )
    return "Priority 1 · Explicit paid request";
  if (opportunity?.opportunityType === "partner_overflow")
    return "Priority 2 · Partner or overflow request";
  if (opportunity?.stage === "replied") return "Priority 3 · Buyer replied";
  if (
    opportunity &&
    [
      "discovery_booked",
      "discovery_complete",
      "proposal_drafting",
      "proposal_sent",
    ].includes(opportunity.stage)
  )
    return "Priority 4 · Discovery or proposal movement";
  if (item.commitmentType === "follow_up") return "Priority 5 · Due follow-up";
  if (item.partnerId) return "Priority 6 · Weekly partner target";
  if (item.assetId) return "Priority 7 · Weekly proof target";
  return "Scheduled commitment";
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "attention" | "risk" | "success";
}) {
  const colors =
    tone === "risk"
      ? "text-red-700"
      : tone === "attention"
        ? "text-amber-700"
        : tone === "success"
          ? "text-emerald-700"
          : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-cream-dim">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${colors}`}>{value}</p>
      <p className="mt-1 text-xs text-cream-muted">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-cream-muted">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Progress({
  label,
  value,
  target,
  href,
}: {
  label: string;
  value: number;
  target: number;
  href: string;
}) {
  const width = Math.min(100, Math.round((value / target) * 100));
  return (
    <Link href={href} className="mb-4 block last:mb-0">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-cream-muted">
          {value}/{target}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-elevated">
        <div className="h-full bg-accent" style={{ width: `${width}%` }} />
      </div>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-cream-muted">{children}</p>;
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  }).format(new Date(value));
}
function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
function businessHoursElapsed(start: Date, end: Date) {
  let hours = 0;
  const cursor = new Date(start);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  while (cursor < end && hours < 1000) {
    const parts = Object.fromEntries(
      formatter.formatToParts(cursor).map((part) => [part.type, part.value]),
    );
    const hour = Number(parts.hour);
    if (!["Sat", "Sun"].includes(parts.weekday) && hour >= 9 && hour < 17)
      hours += 1;
    cursor.setHours(cursor.getHours() + 1);
  }
  return hours;
}
