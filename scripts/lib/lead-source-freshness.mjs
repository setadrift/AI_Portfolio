export function assertLeadSourceIsNotOlder({
  sourceId,
  incomingGeneratedAt,
  existingGeneratedAt,
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

function timestampValue(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTimestamp(value) {
  return new Date(value).toISOString();
}
