import { readAcquisitionData } from "@/lib/portal/admin/acquisition-db";
import { acquisitionMetrics } from "@/lib/portal/admin/consulting-metrics";
import { stageLabel } from "@/lib/portal/admin/acquisition";
import { readLeadDashboardData } from "@/lib/portal/admin/leads";
import WeeklyReviewForm from "./WeeklyReviewForm";

export const runtime = "nodejs";

export default async function MetricsPage() {
  const [data, discovery] = await Promise.all([
    readAcquisitionData(),
    readLeadDashboardData(),
  ]);
  const metrics = acquisitionMetrics(data);
  const outbound = data.activities.filter((item) =>
    ["email", "dm", "comment", "application"].includes(item.activityType),
  );
  const replies = data.activities.filter(
    (item) => item.activityType === "reply",
  );
  const promoted = Object.values(discovery.leadStates).filter(
    (item) => item.action === "converted",
  ).length;
  const dismissed = Object.values(discovery.leadStates).filter(
    (item) => item.action === "dismissed",
  );
  const offers = data.offers
    .map((offer) => ({
      label: offer.name,
      rows: data.opportunities.filter(
        (item) => item.primaryOfferId === offer.id,
      ),
    }))
    .filter((item) => item.rows.length);
  const sources = Object.entries(
    Object.groupBy(
      data.opportunities,
      (item) => item.sourceFamily || "unknown",
    ),
  );
  const weighted = Object.entries(
    data.opportunities
      .filter(
        (item) =>
          !["won", "lost", "nurture"].includes(item.stage) &&
          item.estimatedValueCents != null &&
          item.currencyCode,
      )
      .reduce<Record<string, number>>((sum, item) => {
        sum[item.currencyCode!] =
          (sum[item.currencyCode!] || 0) +
          (item.estimatedValueCents! * (item.probabilityPercent ?? 0)) / 100;
        return sum;
      }, {}),
  );
  const snapshot = data.weeklySnapshots.find(
    (item) => item.weekStart === metrics.weekStart,
  );
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-cream-dim">
          Weekly review
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">
          Acquisition metrics
        </h1>
        <p className="mt-1 text-sm text-cream-muted">
          Derived from stored opportunities and activities for the week
          beginning {metrics.weekStart}.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Partner contacts", metrics.partnerContacts, metrics.partnerTarget],
          ["Warm conversations", metrics.warmConversations, metrics.warmTarget],
          [
            "Proof assets advanced",
            metrics.proofAssetsAdvanced,
            metrics.proofTarget,
          ],
        ].map(([label, value, target]) => (
          <article
            key={String(label)}
            className="rounded-md border border-border bg-surface p-4"
          >
            <p className="text-xs uppercase tracking-wide text-cream-dim">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {value}{" "}
              <span className="text-sm font-normal text-cream-muted">
                / {target}
              </span>
            </p>
          </article>
        ))}
      </section>
      <section className="rounded-md border border-border bg-surface p-4">
        <h2 className="font-semibold text-foreground">Funnel conversion</h2>
        <p className="mt-1 text-sm text-cream-muted">
          Every rate shows its numerator and denominator.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.funnel.map((row) => (
            <article
              key={`${row.from}-${row.to}`}
              className="rounded border border-border p-3"
            >
              <p className="text-xs text-cream-dim">
                {stageLabel(row.from)} → {stageLabel(row.to)}
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {Math.round(row.rate * 100)}%
              </p>
              <p className="text-xs text-cream-muted">
                {row.numerator} reached / {row.denominator} eligible
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-semibold text-foreground">
            Open pipeline by currency
          </h2>
          <div className="mt-3 space-y-2">
            {Object.entries(metrics.pipelineByCurrency).map(
              ([currency, cents]) => (
                <div key={currency} className="flex justify-between text-sm">
                  <span className="text-cream-muted">{currency}</span>
                  <span className="font-semibold text-foreground">
                    {(cents / 100).toLocaleString()}
                  </span>
                </div>
              ),
            )}
            {!Object.keys(metrics.pipelineByCurrency).length ? (
              <p className="text-sm text-cream-muted">
                No valued open opportunities.
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-cream-dim">
            Currencies are intentionally not combined.
          </p>
        </section>
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-semibold text-foreground">
            Responsiveness and quality
          </h2>
          <p className="mt-3 text-sm text-cream-muted">
            Median first outreach:{" "}
            <span className="text-foreground">
              {metrics.medianResponseHours == null
                ? "No denominator yet"
                : `${metrics.medianResponseHours.toFixed(1)} hours`}
            </span>
          </p>
          <p className="mt-2 text-sm text-cream-muted">
            Overdue commitments:{" "}
            <span className="text-foreground">
              {metrics.overdueCommitments}
            </span>
          </p>
          <p className="mt-2 text-sm text-cream-muted">
            Due today:{" "}
            <span className="text-foreground">{metrics.dueToday}</span>
          </p>
        </section>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Source funnel"
          rows={sources.map(([label, rows]) => ({
            label,
            total: rows?.length || 0,
            proposals:
              rows?.filter((item) =>
                ["proposal_sent", "won"].includes(item.stage),
              ).length || 0,
            wins: rows?.filter((item) => item.stage === "won").length || 0,
            wonValue: valuesByCurrency(
              rows?.filter((item) => item.stage === "won") || [],
            ),
          }))}
        />
        <Breakdown
          title="Offer funnel"
          rows={offers.map(({ label, rows }) => ({
            label,
            total: rows.length,
            proposals: rows.filter((item) =>
              ["proposal_sent", "won"].includes(item.stage),
            ).length,
            wins: rows.filter((item) => item.stage === "won").length,
            wonValue: valuesByCurrency(
              rows.filter((item) => item.stage === "won"),
            ),
          }))}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-semibold">Activity to outcome</h2>
          <p className="mt-3 text-2xl font-semibold">
            {outbound.length
              ? Math.round((replies.length / outbound.length) * 100)
              : 0}
            %
          </p>
          <p className="text-sm text-cream-muted">
            {replies.length} replies / {outbound.length} recorded outbound
            activities
          </p>
        </article>
        <article className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-semibold">Discovery quality</h2>
          <p className="mt-3 text-sm text-cream-muted">
            {promoted} promoted · {dismissed.length} dismissed
          </p>
          <p className="mt-2 text-xs text-cream-dim">
            Dismissal reasons remain in the lead-review notes for scanner
            tuning.
          </p>
        </article>
        <article className="rounded-md border border-border bg-surface p-4">
          <h2 className="font-semibold">Weighted pipeline</h2>
          {weighted.map(([currency, cents]) => (
            <p key={currency} className="mt-2 text-sm">
              <span className="font-semibold">
                {currency} {(cents / 100).toLocaleString()}
              </span>{" "}
              <span className="text-cream-muted">probability weighted</span>
            </p>
          ))}
          {!weighted.length ? (
            <p className="mt-2 text-sm text-cream-muted">
              No valued probability-weighted rows.
            </p>
          ) : null}
        </article>
      </section>
      <WeeklyReviewForm
        weekStart={metrics.weekStart}
        initialLesson={snapshot?.lesson || ""}
        initialOfferId={String(snapshot?.metrics.primaryOfferId || "")}
        offers={data.offers}
        metrics={{
          partnerContacts: metrics.partnerContacts,
          warmConversations: metrics.warmConversations,
          proofAssetsAdvanced: metrics.proofAssetsAdvanced,
          funnel: metrics.funnel,
          pipelineByCurrency: metrics.pipelineByCurrency,
        }}
      />
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    total: number;
    proposals: number;
    wins: number;
    wonValue: Record<string, number>;
  }>;
}) {
  return (
    <section className="rounded-md border border-border bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto] gap-3 py-2 text-sm"
          >
            <span className="text-cream-muted">{stageLabel(row.label)}</span>
            <span>
              {row.proposals} proposals / {row.total} opportunities · {row.wins}{" "}
              wins
              {Object.entries(row.wonValue).map(
                ([currency, cents]) =>
                  ` · ${currency} ${(cents / 100).toLocaleString()} won`,
              )}
            </span>
          </div>
        ))}
        {!rows.length ? (
          <p className="text-sm text-cream-muted">No denominator yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function valuesByCurrency(
  rows: Array<{
    estimatedValueCents: number | null;
    currencyCode: string | null;
  }>,
) {
  return rows.reduce<Record<string, number>>((totals, row) => {
    if (row.estimatedValueCents != null && row.currencyCode)
      totals[row.currencyCode] =
        (totals[row.currencyCode] || 0) + row.estimatedValueCents;
    return totals;
  }, {});
}
