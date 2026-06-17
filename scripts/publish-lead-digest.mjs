#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

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
  const payload = JSON.stringify(
    {
      fileName,
      markdown,
      status,
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
