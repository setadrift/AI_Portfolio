export function assertLeadSourceIsNotOlder({
  sourceId,
  incomingGeneratedAt,
  existingGeneratedAt,
}) {
  const incoming = timestampValue(incomingGeneratedAt);
  const existing = timestampValue(existingGeneratedAt);
  if (incomingGeneratedAt && incoming === null) {
    throw new Error(`Refusing to publish ${sourceId} leads with an invalid incoming timestamp.`);
  }
  if (existingGeneratedAt && existing === null) {
    throw new Error(`Refusing to replace ${sourceId} leads because the existing source has an invalid existing timestamp.`);
  }
  if (existing === null) return;
  if (incoming === null) {
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
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatTimestamp(value) {
  return new Date(value).toISOString();
}
