import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

export async function persistAdminLeadBundleToSupabase(payload) {
  const sources = payload.sources ?? (payload.id ? [payload] : []);
  if (!sources.length) return { ok: false, skipped: true, reason: "no-sources" };

  const supabase = await createAdminClient();
  if (!supabase) return { ok: false, skipped: true, reason: "not-configured" };

  const sourceRows = sources.map((source) => ({
    id: source.id,
    label: source.label,
    description: source.description ?? "",
    file_name: source.fileName ?? "",
    markdown: source.markdown ?? "",
    status: source.status ?? null,
    diagnostic: sourceDiagnostic(source),
    generated_at: normalizeTimestamp(metadataValue(source.markdown ?? "", "Generated")),
  }));

  const { error: sourceError } = await supabase.from("admin_lead_sources").upsert(sourceRows, {
    onConflict: "id",
  });
  if (sourceError) return { ok: false, error: sourceError.message };

  for (const source of sources) {
    const result = await persistSourceLeads(supabase, source);
    if (!result.ok) return result;
  }

  return { ok: true, sources: sources.length };
}

async function persistSourceLeads(supabase, source) {
  const leads = parseLeads(source.markdown ?? "", source.id);
  const leadKeys = leads.map((lead) => lead.lead_key);
  const staleLeadQuery = supabase
    .from("admin_leads")
    .update({ active: false })
    .eq("source_id", source.id);
  const { error: deactivateError } =
    leadKeys.length > 0
      ? await staleLeadQuery.not("lead_key", "in", `(${leadKeys.map(quotePostgrestValue).join(",")})`)
      : await staleLeadQuery;

  if (deactivateError) return { ok: false, error: deactivateError.message };
  if (!leads.length) return { ok: true };

  const { error } = await supabase.from("admin_leads").upsert(leads, {
    onConflict: "source_id,lead_key",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function parseLeads(markdown, sourceId) {
  return leadBlocks(markdown, { includeWatch: sourceId === "reddit" }).map((block) => {
    const heading = block.match(/^### ([1-5]\/5) - (.+?) - (.+)$/m);
    const sourceLabel = heading?.[2]?.trim() ?? "";
    const lead = {
      score: heading?.[1] ?? "",
      source: sourceLabel,
      sourceLabel,
      sourceKind: sourceId,
      sourceDate: "",
      postedDate: normalizeDateOnly(
        bulletValue(block, "Posted date") ||
          bulletValue(block, "Post date") ||
          bulletValue(block, "Published date") ||
          bulletValue(block, "Published at") ||
          bulletValue(block, "Source date"),
      ),
      discoveredDate: normalizeDateOnly(bulletValue(block, "Discovered date") || bulletValue(block, "Found date")),
      subreddit: sourceLabel.replace(/^r\//i, ""),
      title: heading?.[3] ?? "Untitled lead",
      url: bulletValue(block, "URL"),
      author: bulletValue(block, "Author"),
      category: bulletValue(block, "Category"),
      leadType: bulletValue(block, "Lead type"),
      vertical: bulletValue(block, "Vertical"),
      failureMode: bulletValue(block, "Failure mode"),
      outreachPosture: bulletValue(block, "Outreach posture"),
      freeToPursuePath: bulletValue(block, "Free-to-pursue path"),
      recommendedAction: bulletValue(block, "Recommended action"),
      commentContext: bulletValue(block, "Comment context"),
      matchedLeadTypes: bulletValue(block, "Matched lead types"),
      matchEvidence: bulletValue(block, "Match evidence"),
      reason: bulletValue(block, "Why it matched"),
      suggestedComment: sectionQuote(block, "Suggested comment"),
      suggestedDm: sectionQuote(block, "Suggested DM"),
    };
    lead.sourceDate = lead.postedDate || lead.discoveredDate;

    return {
      source_id: sourceId,
      lead_key: lead.url || `${lead.subreddit}:${lead.title}`,
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
    };
  });
}

function sourceDiagnostic(source) {
  const markdown = source.markdown ?? "";
  const parsedRows = leadBlocks(markdown, { includeWatch: source.id === "reddit" }).length;
  const bestRows = leadBlocks(markdown).length;
  const postedDateRows = leadBlocks(markdown, { includeWatch: source.id === "reddit" }).join("\n");
  const declaredCandidates = numberValue(markdown, "Candidates included");
  const feedsChecked = numberValue(markdown, "Feeds checked");
  const feedErrors = feedErrorCount(markdown);
  const usable = bestRows > 0 || feedsChecked > 0;
  return {
    source: source.id,
    fileName: source.fileName ?? "",
    declaredCandidates,
    parsedLeads: parsedRows,
    bestLeadBlocks: bestRows,
    totalHeadingBlocks: (markdown.match(/^### [1-5]\/5 - /gm) ?? []).length,
    postedDateCount: (postedDateRows.match(/^- Posted date: \d{4}-\d{2}-\d{2}$/gm) ?? []).length,
    unknownPostedDateCount: (postedDateRows.match(/^- Posted date: unknown/gm) ?? []).length,
    feedErrors,
    usable,
    warning: diagnosticWarning({ declaredCandidates, bestRows, feedErrors, usable }),
  };
}

function diagnosticWarning({ declaredCandidates, bestRows, feedErrors, usable }) {
  if (declaredCandidates !== bestRows) {
    return `Declared ${declaredCandidates} candidates but parsed ${bestRows} Best Leads rows.`;
  }
  if (!usable) return "Digest is not usable.";
  if (feedErrors > 0) return `${feedErrors} feed errors reported.`;
  return "";
}

function feedErrorCount(markdown) {
  const section = markdown.split("## Feed Errors")[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .length;
}

function leadBlocks(markdown, options = {}) {
  const leadSection = (options.includeWatch ? markdown : markdown.split("\n## Maybe / Watch")[0])
    .split("\n## Rejected")[0]
    .split("\n## Feed Errors")[0];

  return leadSection
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "))
    .map((block) => block.split(/\n(?=## )/)[0]?.trim() ?? "")
    .filter(Boolean);
}

async function createAdminClient() {
  const env = {
    ...process.env,
    ...(await loadDotEnv(".env")),
    ...(await loadDotEnv(".env.local")),
  };
  const adminKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !adminKey) return null;
  return createClient(env.SUPABASE_URL, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadDotEnv(filePath) {
  try {
    const raw = await readFile(filePath, "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

function bulletValue(block, label) {
  const match = block.match(new RegExp(`^- ${escapeRegExp(label)}: (.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function numberValue(markdown, label) {
  const parsed = Number.parseInt(metadataValue(markdown, label) || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sectionQuote(block, label) {
  const section = block.split(`${label}:\n\n`)[1]?.split("\n\n")[0] ?? "";
  return section
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .trim();
}

function normalizeTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeDateOnly(value) {
  if (!value || value === "unknown") return "";
  const exact = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (exact) return exact;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeDate(value) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function quotePostgrestValue(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
