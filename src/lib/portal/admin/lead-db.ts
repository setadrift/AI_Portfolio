import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  LeadDigest,
  LeadRunStatus,
  LeadSourceDiagnostic,
  LeadSourceDigest,
  LeadSourceId,
  RedditLead,
  StoredLeadState,
} from "./leads";

interface PublishedLeadSourceForDb {
  id: LeadSourceId;
  label: string;
  description: string;
  fileName: string;
  markdown: string;
  status: LeadRunStatus | null;
  diagnostic: LeadSourceDiagnostic;
  digest: LeadDigest;
}

interface LeadStateUpdate {
  sourceId: LeadSourceId;
  leadKey: string;
  queue: string;
  action: string;
  commented: boolean;
  dmSent: boolean;
  dismissed: boolean;
  notes: string;
}

type AdminLeadSourceRow = {
  id: LeadSourceId;
  label: string;
  description: string;
  file_name: string;
  markdown: string;
  status: LeadRunStatus | null;
  diagnostic: LeadSourceDiagnostic | null;
};

type AdminLeadStateRow = {
  source_id: LeadSourceId;
  lead_key: string;
  queue: StoredLeadState["queue"];
  action: StoredLeadState["action"];
  commented_at: string | null;
  dm_sent_at: string | null;
  dismissed_at: string | null;
  notes: string;
  updated_at: string;
};

type AdminLeadRow = {
  source_id: LeadSourceId;
  lead_key: string;
  score: number | null;
  score_label: string;
  source_label: string;
  source_kind: string;
  posted_date: string | null;
  discovered_date: string | null;
  title: string;
  url: string;
  author: string;
  category: string;
  recommended_action: string;
  reason: string;
  suggested_comment: string;
  suggested_dm: string;
  payload: Partial<RedditLead> | null;
  last_seen_at: string;
  first_seen_scan_mode: string | null;
  last_seen_scan_mode: string | null;
  last_seen_scan_batch: string | null;
  active: boolean;
};

let cachedClient: SupabaseClient | null = null;

export function isLeadDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && supabaseAdminKey());
}

function adminClient() {
  const adminKey = supabaseAdminKey();
  if (!process.env.SUPABASE_URL || !adminKey) return null;
  cachedClient ??= createClient(process.env.SUPABASE_URL, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}

function supabaseAdminKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

export async function readLeadSourcesFromDatabase(
  parseSource: (source: {
    id: LeadSourceId;
    label: string;
    description: string;
    fileName: string;
    markdown: string;
    status: LeadRunStatus | null;
  }) => LeadSourceDigest,
) {
  const supabase = adminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admin_lead_sources")
    .select("id,label,description,file_name,markdown,status,diagnostic")
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("Failed to read Supabase admin lead sources", { error: error.message });
    return [];
  }

  return ((data ?? []) as AdminLeadSourceRow[]).map((row) => {
    const parsed = parseSource({
      id: row.id,
      label: row.label,
      description: row.description,
      fileName: row.file_name,
      markdown: row.markdown,
      status: row.status,
    });
    return parsed;
  });
}

export async function persistLeadSourcesToDatabase(sources: PublishedLeadSourceForDb[]) {
  const supabase = adminClient();
  if (!supabase || sources.length === 0) return;

  const sourceRows = sources.map((source) => ({
    id: source.id,
    label: source.label,
    description: source.description,
    file_name: source.fileName,
    markdown: source.markdown,
    status: source.status,
    diagnostic: source.diagnostic,
    generated_at: normalizeTimestamp(source.digest.generatedAt),
  }));

  const { error: sourceError } = await supabase.from("admin_lead_sources").upsert(sourceRows, {
    onConflict: "id",
  });

  if (sourceError) {
    console.warn("Failed to persist Supabase admin lead sources", { error: sourceError.message });
    return;
  }

  for (const source of sources) {
    await persistLeadRows(supabase, source);
  }
}

async function persistLeadRows(supabase: SupabaseClient, source: PublishedLeadSourceForDb) {
  if (shouldReplaceMissingLeads(source)) {
    const leadKeys = source.digest.leads.map((lead) => leadKeyForDatabase(lead));
    const staleLeadQuery = supabase
      .from("admin_leads")
      .update({ active: false })
      .eq("source_id", source.id);
    const { error: deactivateError } =
      leadKeys.length > 0
        ? await staleLeadQuery.not("lead_key", "in", `(${leadKeys.map(quotePostgrestValue).join(",")})`)
        : await staleLeadQuery;

    if (deactivateError) {
      console.warn("Failed to deactivate stale Supabase admin leads", {
        source: source.id,
        error: deactivateError.message,
      });
    }
  }

  const existingLeadMeta = await readExistingLeadMeta(
    supabase,
    source.id,
    source.digest.leads.map((lead) => leadKeyForDatabase(lead)),
  );
  const scanMode = source.status?.scanMode ?? null;
  const scanBatch = scanBatchId(source);
  const leadRows = source.digest.leads.map((lead) => ({
    source_id: source.id,
    lead_key: leadKeyForDatabase(lead),
    score: Number.parseInt(lead.score, 10) || null,
    score_label: lead.score,
    source_label: lead.sourceLabel,
    source_kind: lead.sourceKind,
    posted_date: normalizeDate(lead.postedDate),
    discovered_date: normalizeDate(lead.discoveredDate),
    title: lead.title,
    url: lead.url,
    author: lead.author,
    category: lead.category,
    recommended_action: lead.recommendedAction,
    reason: lead.reason,
    suggested_comment: lead.suggestedComment,
    suggested_dm: lead.suggestedDm,
    payload: lead,
    last_seen_at: new Date().toISOString(),
    first_seen_scan_mode: existingLeadMeta.get(leadKeyForDatabase(lead))?.first_seen_scan_mode ?? scanMode,
    last_seen_scan_mode: scanMode,
    last_seen_scan_batch: scanBatch,
    active: true,
  }));

  if (leadRows.length === 0) return;

  const { error } = await supabase.from("admin_leads").upsert(leadRows, {
    onConflict: "source_id,lead_key",
  });

  if (error) {
    console.warn("Failed to persist Supabase admin leads", {
      source: source.id,
      error: error.message,
    });
  }
}

function shouldReplaceMissingLeads(source: PublishedLeadSourceForDb) {
  return source.id !== "reddit" || source.status?.ingestionMode === "cleanup";
}

export async function readLeadStatesFromDatabase(sources: LeadSourceDigest[]) {
  const supabase = adminClient();
  if (!supabase) return {};

  const sourceIds = sources.map((source) => source.id);
  if (sourceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("admin_lead_states")
    .select("source_id,lead_key,queue,action,commented_at,dm_sent_at,dismissed_at,notes,updated_at")
    .in("source_id", sourceIds);

  if (error) {
    console.warn("Failed to read Supabase admin lead states", { error: error.message });
    return {};
  }

  return Object.fromEntries(
    ((data ?? []) as AdminLeadStateRow[]).map((row) => [
      leadStateKeyForDatabase(row.source_id, row.lead_key),
      {
        queue: row.queue,
        action: row.action,
        commented: Boolean(row.commented_at) || row.action === "commented",
        dmSent: Boolean(row.dm_sent_at) || row.action === "dm_sent",
        dismissed: Boolean(row.dismissed_at) || row.action === "dismissed",
        notes: row.notes,
        updatedAt: row.updated_at,
      },
    ]),
  );
}

export async function readStoredLeadsFromDatabase(sourceIds: LeadSourceId[]) {
  const supabase = adminClient();
  if (!supabase || sourceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("admin_leads")
    .select(
      [
        "source_id",
        "lead_key",
        "score",
        "score_label",
        "source_label",
        "source_kind",
        "posted_date",
        "discovered_date",
        "title",
        "url",
        "author",
        "category",
        "recommended_action",
        "reason",
        "suggested_comment",
        "suggested_dm",
        "payload",
        "last_seen_at",
        "first_seen_scan_mode",
        "last_seen_scan_mode",
        "last_seen_scan_batch",
        "active",
      ].join(","),
    )
    .in("source_id", sourceIds)
    .eq("active", true)
    .order("posted_date", { ascending: false, nullsFirst: false })
    .order("last_seen_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.warn("Failed to read Supabase admin leads", { error: error.message });
    return {};
  }

  return ((data ?? []) as unknown as AdminLeadRow[]).reduce(
    (acc, row) => {
      acc[row.source_id] ??= [];
      acc[row.source_id]?.push(leadFromRow(row));
      return acc;
    },
    {} as Partial<Record<LeadSourceId, RedditLead[]>>,
  );
}

async function readExistingLeadMeta(supabase: SupabaseClient, sourceId: LeadSourceId, leadKeys: string[]) {
  if (leadKeys.length === 0) return new Map<string, { first_seen_scan_mode: string | null }>();

  const { data, error } = await supabase
    .from("admin_leads")
    .select("lead_key,first_seen_scan_mode")
    .eq("source_id", sourceId)
    .in("lead_key", leadKeys);

  if (error) return new Map<string, { first_seen_scan_mode: string | null }>();
  return new Map(
    ((data ?? []) as Array<{ lead_key: string; first_seen_scan_mode: string | null }>).map((row) => [
      row.lead_key,
      { first_seen_scan_mode: row.first_seen_scan_mode },
    ]),
  );
}

function scanBatchId(source: PublishedLeadSourceForDb) {
  return [
    source.id,
    source.status?.scanMode ?? "unknown",
    source.status?.generatedAt ?? source.digest.generatedAt ?? source.fileName,
  ].join(":");
}

export async function persistLeadStatesToDatabase(updates: LeadStateUpdate[]) {
  const supabase = adminClient();
  if (!supabase || updates.length === 0) return { ok: false, skipped: true };

  const savedAt = new Date().toISOString();
  const existingStates = await readExistingLeadStateTimestamps(supabase, updates);
  const { error } = await supabase.from("admin_lead_states").upsert(
    updates.map((update) => {
      const existing = existingStates.get(leadStateKeyForDatabase(update.sourceId, update.leadKey));
      return {
        source_id: update.sourceId,
        lead_key: update.leadKey,
        queue: update.queue,
        action: update.action,
        commented_at: update.commented ? existing?.commented_at ?? savedAt : null,
        dm_sent_at: update.dmSent ? existing?.dm_sent_at ?? savedAt : null,
        dismissed_at: update.dismissed ? existing?.dismissed_at ?? savedAt : null,
        notes: update.notes,
      };
    }),
    { onConflict: "source_id,lead_key" },
  );

  if (error) {
    console.warn("Failed to persist Supabase admin lead states", { error: error.message });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function readExistingLeadStateTimestamps(supabase: SupabaseClient, updates: LeadStateUpdate[]) {
  const keysBySource = updates.reduce(
    (acc, update) => {
      acc[update.sourceId] ??= new Set<string>();
      acc[update.sourceId]?.add(update.leadKey);
      return acc;
    },
    {} as Partial<Record<LeadSourceId, Set<string>>>,
  );
  const rows: Array<{
    source_id: LeadSourceId;
    lead_key: string;
    commented_at: string | null;
    dm_sent_at: string | null;
    dismissed_at: string | null;
  }> = [];

  for (const [sourceId, leadKeys] of Object.entries(keysBySource) as Array<[LeadSourceId, Set<string>]>) {
    const { data, error } = await supabase
      .from("admin_lead_states")
      .select("source_id,lead_key,commented_at,dm_sent_at,dismissed_at")
      .eq("source_id", sourceId)
      .in("lead_key", [...leadKeys]);
    if (error) continue;
    rows.push(...((data ?? []) as typeof rows));
  }

  return new Map(rows.map((row) => [leadStateKeyForDatabase(row.source_id, row.lead_key), row]));
}

export function leadKeyForDatabase(lead: RedditLead) {
  return lead.url || `${lead.subreddit}:${lead.title}`;
}

export function leadStateKeyForDatabase(sourceId: LeadSourceId, leadKey: string) {
  return `${sourceId}:${leadKey}`;
}

export function stateStorageKey(sourceId: LeadSourceId, leadKey: string) {
  return leadStateKeyForDatabase(sourceId, leadKey);
}

function leadFromRow(row: AdminLeadRow): RedditLead {
  const payload = row.payload ?? {};
  return {
    score: payload.score ?? row.score_label ?? (row.score ? `${row.score}/5` : ""),
    source: payload.source ?? row.source_label,
    sourceLabel: payload.sourceLabel ?? row.source_label,
    sourceKind: row.source_id,
    sourceDate: payload.sourceDate ?? row.posted_date ?? row.discovered_date ?? "",
    postedDate: payload.postedDate ?? row.posted_date ?? "",
    discoveredDate: payload.discoveredDate ?? row.discovered_date ?? "",
    subreddit: payload.subreddit ?? row.source_label.replace(/^r\//i, ""),
    title: payload.title ?? row.title,
    url: payload.url ?? row.url,
    author: payload.author ?? row.author,
    category: payload.category ?? row.category,
    leadType: payload.leadType ?? "",
    vertical: payload.vertical ?? "",
    failureMode: payload.failureMode ?? "",
    outreachPosture: payload.outreachPosture ?? "",
    freeToPursuePath: payload.freeToPursuePath ?? "",
    recommendedAction: payload.recommendedAction ?? row.recommended_action,
    commentContext: payload.commentContext ?? "",
    sourceQuery: payload.sourceQuery ?? "",
    sourcePatternFamily: payload.sourcePatternFamily ?? "",
    sourceVertical: payload.sourceVertical ?? "",
    matchedLeadTypes: payload.matchedLeadTypes ?? "",
    matchEvidence: payload.matchEvidence ?? "",
    sourceFamily: payload.sourceFamily ?? "",
    buyerSituation: payload.buyerSituation ?? "",
    buyerQueue: payload.buyerQueue ?? "",
    offerMatch: payload.offerMatch ?? "",
    businessMaturityScore: payload.businessMaturityScore ?? "",
    painSeverityScore: payload.painSeverityScore ?? "",
    hiringLikelihoodScore: payload.hiringLikelihoodScore ?? "",
    aiLeverageScore: payload.aiLeverageScore ?? "",
    commercialFitScore: payload.commercialFitScore ?? "",
    duncanFitScore: payload.duncanFitScore ?? "",
    reachabilityScore: payload.reachabilityScore ?? "",
    freshnessScore: payload.freshnessScore ?? "",
    confidenceScore: payload.confidenceScore ?? "",
    evidenceSummary: payload.evidenceSummary ?? "",
    explicitEvidence: payload.explicitEvidence ?? "",
    inferredEvidence: payload.inferredEvidence ?? "",
    missingEvidence: payload.missingEvidence ?? "",
    sourceQuoteOrSnippet: payload.sourceQuoteOrSnippet ?? "",
    evidenceUrl: payload.evidenceUrl ?? "",
    responsePath: payload.responsePath ?? "",
    nextStep: payload.nextStep ?? "",
    dismissalReason: payload.dismissalReason ?? "",
    relatedSources: payload.relatedSources ?? "",
    duplicateOf: payload.duplicateOf ?? "",
    lastVerifiedAt: payload.lastVerifiedAt ?? "",
    reason: payload.reason ?? row.reason,
    suggestedComment: payload.suggestedComment ?? row.suggested_comment,
    suggestedDm: payload.suggestedDm ?? row.suggested_dm,
  };
}

function normalizeTimestamp(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDate(value: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
