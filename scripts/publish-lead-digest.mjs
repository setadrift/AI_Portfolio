#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { persistAdminLeadBundleToSupabase } from "./lib/supabase-admin-leads.mjs";

const OUTPUT_DIR = process.env.REDDIT_LEAD_OUTPUT_DIR || "outputs/reddit-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const PUBLISHED_DIGEST_PATH = "admin/leads/latest.json";
const PUBLISHED_AUTOMATION_DIGEST_PATH = "admin/leads/automation/latest.json";

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
  const digestPath = await findDigestPath(status?.outputPath);
  const fileName = path.basename(digestPath);
  const markdown = await readFile(digestPath, "utf8");
  const existingAutomationSource = await readPublishedAutomationSource();
  if (!existingAutomationSource) {
    console.warn("No existing automation source found while publishing lead bundle; using empty automation placeholder.");
  }
  const payload = {
    sources: [
      {
        id: "reddit",
        label: "Reddit monitor",
        description: "Leads from the configured Reddit scan.",
        fileName,
        markdown,
        status,
      },
      {
        id: "automation",
        label: "Codex automation",
        description: "Broader public-web leads from the AI consulting research automation.",
        fileName: existingAutomationSource?.fileName ?? "codex-automation-leads.md",
        markdown: existingAutomationSource?.markdown ?? emptyAutomationMarkdown(),
        status: existingAutomationSource?.status ?? null,
      },
    ],
  };

  await put(PUBLISHED_DIGEST_PATH, JSON.stringify(payload, null, 2), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  const supabaseResult = await persistAdminLeadBundleToSupabase(payload);

  console.log(
    JSON.stringify({
      message: `Published ${fileName} to Vercel Blob at ${PUBLISHED_DIGEST_PATH}`,
      path: PUBLISHED_DIGEST_PATH,
      reddit: digestStats(markdown),
      automation: existingAutomationSource ? digestStats(existingAutomationSource.markdown ?? "") : null,
      supabase: supabaseResult,
    }),
  );
}

function digestStats(markdown) {
  const bestLeadsSection = markdown
    .split("\n## Maybe / Watch")[0]
    .split("\n## Rejected")[0]
    .split("\n## Feed Errors")[0];
  return {
    declaredCandidates: numberValue(markdown, "Candidates included"),
    bestLeadRows: (bestLeadsSection.match(/^### [1-5]\/5 - /gm) ?? []).length,
    totalHeadingRows: (markdown.match(/^### [1-5]\/5 - /gm) ?? []).length,
    postedDates: (bestLeadsSection.match(/^- Posted date: \d{4}-\d{2}-\d{2}$/gm) ?? []).length,
    unknownPostedDates: (bestLeadsSection.match(/^- Posted date: unknown/gm) ?? []).length,
  };
}

function emptyAutomationMarkdown() {
  return [
    "# Codex Automation Lead Digest",
    "",
    `Generated: ${new Date().toISOString()}`,
    "Feeds checked: 0",
    "Candidates included: 0",
    "Filtered/rejected before digest: 0",
    "Minimum score: 4",
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    "No automation digest has been published yet.",
    "",
    "## Feed Errors",
    "",
    "No feed errors.",
    "",
  ].join("\n");
}

async function readPublishedAutomationSource() {
  const dedicatedSource = await readPublishedAutomationSourceAt(PUBLISHED_AUTOMATION_DIGEST_PATH);
  if (dedicatedSource) return dedicatedSource;

  try {
    const result = await get(PUBLISHED_DIGEST_PATH, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;

    const raw = await new Response(result.stream).text();
    const payload = JSON.parse(raw);
    return payload.sources?.find((source) => source.id === "automation") ?? null;
  } catch {
    return null;
  }
}

async function readPublishedAutomationSourceAt(pathname) {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;

    const raw = await new Response(result.stream).text();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function numberValue(markdown, label) {
  const parsed = Number.parseInt(metadataValue(markdown, label) || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readStatus() {
  try {
    const raw = await readFile(STATUS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function findDigestPath(statusOutputPath) {
  if (statusOutputPath) {
    try {
      await readFile(statusOutputPath, "utf8");
      return statusOutputPath;
    } catch {
      // Fall through to latest dated digest.
    }
  }

  const files = (await readdir(OUTPUT_DIR))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort()
    .reverse();

  if (!files[0]) {
    throw new Error(`No dated digest found in ${OUTPUT_DIR}`);
  }

  return path.join(OUTPUT_DIR, files[0]);
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
