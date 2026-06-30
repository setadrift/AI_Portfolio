#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const OUTPUT_DIR = process.env.AUTOMATION_LEAD_OUTPUT_DIR || "outputs/ai-consulting-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
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

  console.log(`Published ${fileName} to Vercel Blob at ${PUBLISHED_AUTOMATION_DIGEST_PATH}`);
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

  for (const file of files) {
    const markdown = await readFile(path.join(OUTPUT_DIR, file), "utf8");
    generatedAt ||= metadataValue(markdown, "Generated");
    feedsChecked += numberValue(markdown, "Feeds checked");
    rejectedCount += numberValue(markdown, "Filtered/rejected before digest");
    feedErrors.push(...parseFeedErrors(markdown, file));
    for (const block of leadBlocks(markdown)) {
      blocks.push(withSourceDate(block.trim(), file.slice(0, 10)));
    }
  }

  const fileName = "codex-automation-leads.md";
  const markdown = [
    "# Codex Automation Lead Digest",
    "",
    `Generated: ${generatedAt || new Date().toISOString()}`,
    `Feeds checked: ${feedsChecked || files.length}`,
    `Candidates included: ${blocks.length}`,
    `Filtered/rejected before digest: ${rejectedCount}`,
    "Minimum score: 4",
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    blocks.length ? blocks.join("\n\n") : "No leads found.",
    "",
    "## Feed Errors",
    "",
    feedErrors.length ? feedErrors.join("\n") : "No feed errors.",
    "",
  ].join("\n");

  return { fileName, markdown };
}

function leadBlocks(markdown) {
  return markdown
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "));
}

function withSourceDate(block, sourceDate) {
  if (/^- Source date: /m.test(block)) return block;
  const lines = block.split("\n");
  const insertAt = lines.findIndex((line, index) => index > 0 && line.startsWith("- "));
  if (insertAt === -1) return `${lines[0]}\n- Source date: ${sourceDate}\n${lines.slice(1).join("\n")}`.trim();
  lines.splice(insertAt, 0, `- Source date: ${sourceDate}`);
  return lines.join("\n");
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
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
