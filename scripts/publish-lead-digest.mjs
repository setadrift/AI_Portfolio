#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

const OUTPUT_DIR = process.env.REDDIT_LEAD_OUTPUT_DIR || "outputs/reddit-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const PUBLISHED_DIGEST_PATH = "admin/leads/latest.json";

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
  const automationMarkdown = await buildAutomationMarkdown(fileName, existingAutomationSource?.markdown);
  const payload = JSON.stringify(
    {
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
          fileName: "codex-automation-leads.md",
          markdown: automationMarkdown,
          status: null,
        },
      ],
    },
    null,
    2,
  );

  await put(PUBLISHED_DIGEST_PATH, payload, {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  console.log(`Published ${fileName} to Vercel Blob at ${PUBLISHED_DIGEST_PATH}`);
}

async function buildAutomationMarkdown(redditFileName, fallbackMarkdown = "") {
  const files = (await readdir(OUTPUT_DIR))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file) && file !== redditFileName)
    .sort()
    .reverse();
  const seen = new Set();
  const blocks = [];
  let generatedAt = "";

  for (const file of files) {
    const markdown = await readFile(path.join(OUTPUT_DIR, file), "utf8");
    generatedAt ||= metadataValue(markdown, "Generated");
    for (const block of leadBlocks(markdown)) {
      const heading = block.match(/^### ([1-5])\/5 - (.+?) - (.+)$/m);
      if (!heading || !["4", "5"].includes(heading[1])) continue;
      const url = bulletValue(block, "URL");
      const key = url || `${heading[2]}:${heading[3]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push(block.trim());
    }
  }

  if (!blocks.length && fallbackMarkdown) return fallbackMarkdown;

  return [
    "# Codex Automation Lead Digest",
    "",
    `Generated: ${generatedAt || new Date().toISOString()}`,
    `Feeds checked: ${files.length}`,
    `Candidates included: ${blocks.length}`,
    "Filtered/rejected before digest: 0",
    "Minimum score: 4",
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    blocks.length ? blocks.join("\n\n") : "No 4+ leads found.",
    "",
    "## Feed Errors",
    "",
    "No feed errors.",
    "",
  ].join("\n");
}

async function readPublishedAutomationSource() {
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

function leadBlocks(markdown) {
  return markdown
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "));
}

function metadataValue(markdown, label) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function bulletValue(block, label) {
  const match = block.match(new RegExp(`^- ${escapeRegExp(label)}: (.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
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
