#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const OUTPUT_DIR = process.env.AUTOMATION_LEAD_OUTPUT_DIR || "outputs/ai-consulting-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const PUBLISHED_AUTOMATION_DIGEST_PATH = "admin/leads/automation/latest.json";
const AUTOMATION_LEAD_MAX_AGE_DAYS = 7;
const AUTOMATION_LEAD_MAX_AGE_MS = AUTOMATION_LEAD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

async function main() {
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

  await put(
    PUBLISHED_AUTOMATION_DIGEST_PATH,
    JSON.stringify(
      {
        id: "automation",
        label: "Codex automation",
        description: "Broader public-web leads from the AI consulting research automation.",
        fileName,
        markdown,
        status: aggregateStatus(status, markdown),
      },
      null,
      2,
    ),
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
      postedDates: (markdown.match(/^- Posted date: \d{4}-\d{2}-\d{2}$/gm) ?? []).length,
      unknownPostedDates: (markdown.match(/^- Posted date: unknown/gm) ?? []).length,
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
  const feedErrors = [];
  const newestAllowedDate = new Date();

  for (const file of [...files].reverse()) {
    const markdown = await readFile(path.join(OUTPUT_DIR, file), "utf8");
    generatedAt ||= metadataValue(markdown, "Generated");
    feedsChecked += numberValue(markdown, "Feeds checked");
    rejectedCount += numberValue(markdown, "Filtered/rejected before digest");
    feedErrors.push(...parseFeedErrors(markdown, file));
    for (const block of leadBlocks(markdown)) {
      const explicitLeadDate = leadFreshnessDate(block);
      const normalized = withDiscoveryDate(block.trim(), file.slice(0, 10));
      blocks.push({
        block: normalized,
        dedupeKey: leadDedupeKey(normalized),
        sourceDate: explicitLeadDate,
      });
    }
  }

  const filteredBlocks = dedupeLeadBlocks(
    blocks.filter((entry) => isRecentLeadDate(entry.sourceDate, newestAllowedDate)),
  );
  rejectedCount += blocks.length - filteredBlocks.length;

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
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    filteredBlocks.length ? filteredBlocks.map((entry) => entry.block).join("\n\n") : "No leads found.",
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
  const insertAt = lines.findIndex((line, index) => index > 0 && line.startsWith("- "));
  const dateLines = [
    missingPostedDate ? "- Posted date: unknown" : "",
    missingDiscoveryDate ? `- Discovered date: ${discoveredDate}` : "",
  ].filter(Boolean);
  if (!dateLines.length) return block;
  if (insertAt === -1) return `${lines[0]}\n${dateLines.join("\n")}\n${lines.slice(1).join("\n")}`.trim();
  lines.splice(insertAt, 0, ...dateLines);
  return lines.join("\n");
}

function dedupeLeadBlocks(blocks) {
  const seen = new Set();
  const deduped = [];
  for (const block of blocks) {
    if (seen.has(block.dedupeKey)) continue;
    seen.add(block.dedupeKey);
    deduped.push(block);
  }
  return deduped;
}

function leadDedupeKey(block) {
  const url = bulletValue(block, "URL");
  if (url) return `url:${normalizeLeadUrl(url)}`;

  const heading = block.match(/^### [1-5]\/5 - (.+?) - (.+)$/m);
  const source = heading?.[1] ?? "";
  const title = heading?.[2] ?? block.split("\n")[0] ?? "";
  return `title:${normalizeComparable(`${source} ${title}`)}`;
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
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function bulletValue(block, label) {
  const match = block.match(new RegExp(`^- ${escapeRegExp(label)}: (.*)$`, "m"));
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
    message: "Published aggregate Codex automation lead digest.",
  };
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
          const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
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
