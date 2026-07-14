#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { canonicalizeUrl, freshnessFor } from "./mina-jobs/discovery.mjs";
import { scanSource } from "./mina-job-scan.mjs";
import { notifyNewJobs } from "./mina-jobs/notify.mjs";

const OUTPUT_DIR = process.env.MINA_JOB_RESEARCH_OUTPUT_DIR || "outputs/mina-job-research";

async function main() {
  if (process.argv.includes("--test-gates")) return runGateTests();
  const inputPath = argumentValue("--input") || path.join(OUTPUT_DIR, "latest-structured.json");
  const env = { ...(await loadDotEnv(".env.local")), ...process.env };
  const payload = validatePayload(JSON.parse(await readFile(inputPath, "utf8")));
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !key) throw new Error("SUPABASE_URL and a server-side Supabase key are required.");
  const db = createClient(env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const receipt = await scanSource(db, {
    name: "codex:public-web",
    family: "codex_research",
    trustedOpen: false,
    expireMissing: false,
    fetch: async () => payload.candidates.map(toScannerJob),
  });
  const notification = receipt.ok
    ? await notifyNewJobs(db, receipt.newJobs || [], env)
    : { enabled: false, attempted: 0, sent: 0, skipped: 0, reason: "scan_failed" };
  const status = {
    generatedAt: new Date().toISOString(),
    researchCompletedAt: payload.run.completedAt,
    sourceFamiliesChecked: payload.run.sourceFamiliesChecked,
    partialCoverage: payload.run.partialCoverage,
    candidatesSubmitted: payload.candidates.length,
    matched: receipt.matched,
    upserted: receipt.upserted,
    notification,
    ok: receipt.ok,
    error: receipt.error || null,
  };
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, "latest-status.json"), `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(status, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

function validatePayload(value, now = Date.now()) {
  if (!value || typeof value !== "object" || !value.run || !Array.isArray(value.candidates)) throw new Error("Codex research payload must contain run and candidates.");
  const completedAt = Date.parse(value.run.completedAt || "");
  if (Number.isNaN(completedAt) || now - completedAt > 8 * 3_600_000 || completedAt - now > 10 * 60_000) throw new Error("Codex research receipt is missing a current completedAt timestamp.");
  const families = [...new Set((value.run.sourceFamiliesChecked || []).map(String).filter(Boolean))];
  if (families.length < 6) throw new Error("Codex research must report at least six checked source families.");
  if (value.candidates.length > 50) throw new Error("Codex research payload exceeds the 50-candidate safety limit.");
  return {
    run: {
      completedAt: new Date(completedAt).toISOString(),
      sourceFamiliesChecked: families,
      partialCoverage: Boolean(value.run.partialCoverage),
      failures: Array.isArray(value.run.failures) ? value.run.failures.map(String).slice(0, 20) : [],
    },
    candidates: value.candidates.map((candidate, index) => validateCandidate(candidate, index, now)),
  };
}

function validateCandidate(candidate, index, now) {
  const label = `Candidate ${index + 1}`;
  for (const field of ["title", "company", "location", "canonicalUrl", "sourcePostedAt", "sourceFamily", "sourceUrl"]) {
    if (!String(candidate?.[field] || "").trim()) throw new Error(`${label} is missing ${field}.`);
  }
  const canonicalUrl = canonicalizeUrl(candidate.canonicalUrl);
  const sourceUrl = canonicalizeUrl(candidate.sourceUrl);
  if (!canonicalUrl || !sourceUrl) throw new Error(`${label} has an invalid public URL.`);
  if (!freshnessFor(candidate.sourcePostedAt, now).queueEligible) throw new Error(`${label} does not have a verified posting date within 30 days.`);
  return {
    title: clean(candidate.title, 300),
    company: clean(candidate.company, 300),
    location: clean(candidate.location, 500),
    canonicalUrl,
    sourceUrl,
    sourcePostedAt: new Date(candidate.sourcePostedAt).toISOString(),
    sourceFamily: clean(candidate.sourceFamily, 100),
    sourceName: clean(candidate.sourceName || "codex-public-web", 100),
    sourceResultId: clean(candidate.sourceResultId || fingerprint(canonicalUrl), 300),
    description: clean(candidate.description || candidate.snippet || "", 50_000),
    employmentType: clean(candidate.employmentType || "", 100),
    workModel: ["remote", "hybrid", "on_site"].includes(candidate.workModel) ? candidate.workModel : "unknown",
    salaryMin: positiveNumber(candidate.salaryMin),
    salaryMax: positiveNumber(candidate.salaryMax),
    salaryCurrency: clean(candidate.salaryCurrency || "CAD", 10).toUpperCase(),
    queryId: clean(candidate.queryId || "", 100),
    evidence: typeof candidate.evidence === "object" && candidate.evidence ? candidate.evidence : {},
  };
}

function toScannerJob(candidate) {
  return {
    source: "codex:public-web",
    sourceFamily: "codex_research",
    sourceJobId: candidate.sourceResultId,
    queryId: candidate.queryId,
    canonicalUrl: candidate.canonicalUrl,
    applyUrl: candidate.canonicalUrl,
    title: candidate.title,
    company: candidate.company,
    location: candidate.location,
    employmentType: candidate.employmentType,
    description: candidate.description,
    postedAt: candidate.sourcePostedAt,
    closesAt: "",
    workModel: candidate.workModel,
    salaryMin: candidate.salaryMin ? Math.round(candidate.salaryMin * 100) : null,
    salaryMax: candidate.salaryMax ? Math.round(candidate.salaryMax * 100) : null,
    salaryCurrency: candidate.salaryCurrency,
    compensationText: "",
    canonicalTrustedOpen: false,
    freshnessConfidence: "low",
    evidence: {
      provider: "Codex public-web research",
      discoverySourceFamily: candidate.sourceFamily,
      discoverySourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      untrustedTextPolicy: "data-only",
      ...candidate.evidence,
    },
  };
}

function runGateTests() {
  const now = Date.now();
  const good = {
    run: { completedAt: new Date(now).toISOString(), sourceFamiliesChecked: ["whole_web", "quebec_hr", "government", "recruiter", "employer", "social"], partialCoverage: false },
    candidates: [{ title: "HR Manager", company: "Example", location: "Montréal, QC", canonicalUrl: "https://example.com/jobs/1?utm_source=x", sourceUrl: "https://search.example/result/1", sourcePostedAt: new Date(now - 3_600_000).toISOString(), sourceFamily: "whole_web" }],
  };
  const checked = validatePayload(good, now);
  if (checked.candidates[0].canonicalUrl.includes("utm_source")) throw new Error("Tracking parameter gate failed.");
  assertThrows(() => validatePayload({ ...good, run: { ...good.run, sourceFamiliesChecked: ["whole_web"] } }, now), "six checked");
  assertThrows(() => validatePayload({ ...good, candidates: [{ ...good.candidates[0], sourcePostedAt: new Date(now - 31 * 86_400_000).toISOString() }] }, now), "within 30 days");
  console.log("Codex Mina research publisher gates passed.");
}

function assertThrows(fn, expected) {
  try { fn(); } catch (error) { if (String(error.message).includes(expected)) return; throw error; }
  throw new Error(`Expected gate error containing: ${expected}`);
}

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : "";
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex");
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function clean(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const raw = await readFile(filePath, "utf8");
  return Object.fromEntries(raw.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], String(match[2] || "").trim().replace(/^["']|["']$/g, "")]));
}

export { validatePayload };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
