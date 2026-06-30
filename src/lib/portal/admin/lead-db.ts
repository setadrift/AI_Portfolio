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
  notes: string;
  updated_at: string;
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
    return {
      ...parsed,
      diagnostic: row.diagnostic ?? parsed.diagnostic,
    };
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

export async function readLeadStatesFromDatabase(sources: LeadSourceDigest[]) {
  const supabase = adminClient();
  if (!supabase) return {};

  const sourceIds = sources.map((source) => source.id);
  if (sourceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("admin_lead_states")
    .select("source_id,lead_key,queue,action,notes,updated_at")
    .in("source_id", sourceIds);

  if (error) {
    console.warn("Failed to read Supabase admin lead states", { error: error.message });
    return {};
  }

  return Object.fromEntries(
    ((data ?? []) as AdminLeadStateRow[]).map((row) => [
      row.lead_key,
      {
        queue: row.queue,
        action: row.action,
        notes: row.notes,
        updatedAt: row.updated_at,
      },
    ]),
  );
}

export async function persistLeadStatesToDatabase(updates: LeadStateUpdate[]) {
  const supabase = adminClient();
  if (!supabase || updates.length === 0) return { ok: false, skipped: true };

  const { error } = await supabase.from("admin_lead_states").upsert(
    updates.map((update) => ({
      source_id: update.sourceId,
      lead_key: update.leadKey,
      queue: update.queue,
      action: update.action,
      notes: update.notes,
    })),
    { onConflict: "source_id,lead_key" },
  );

  if (error) {
    console.warn("Failed to persist Supabase admin lead states", { error: error.message });
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function leadKeyForDatabase(lead: RedditLead) {
  return lead.url || `${lead.subreddit}:${lead.title}`;
}

export function stateStorageKey(sourceId: LeadSourceId, leadKey: string) {
  return `${sourceId}:${leadKey}`;
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
