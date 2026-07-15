type FreshnessCarrier = {
  generatedAt?: string | null;
  status?: { generatedAt?: string | null } | null;
  digest?: { generatedAt?: string | null } | null;
};

export function leadSourceGeneratedAt(source: FreshnessCarrier | null) {
  if (!source) return "";
  return (
    source.status?.generatedAt ||
    source.digest?.generatedAt ||
    source.generatedAt ||
    ""
  );
}

export function assertLeadSourceIsNotOlder({
  sourceId,
  incomingGeneratedAt,
  existingGeneratedAt,
}: {
  sourceId: string;
  incomingGeneratedAt: string | null | undefined;
  existingGeneratedAt: string | null | undefined;
}) {
  const incoming = timestampValue(incomingGeneratedAt);
  const existing = timestampValue(existingGeneratedAt);
  if (!existing) return;
  if (!incoming) {
    throw new Error(
      `Refusing to replace ${sourceId} leads generated at ${formatTimestamp(existing)} with an undated digest.`,
    );
  }
  if (incoming < existing) {
    throw new Error(
      `Refusing to replace ${sourceId} leads generated at ${formatTimestamp(existing)} with older research from ${formatTimestamp(incoming)}.`,
    );
  }
}

export function freshestLeadSource<T extends FreshnessCarrier>(
  sources: Array<T | null | undefined>,
) {
  return sources.filter((source): source is T => Boolean(source)).sort((a, b) => {
    return (
      timestampValue(leadSourceGeneratedAt(b)) -
      timestampValue(leadSourceGeneratedAt(a))
    );
  })[0] ?? null;
}

export function automationRefreshMode(nodeEnv: string | undefined) {
  return nodeEnv === "production" ? "published" : "local";
}

export function isLeadReadyToPursue(lead: {
  sourceKind?: string;
  buyerQueue?: string;
  intent?: string;
  consultingFit?: string;
  askQuote?: string | null;
  replyAngle?: string | null;
  recommendedAction?: string;
  score?: string;
}) {
  if (lead.sourceKind === "reddit") {
    return (
      lead.buyerQueue === "active_lead" &&
      lead.intent === "hiring_or_paid_help" &&
      lead.consultingFit === "yes" &&
      Boolean(lead.askQuote?.trim()) &&
      Boolean(lead.replyAngle?.trim())
    );
  }
  if (lead.buyerQueue === "active_lead") return true;
  if (["dm", "dm_if_engaged", "apply"].includes(lead.recommendedAction ?? ""))
    return true;
  return false;
}

function timestampValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimestamp(value: number) {
  return new Date(value).toISOString();
}
