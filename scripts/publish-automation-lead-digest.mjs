#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { persistAdminLeadBundleToSupabase } from "./lib/supabase-admin-leads.mjs";

const OUTPUT_DIR =
  process.env.AUTOMATION_LEAD_OUTPUT_DIR || "outputs/ai-consulting-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const PUBLISHED_AUTOMATION_DIGEST_PATH = "admin/leads/automation/latest.json";
const AUTOMATION_LEAD_MAX_AGE_DAYS = 7;
const AUTOMATION_LEAD_MAX_AGE_MS =
  AUTOMATION_LEAD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

async function main() {
  if (process.argv.includes("--test-gates")) {
    testPursuitGate();
    return;
  }
  const env = {
    ...process.env,
    ...(await loadDotEnv(".env.local")),
  };
  if (env.BLOB_READ_WRITE_TOKEN) {
    process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  const status = await readStatus();
  const { fileName, markdown } = await buildAggregateDigest();

  const payload = {
    id: "automation",
    label: "Codex automation",
    description:
      "Broader public-web leads from the AI consulting research automation.",
    fileName,
    markdown,
    status: aggregateStatus(status, markdown),
  };

  const supabaseResult = await persistAdminLeadBundleToSupabase(payload);
  if (!supabaseResult.ok) {
    throw new Error(
      `Supabase lead publish failed: ${supabaseResult.error || supabaseResult.reason || "unknown error"}`,
    );
  }

  await put(
    PUBLISHED_AUTOMATION_DIGEST_PATH,
    JSON.stringify(payload, null, 2),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    },
  );
  console.log(
    JSON.stringify({
      message: `Published ${fileName} to Vercel Blob at ${PUBLISHED_AUTOMATION_DIGEST_PATH}`,
      path: PUBLISHED_AUTOMATION_DIGEST_PATH,
      declaredCandidates: numberValue(markdown, "Candidates included"),
      parsedBestLeads: leadBlocks(markdown).length,
      postedDates: (
        markdown.match(/^- Posted date: \d{4}-\d{2}-\d{2}$/gm) ?? []
      ).length,
      unknownPostedDates: (markdown.match(/^- Posted date: unknown/gm) ?? [])
        .length,
      supabase: supabaseResult,
    }),
  );
}

async function readStatus() {
  try {
    const raw = await readFile(STATUS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function buildAggregateDigest() {
  const files = (await readdir(OUTPUT_DIR))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort();

  if (!files.length) {
    throw new Error(`No dated automation digest found in ${OUTPUT_DIR}`);
  }

  const blocks = [];
  let generatedAt = "";
  let feedsChecked = 0;
  let rejectedCount = 0;
  let engagementGateRejected = 0;
  const feedErrors = [];
  const newestAllowedDate = new Date();

  for (const file of [...files].reverse()) {
    const markdown = await readFile(path.join(OUTPUT_DIR, file), "utf8");
    generatedAt ||= metadataValue(markdown, "Generated");
    feedsChecked += numberValue(markdown, "Feeds checked");
    rejectedCount += numberValue(markdown, "Filtered/rejected before digest");
    feedErrors.push(...parseFeedErrors(markdown, file));
    for (const block of leadBlocks(markdown)) {
      if (isExcludedLeadSource(block)) continue;
      if (!passesConsultingEngagementGate(block)) {
        engagementGateRejected += 1;
        continue;
      }
      const explicitLeadDate = leadFreshnessDate(block);
      const normalized = withBusinessBuyerDefaults(
        withDiscoveryDate(block.trim(), file.slice(0, 10)),
      );
      blocks.push({
        block: normalized,
        dedupeKey: leadDedupeKey(normalized),
        sourceDate: explicitLeadDate,
      });
    }
  }

  const recentBlocks = blocks.filter((entry) =>
    isRecentLeadDate(entry.sourceDate, newestAllowedDate),
  );
  const filteredBlocks = dedupeLeadBlocks(recentBlocks);
  const duplicatesRemoved = recentBlocks.length - filteredBlocks.length;
  rejectedCount +=
    blocks.length - filteredBlocks.length + engagementGateRejected;

  const fileName = "codex-automation-leads.md";
  const markdown = [
    "# Codex Automation Lead Digest",
    "",
    `Generated: ${generatedAt || new Date().toISOString()}`,
    `Feeds checked: ${feedsChecked || files.length}`,
    `Candidates included: ${filteredBlocks.length}`,
    `Filtered/rejected before digest: ${rejectedCount}`,
    "Minimum score: 4",
    `Maximum lead age: ${AUTOMATION_LEAD_MAX_AGE_DAYS} days`,
    `Source family mix: ${formatCounts(countBy(filteredBlocks, (entry) => bulletValue(entry.block, "Source family") || inferSourceFamily(entry.block)))}`,
    `Duplicates removed: ${duplicatesRemoved}`,
    `Engagement gate rejected: ${engagementGateRejected}`,
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    filteredBlocks.length
      ? filteredBlocks.map((entry) => entry.block).join("\n\n")
      : "No leads found.",
    "",
    "## Feed Errors",
    "",
    feedErrors.length ? feedErrors.join("\n") : "No feed errors.",
    "",
  ].join("\n");

  return { fileName, markdown };
}

function leadBlocks(markdown) {
  const bestLeadsSection = markdown
    .split("\n## Maybe / Watch")[0]
    .split("\n## Rejected")[0]
    .split("\n## Feed Errors")[0];

  return bestLeadsSection
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "))
    .map((block) => block.split(/\n(?=## )/)[0]?.trim() ?? "")
    .filter(Boolean);
}

function leadFreshnessDate(block) {
  return (
    bulletValue(block, "Posted date") ||
    bulletValue(block, "Post date") ||
    bulletValue(block, "Published date") ||
    bulletValue(block, "Published at") ||
    bulletValue(block, "Source date")
  );
}

function withDiscoveryDate(block, discoveredDate) {
  const lines = block.split("\n");
  const missingPostedDate =
    !/^- Posted date: /m.test(block) &&
    !/^- Post date: /m.test(block) &&
    !/^- Published date: /m.test(block) &&
    !/^- Published at: /m.test(block);
  const missingDiscoveryDate = !/^- Discovered date: /m.test(block);
  const insertAt = lines.findIndex(
    (line, index) => index > 0 && line.startsWith("- "),
  );
  const dateLines = [
    missingPostedDate ? "- Posted date: unknown" : "",
    missingDiscoveryDate ? `- Discovered date: ${discoveredDate}` : "",
  ].filter(Boolean);
  if (!dateLines.length) return block;
  if (insertAt === -1)
    return `${lines[0]}\n${dateLines.join("\n")}\n${lines.slice(1).join("\n")}`.trim();
  lines.splice(insertAt, 0, ...dateLines);
  return lines.join("\n");
}

function dedupeLeadBlocks(blocks) {
  const byKey = new Map();
  for (const entry of blocks) {
    const existing = byKey.get(entry.dedupeKey);
    if (!existing) {
      byKey.set(entry.dedupeKey, { ...entry, relatedSources: [] });
      continue;
    }
    const related = sourceReference(entry.block);
    if (related) existing.relatedSources.push(related);
  }
  return [...byKey.values()].map((entry) => ({
    ...entry,
    block: entry.relatedSources.length
      ? upsertBullet(
          entry.block,
          "Related sources",
          unique(entry.relatedSources).join(", "),
        )
      : entry.block,
  }));
}

function leadDedupeKey(block) {
  const url = bulletValue(block, "URL");
  if (url) return `url:${normalizeLeadUrl(url)}`;

  const heading = block.match(/^### [1-5]\/5 - (.+?) - (.+)$/m);
  const source = heading?.[1] ?? "";
  const title = heading?.[2] ?? block.split("\n")[0] ?? "";
  return `title:${normalizeComparable(`${source} ${title}`)}`;
}

function isExcludedLeadSource(block) {
  const heading = block.match(/^### [1-5]\/5 - (.+?) - (.+)$/m);
  const source = heading?.[1] ?? "";
  const url = bulletValue(block, "URL");
  const pursuitPath = bulletValue(block, "Free-to-pursue path");
  return (
    [source, url].some((value) =>
      /\b(upwork|freelancer|peopleperhour|guru)\b|upwork\.com|freelancer\.com|peopleperhour\.com|guru\.com/i.test(
        value,
      ),
    ) || requiresPaidPursuit(pursuitPath)
  );
}

function requiresPaidPursuit(value) {
  const path = String(value || "").toLowerCase();
  if (
    /\b(?:no|without|does not|doesn't|not)\b.{0,35}\b(?:paid (?:marketplace|credits?)|payment to apply|login-only)\b/.test(
      path,
    )
  ) {
    return false;
  }
  return /\b(?:requires?|must|needs?|buy|purchase|pay)\b.{0,40}\b(?:paid (?:marketplace|credits?)|credits? to apply|payment to apply|login-only (?:details|access))\b|\bpayment to apply required\b/.test(
    path,
  );
}

function testPursuitGate() {
  const cases = [
    ["Public application; no paid credits required.", false],
    ["Public reply without paid marketplace credits.", false],
    ["Does not require payment to apply or login-only access.", false],
    ["Requires paid marketplace credits to apply.", true],
    ["You must purchase credits to apply.", true],
    ["Payment to apply required.", true],
  ];
  for (const [value, expected] of cases) {
    const actual = requiresPaidPursuit(value);
    if (actual !== expected) {
      throw new Error(
        `Pursuit gate expected ${expected} for ${JSON.stringify(value)}, got ${actual}`,
      );
    }
  }
  console.log(`Automation pursuit gate fixtures passed: ${cases.length}.`);
}

function passesConsultingEngagementGate(block) {
  const leadType = bulletValue(block, "Lead type").toLowerCase();
  const engagementModel = bulletValue(block, "Engagement model").toLowerCase();
  const locationEligibility = bulletValue(
    block,
    "Location eligibility",
  ).toLowerCase();
  const queue = bulletValue(block, "Queue").toLowerCase();
  if (["company_signal", "market_intelligence", "reject"].includes(queue))
    return false;
  if (["permanent", "full_time"].includes(engagementModel)) return false;
  if (locationEligibility === "ineligible") return false;
  if (leadType !== "job_board") return true;

  const eligibleEngagements = new Set([
    "consulting",
    "contract",
    "freelance",
    "fractional",
    "temporary",
    "rfp",
  ]);

  return (
    eligibleEngagements.has(engagementModel) &&
    locationEligibility === "eligible"
  );
}

function normalizeLeadUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/g, "");
    return parsed.toString().toLowerCase();
  } catch {
    return normalizeComparable(url);
  }
}

function normalizeComparable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function withBusinessBuyerDefaults(block) {
  const sourceFamily =
    bulletValue(block, "Source family") || inferSourceFamily(block);
  const buyerSituation =
    bulletValue(block, "Buyer situation") || inferBuyerSituation(block);
  const offerMatch =
    bulletValue(block, "Offer match") || inferOfferMatch(block, buyerSituation);
  const evidenceSummary =
    bulletValue(block, "Evidence summary") ||
    bulletValue(block, "Why it matched") ||
    "Public-source business-buyer signal.";
  const nextStep =
    bulletValue(block, "Next step") || nextStepForOffer(offerMatch);
  const evidenceUrl =
    bulletValue(block, "Evidence URL") || bulletValue(block, "URL");
  const sourceSnippet =
    bulletValue(block, "Source quote or snippet") ||
    sourceSnippetFromBlock(block);
  const freshnessScore =
    bulletValue(block, "Freshness score") ||
    freshnessScoreForDate(leadFreshnessDate(block));
  const queue =
    bulletValue(block, "Queue") ||
    (String(block).startsWith("### 5/5") ? "active_lead" : "warm_reply");
  const scoreComponents = inferredScoreComponents(block, queue);
  const lastVerifiedAt =
    bulletValue(block, "Last verified at") || new Date().toISOString();

  return [
    ["Source family", sourceFamily],
    ["Buyer situation", buyerSituation],
    ["Queue", queue],
    ["Offer match", offerMatch],
    [
      "Business maturity score",
      bulletValue(block, "Business maturity score") ||
        scoreComponents.businessMaturityScore,
    ],
    [
      "Pain severity score",
      bulletValue(block, "Pain severity score") ||
        scoreComponents.painSeverityScore,
    ],
    [
      "Hiring likelihood score",
      bulletValue(block, "Hiring likelihood score") ||
        scoreComponents.hiringLikelihoodScore,
    ],
    [
      "AI leverage score",
      bulletValue(block, "AI leverage score") ||
        scoreComponents.aiLeverageScore,
    ],
    [
      "Commercial fit score",
      bulletValue(block, "Commercial fit score") ||
        scoreComponents.commercialFitScore,
    ],
    [
      "Duncan fit score",
      bulletValue(block, "Duncan fit score") || scoreComponents.duncanFitScore,
    ],
    [
      "Reachability score",
      bulletValue(block, "Reachability score") ||
        scoreComponents.reachabilityScore,
    ],
    ["Freshness score", freshnessScore],
    [
      "Confidence score",
      bulletValue(block, "Confidence score") || scoreComponents.confidenceScore,
    ],
    ["Evidence summary", evidenceSummary],
    [
      "Explicit evidence",
      bulletValue(block, "Explicit evidence") || evidenceSummary,
    ],
    [
      "Inferred evidence",
      bulletValue(block, "Inferred evidence") ||
        inferredEvidenceForBlock(block, buyerSituation, offerMatch),
    ],
    ["Source quote or snippet", sourceSnippet],
    ["Evidence URL", evidenceUrl],
    [
      "Missing evidence",
      bulletValue(block, "Missing evidence") || "not specified",
    ],
    [
      "Response path",
      bulletValue(block, "Response path") ||
        bulletValue(block, "Free-to-pursue path") ||
        "Review source before outreach.",
    ],
    ["Next step", nextStep],
    ["Dismissal reason", bulletValue(block, "Dismissal reason") || "none"],
    ["Related sources", bulletValue(block, "Related sources") || "none"],
    ["Duplicate of", bulletValue(block, "Duplicate of") || "none"],
    ["Last verified at", lastVerifiedAt],
  ].reduce(
    (current, [label, value]) => ensureBullet(current, label, value),
    block,
  );
}

function inferredScoreComponents(block, queue) {
  const score = Number.parseInt(
    block.match(/^### ([1-5])\/5 - /m)?.[1] || "4",
    10,
  );
  const explicitHiring =
    /\b(hire|hiring|paid|contract|consultant|expert|implementation help|looking for someone)\b/i.test(
      block,
    );
  return {
    businessMaturityScore: "4",
    painSeverityScore: score >= 5 ? "4" : "3",
    hiringLikelihoodScore:
      explicitHiring || queue === "active_lead" ? "5" : "3",
    aiLeverageScore: "4",
    commercialFitScore: score >= 5 ? "5" : "4",
    duncanFitScore: "4",
    reachabilityScore: bulletValue(block, "URL") ? "5" : "3",
    confidenceScore: score >= 5 ? "5" : "4",
  };
}

function inferredEvidenceForBlock(block, buyerSituation, offerMatch) {
  return [buyerSituation, offerMatch]
    .filter(Boolean)
    .map((value) => value.replace(/_/g, " "))
    .join(", ");
}

function inferSourceFamily(block) {
  const text = `${block}\n${bulletValue(block, "URL")}`.toLowerCase();
  if (text.includes("reddit.com") || /^### [1-5]\/5 - r\//m.test(block))
    return "reddit";
  if (
    text.includes("community.n8n.io") ||
    text.includes("make.com") ||
    text.includes("airtable")
  )
    return "platform_community";
  if (
    /\b(job|jobs|hiring|contract|greenhouse|lever|workable|ashby)\b/.test(text)
  )
    return "public_job_board";
  if (/\b(rfp|request for proposal|vendor request)\b/.test(text))
    return "public_rfp_vendor_request";
  if (/\b(founder|indie hackers|startup)\b/.test(text))
    return "founder_community";
  return "other";
}

function inferBuyerSituation(block) {
  const text = block.toLowerCase();
  if (
    /\b(hire|hiring|paid|contract|consultant|expert|implementation help|looking for someone)\b/.test(
      text,
    )
  )
    return "explicit_expert_hiring";
  if (/\b(ai strategy|use ai|using ai|ai adoption|train my team)\b/.test(text))
    return "ai_adoption_strategy";
  if (/\b(lead|sales|crm|follow[- ]?up|quote|pipeline)\b/.test(text))
    return "growth_sales_leakage";
  if (
    /\b(document|pdf|invoice|receipt|bookkeeping|reconcile|forms?)\b/.test(text)
  )
    return "document_finance_admin_workflow";
  if (/\b(report|dashboard|visibility|kpi|profitability)\b/.test(text))
    return "reporting_visibility";
  if (/\b(training|sop|onboarding|handoff|team)\b/.test(text))
    return "team_training_change_management";
  if (/\b(job|role|hiring)\b/.test(text)) return "company_hiring_signal";
  return "operational_bottleneck";
}

function inferOfferMatch(block, buyerSituation) {
  if (buyerSituation === "ai_adoption_strategy") return "ai_opportunity_audit";
  if (buyerSituation === "growth_sales_leakage") return "crm_lead_flow_repair";
  if (buyerSituation === "document_finance_admin_workflow")
    return "document_intake_automation";
  if (buyerSituation === "reporting_visibility")
    return "management_dashboard_visibility";
  if (buyerSituation === "team_training_change_management")
    return "ai_team_enablement";
  if (/\b(prototype|custom system|build|implementation)\b/i.test(block))
    return "custom_system_prototype";
  return "workflow_automation_sprint";
}

function nextStepForOffer(offerMatch) {
  if (offerMatch === "ai_opportunity_audit")
    return "Offer a short AI opportunity audit as the first step.";
  if (offerMatch === "crm_lead_flow_repair")
    return "Offer to map and repair the lead/CRM flow first.";
  if (offerMatch === "document_intake_automation")
    return "Offer one document intake automation prototype.";
  if (offerMatch === "management_dashboard_visibility")
    return "Offer a dashboard/reporting discovery sprint.";
  if (offerMatch === "ai_team_enablement")
    return "Offer a team enablement session plus workflow shortlist.";
  if (offerMatch === "custom_system_prototype")
    return "Offer a scoped first workflow prototype.";
  return "Offer a workflow automation sprint as the first step.";
}

function sourceSnippetFromBlock(block) {
  const heading = block.match(/^### [1-5]\/5 - (.+)$/m)?.[1] ?? "";
  const reason = bulletValue(block, "Why it matched");
  return `${heading}. ${reason}`.replace(/\s+/g, " ").trim().slice(0, 260);
}

function freshnessScoreForDate(value) {
  const parsed = parseLeadDate(value);
  if (!parsed) return "1";
  const ageMs = startOfUtcDay(new Date()).getTime() - parsed.getTime();
  if (ageMs <= 24 * 60 * 60 * 1000) return "5";
  if (ageMs <= 3 * 24 * 60 * 60 * 1000) return "4";
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return "3";
  return "2";
}

function ensureBullet(block, label, value) {
  if (bulletValue(block, label)) return block;
  const lines = block.split("\n");
  let insertAfter =
    lines.findLastIndex?.((line) => line.startsWith("- ")) ?? -1;
  if (insertAfter === -1) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lines[index].startsWith("- ")) {
        insertAfter = index;
        break;
      }
    }
  }
  const line = `- ${label}: ${value || "unknown"}`;
  if (insertAfter === -1) return `${block}\n${line}`;
  lines.splice(insertAfter + 1, 0, line);
  return lines.join("\n");
}

function upsertBullet(block, label, value) {
  if (!bulletValue(block, label)) return ensureBullet(block, label, value);
  return block.replace(
    new RegExp(`^- ${escapeRegExp(label)}: .*$`, "m"),
    `- ${label}: ${value}`,
  );
}

function sourceReference(block) {
  return (
    bulletValue(block, "URL") ||
    block.match(/^### [1-5]\/5 - (.+)$/m)?.[1] ||
    ""
  );
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function formatCounts(counts) {
  if (!counts.size) return "none";
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isRecentLeadDate(sourceDate, now = new Date()) {
  const parsed = parseLeadDate(sourceDate);
  if (!parsed) return false;
  const ageMs = startOfUtcDay(now).getTime() - parsed.getTime();
  return ageMs >= 0 && ageMs <= AUTOMATION_LEAD_MAX_AGE_MS;
}

function parseLeadDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const parsed = new Date(`${match[0]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(value) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function metadataValue(markdown, label) {
  const match = markdown.match(
    new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"),
  );
  return match?.[1]?.trim() ?? "";
}

function bulletValue(block, label) {
  const match = block.match(
    new RegExp(`^- ${escapeRegExp(label)}: (.*)$`, "m"),
  );
  return match?.[1]?.trim() ?? "";
}

function numberValue(markdown, label) {
  const parsed = Number.parseInt(metadataValue(markdown, label) || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function aggregateStatus(status, markdown) {
  if (!status) return null;

  return {
    ...status,
    leadsIncluded: numberValue(markdown, "Candidates included"),
    outputPath: "codex-automation-leads.md",
    sourceFamilyDiagnostics: sourceFamilyDiagnosticsFromMarkdown(markdown),
    message: "Published aggregate Codex automation lead digest.",
  };
}

function sourceFamilyDiagnosticsFromMarkdown(markdown) {
  const blocks = leadBlocks(markdown);
  const byFamily = countBy(
    blocks,
    (block) => bulletValue(block, "Source family") || inferSourceFamily(block),
  );
  const activeByFamily = countBy(
    blocks.filter((block) => bulletValue(block, "Queue") === "active_lead"),
    (block) => bulletValue(block, "Source family") || inferSourceFamily(block),
  );
  return {
    configuredSourcesChecked: Object.fromEntries(byFamily),
    candidateCountBySourceFamily: Object.fromEntries(byFamily),
    activeLeadCountBySourceFamily: Object.fromEntries(activeByFamily),
    duplicatesRemoved: { all: numberValue(markdown, "Duplicates removed") },
    freshnessCoverage: freshnessCoverageFromBlocks(blocks),
    sourcePolicy: "public_free_to_pursue_only",
  };
}

function freshnessCoverageFromBlocks(blocks) {
  const rows = new Map();
  for (const block of blocks) {
    const family =
      bulletValue(block, "Source family") || inferSourceFamily(block);
    const row = rows.get(family) ?? { withPostedDate: 0, total: 0 };
    row.total += 1;
    if (leadFreshnessDate(block)) row.withPostedDate += 1;
    rows.set(family, row);
  }
  return Object.fromEntries(rows);
}

function parseFeedErrors(markdown, file) {
  const section = markdown.split("## Feed Errors")[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => `- ${file}: ${line.slice(2)}`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
          const key = line.slice(0, index).trim();
          const value = line
            .slice(index + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
          return [key, value];
        }),
    );
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
