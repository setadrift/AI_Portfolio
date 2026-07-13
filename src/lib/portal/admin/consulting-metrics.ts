import type {
  AcquisitionData,
  AcquisitionMetrics,
  ConsultingActivityRecord,
  ConsultingOpportunityRecord,
} from "./acquisition";

export function startOfTorontoWeek(now = new Date()) {
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Toronto" }),
  );
  const day = local.getDay();
  const distance = day === 0 ? 6 : day - 1;
  local.setDate(local.getDate() - distance);
  local.setHours(0, 0, 0, 0);
  return local;
}

export function acquisitionMetrics(
  data: AcquisitionData,
  now = new Date(),
): AcquisitionMetrics {
  const weekStart = startOfTorontoWeek(now);
  const weekActivities = data.activities.filter(
    (activity) => new Date(activity.occurredAt) >= weekStart,
  );
  const weekAssets = data.proofAssets.filter(
    (asset) =>
      !["idea", "retired"].includes(asset.stage) &&
      new Date(asset.updatedAt) >= weekStart,
  );
  const openCommitments = data.commitments.filter(
    (item) => !["done", "cancelled"].includes(item.status),
  );
  const today = now.toISOString().slice(0, 10);
  const pipelineByCurrency: Record<string, number> = {};
  for (const opportunity of data.opportunities.filter(
    (item) => !["won", "lost"].includes(item.stage),
  )) {
    if (opportunity.estimatedValueCents == null || !opportunity.currencyCode)
      continue;
    pipelineByCurrency[opportunity.currencyCode] =
      (pipelineByCurrency[opportunity.currencyCode] ?? 0) +
      opportunity.estimatedValueCents;
  }

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    partnerContacts: weekActivities.filter(
      (item) =>
        item.partnerId &&
        ["dm", "email", "call", "referral"].includes(item.activityType),
    ).length,
    warmConversations: weekActivities.filter(
      (item) =>
        item.activityType === "warm_intro" ||
        item.outcome === "warm_conversation",
    ).length,
    proofAssetsAdvanced: weekAssets.length,
    partnerTarget: 5,
    warmTarget: 3,
    proofTarget: 1,
    overdueCommitments: openCommitments.filter(
      (item) => item.dueAt.slice(0, 10) < today,
    ).length,
    dueToday: openCommitments.filter(
      (item) => item.dueAt.slice(0, 10) === today,
    ).length,
    pipelineByCurrency,
    stageCounts: countBy(data.opportunities, (item) => item.stage),
    funnel: funnelRows(data.opportunities, data.activities),
    medianResponseHours: medianResponseHours(
      data.opportunities,
      data.activities,
    ),
  };
}

function funnelRows(
  opportunities: ConsultingOpportunityRecord[],
  activities: ConsultingActivityRecord[],
) {
  const stages = [
    ["qualified", "contacted"],
    ["contacted", "replied"],
    ["replied", "discovery_booked"],
    ["discovery_booked", "proposal_sent"],
    ["proposal_sent", "won"],
  ] as const;
  const order = [
    "new",
    "qualified",
    "ready_to_contact",
    "contacted",
    "replied",
    "discovery_booked",
    "discovery_complete",
    "proposal_drafting",
    "proposal_sent",
    "won",
  ];
  const reached = (stage: string) =>
    opportunities.filter((item) => {
      if (
        order.includes(item.stage) &&
        order.indexOf(item.stage) >= order.indexOf(stage)
      )
        return true;
      const related = activities.filter(
        (activity) => activity.opportunityId === item.id,
      );
      if (stage === "qualified")
        return (
          item.stage !== "new" ||
          related.some((activity) => activity.activityType === "qualified")
        );
      if (stage === "contacted")
        return related.some((activity) =>
          ["comment", "dm", "email", "application"].includes(
            activity.activityType,
          ),
        );
      if (stage === "replied")
        return related.some((activity) => activity.activityType === "reply");
      if (stage === "discovery_booked")
        return (
          Boolean(item.discoveryAt) ||
          related.some((activity) =>
            /to discovery_booked/i.test(activity.summary),
          )
        );
      if (stage === "proposal_sent")
        return (
          Boolean(item.proposalSentAt) ||
          related.some(
            (activity) =>
              activity.activityType === "proposal" ||
              /to proposal_sent/i.test(activity.summary),
          )
        );
      if (stage === "won")
        return (
          item.stage === "won" ||
          related.some((activity) =>
            /to won|opportunity won/i.test(activity.summary),
          )
        );
      return related.some(
        (activity) =>
          activity.activityType === "stage_change" &&
          activity.summary.toLowerCase().includes(`to ${stage}`),
      );
    }).length;
  return stages.map(([from, to]) => {
    const denominator = reached(from);
    const numerator = reached(to);
    return {
      from,
      to,
      numerator,
      denominator,
      rate: denominator ? numerator / denominator : 0,
    };
  });
}

function medianResponseHours(
  opportunities: ConsultingOpportunityRecord[],
  activities: ConsultingActivityRecord[],
) {
  const values = opportunities
    .flatMap((opportunity) => {
      const first = activities
        .filter(
          (activity) =>
            activity.opportunityId === opportunity.id &&
            ["comment", "dm", "email", "application"].includes(
              activity.activityType,
            ),
        )
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
      if (!first) return [];
      const hours =
        (new Date(first.occurredAt).getTime() -
          new Date(opportunity.createdAt).getTime()) /
        3_600_000;
      return hours >= 0 ? [hours] : [];
    })
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2
    ? values[middle]
    : (values[middle - 1] + values[middle]) / 2;
}

function countBy<T>(values: T[], key: (value: T) => string) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const name = key(value);
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
}
