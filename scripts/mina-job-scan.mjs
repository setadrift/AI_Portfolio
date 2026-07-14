#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  canonicalizeUrl,
  discoveryFingerprint,
  freshnessFor,
  isDiscoveryOnlyUrl,
  qualityTier,
  verifyCanonical,
} from "./mina-jobs/discovery.mjs";
import {
  fetchDuckDuckGoSearch,
  fetchHimalayas,
  fetchJobBank,
  fetchJooble,
  fetchPublicWebSearch,
  fetchReddit,
  fetchRemotive,
  fetchSmartRecruitersCompany,
  fetchWorkableAccount,
  fetchWorkdayBoard,
  loadSearchConfig,
} from "./mina-jobs/sources.mjs";
import { notifyNewJobs } from "./mina-jobs/notify.mjs";
import {
  isCanadaBasedGlobalRole,
  isEligibleLocation,
  isMontrealIsland,
  isRemoteCanada,
  matchTargetRole,
} from "./mina-jobs/profile.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const STAGE_ONLY = process.argv.includes("--stage-only");
const VERBOSE = process.argv.includes("--verbose");
const TARGET_SALARY_CENTS = 11_000_000;
const ACCEPTABLE_SALARY_CENTS = 10_700_000;

const DEFAULT_GREENHOUSE_BOARDS = {
  stackadapt: "StackAdapt",
  hootsuite: "Hootsuite",
  faire: "Faire",
  workleap: "Workleap",
};

const DEFAULT_ASHBY_BOARDS = {
  koho: "KOHO",
  cohere: "Cohere",
  beaconsoftware: "Beacon Software",
  homebase: "Homebase",
  ignition: "Ignition",
  semperis: "Semperis",
  "1password": "1Password",
  wealthsimple: "Wealthsimple",
  lightspeed: "Lightspeed",
};

const DEFAULT_LEVER_SITES = {
  knix: "Knix",
  eqbank: "EQ Bank",
  dulcedo: "Dulcedo Management",
  pointclickcare: "PointClickCare",
  plusgrade: "Plusgrade",
};

const DEFAULT_WORKDAY_BOARDS = [
  { id: "cae", company: "CAE", host: "cae.wd3.myworkdayjobs.com", tenant: "cae", site: "career" },
  { id: "atkinsrealis", company: "AtkinsRéalis", host: "slihrms.wd3.myworkdayjobs.com", tenant: "slihrms", site: "Careers" },
  { id: "intelcom", company: "Intelcom | Dragonfly", host: "intelcomgroup.wd3.myworkdayjobs.com", tenant: "intelcomgroup", site: "Intelcom" },
  { id: "air-liquide", company: "Air Liquide", host: "airliquidehr.wd3.myworkdayjobs.com", tenant: "airliquidehr", site: "AirLiquideExternalCareer" },
  { id: "canada-goose", company: "Canada Goose", host: "canadagoose.wd3.myworkdayjobs.com", tenant: "canadagoose", site: "CanadaGooseCareers" },
  { id: "canadian-tire", company: "Canadian Tire", host: "canadiantirecorporation.wd3.myworkdayjobs.com", tenant: "canadiantirecorporation", site: "Enterprise_External_Careers_Site" },
  { id: "xbox-gaming", company: "Xbox Gaming", host: "xboxgaming.wd1.myworkdayjobs.com", tenant: "xboxgaming", site: "External" },
  { id: "labatt", company: "Labatt Breweries of Canada", host: "abinbev.wd1.myworkdayjobs.com", tenant: "abinbev", site: "CAN" },
  { id: "international-schools", company: "International Schools Partnership", host: "internationalschools.wd3.myworkdayjobs.com", tenant: "internationalschools", site: "ISPCareers" },
  { id: "aritzia", company: "Aritzia", host: "aritzia.wd3.myworkdayjobs.com", tenant: "aritzia", site: "External" },
  { id: "mcgill", company: "McGill University", host: "mcgill.wd3.myworkdayjobs.com", tenant: "mcgill", site: "McGill_Careers" },
];

const DEFAULT_SMARTRECRUITERS_COMPANIES = [
  { identifier: "SGS", company: "SGS" },
  { identifier: "Vention", company: "Vention" },
  { identifier: "NBCUniversal3", company: "NBCUniversal" },
  { identifier: "AmericanIronandMetal", company: "American Iron & Metal" },
  { identifier: "Ubisoft2", company: "Ubisoft" },
  { identifier: "ReitmansCanadaLteLtd", company: "Reitmans Canada" },
  { identifier: "Gameloft", company: "Gameloft" },
];

const DEFAULT_WORKABLE_ACCOUNTS = [
  { account: "flinks", company: "Flinks" },
  { account: "ghgsat", company: "GHGSat" },
];

async function runMinaJobScan() {
  const env = {
    ...(await loadDotEnv(".env")),
    ...(await loadDotEnv(".env.local")),
    ...process.env,
  };
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and a server-side Supabase key are required.");

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const searchConfig = await loadSearchConfig();
  const skippedFamilies = [];
  const sources = [
    ...(await loadConfiguredDirectSources(db, env)),
    {
      name: "jobbank:canada",
      family: "canadian_market",
      trustedOpen: true,
      expireMissing: true,
      queryIds: [
        "jobbank-qc-hr-managers",
        "jobbank-qc-hr-professionals",
        "jobbank-remote-hr-managers",
        "jobbank-remote-hr-professionals",
      ],
      fetch: fetchJobBank,
    },
    { name: "himalayas:canada-hr", family: "structured_api", trustedOpen: false, expireMissing: false, fetch: fetchHimalayas },
    { name: "remotive:hr", family: "structured_api", trustedOpen: false, expireMissing: false, fetch: fetchRemotive },
    {
      name: "duckduckgo:public-web",
      family: "whole_web",
      trustedOpen: false,
      expireMissing: false,
      queryIds: searchConfig.queries.map((query) => query.id),
      fetch: () => fetchDuckDuckGoSearch(searchConfig.queries),
    },
  ];

  if (env.MINA_ADZUNA_APP_ID && env.MINA_ADZUNA_APP_KEY) {
    sources.push({
      name: "adzuna:canada",
      family: "structured_api",
      trustedOpen: false,
      expireMissing: false,
      fetch: () => fetchAdzuna(env.MINA_ADZUNA_APP_ID, env.MINA_ADZUNA_APP_KEY),
    });
  } else {
    skippedFamilies.push({ family: "structured_api", source: "adzuna:canada", reason: "credentials_missing" });
  }

  if (env.JOOBLE_API_KEY) {
    sources.push({
      name: "jooble:canada",
      family: "structured_api",
      trustedOpen: false,
      expireMissing: false,
      fetch: () => fetchJooble(env.JOOBLE_API_KEY),
    });
  } else {
    skippedFamilies.push({ family: "structured_api", source: "jooble:canada", reason: "credentials_missing" });
  }

  const publicSearchProvider = env.BRAVE_SEARCH_API_KEY
    ? { name: "brave-web", source: "brave:web", key: env.BRAVE_SEARCH_API_KEY }
    : env.SERPAPI_API_KEY
      ? { name: "serpapi-google-jobs", source: "serpapi:google-jobs", key: env.SERPAPI_API_KEY }
      : null;
  if (publicSearchProvider) {
    sources.push({
      name: publicSearchProvider.source,
      family: "whole_web",
      trustedOpen: false,
      expireMissing: false,
      queryIds: searchConfig.queries.map((query) => query.id),
      fetch: () => fetchPublicWebSearch(
        publicSearchProvider.name,
        publicSearchProvider.key,
        searchConfig.queries,
        searchConfig.queries.length,
      ),
    });
  }

  if (env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET) {
    sources.push({
      name: "reddit:global-search",
      family: "social",
      trustedOpen: false,
      expireMissing: false,
      fetch: () => fetchReddit(env, searchConfig.redditQueries),
    });
  } else {
    skippedFamilies.push({ family: "social", source: "reddit:global-search", reason: "credentials_missing" });
  }

  skippedFamilies.push({ family: "codex_research", source: "codex-public-web", reason: "independent_automation" });

  const receipts = [];
  for (const source of sources) {
    receipts.push(await scanSource(db, source));
  }

  const newJobs = receipts.flatMap((receipt) => receipt.newJobs || []);
  const notification = DRY_RUN || STAGE_ONLY ? { enabled: false, attempted: 0, sent: 0, skipped: newJobs.length, reason: DRY_RUN ? "dry_run" : "stage_only" } : await notifyNewJobs(db, newJobs, env);
  const successfulFamilies = new Set(receipts.filter((receipt) => receipt.ok).map((receipt) => receipt.family));
  const attemptedFamilies = new Set(receipts.map((receipt) => receipt.family));
  const coverage = buildCoverageSummary(receipts);

  const summary = {
    dryRun: DRY_RUN,
    stageOnly: STAGE_ONLY,
    sources: receipts.length,
    successfulSources: receipts.filter((receipt) => receipt.ok).length,
    fetched: sum(receipts, "fetched"),
    matched: sum(receipts, "matched"),
    upserted: sum(receipts, "upserted"),
    configuredFamilies: searchConfig.sourceFamilies.length,
    attemptedFamilies: [...attemptedFamilies],
    successfulFamilies: [...successfulFamilies],
    skippedFamilies,
    ...coverage,
    partialCoverage: !coverage.webHealthy || !coverage.directAtsHealthy,
    notification,
    errors: receipts.filter((receipt) => !receipt.ok).map((receipt) => ({ source: receipt.source, error: receipt.error })),
  };
  if (!DRY_RUN) await writeBroadReceipt(db, summary, receipts);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function buildCoverageSummary(receipts) {
  const requiredMarketReceipts = receipts.filter((receipt) => receipt.family === "canadian_market");
  const publicWebReceipts = receipts.filter((receipt) => receipt.family === "whole_web");
  const webReceipts = receipts.filter((receipt) => ["canadian_market", "whole_web"].includes(receipt.family));
  const directReceipts = receipts.filter((receipt) => receipt.family === "direct_ats");
  const marketQueriesAttempted = sum(webReceipts, "queriesAttempted");
  const marketQueriesSucceeded = sum(webReceipts, "queriesSucceeded");
  const employerBoardsAttempted = directReceipts.length;
  const employerBoardsSucceeded = directReceipts.filter((receipt) => receipt.ok).length;
  const requiredMarketQueriesAttempted = sum(requiredMarketReceipts, "queriesAttempted");
  const requiredMarketQueriesSucceeded = sum(requiredMarketReceipts, "queriesSucceeded");
  const publicWebQueriesAttempted = sum(publicWebReceipts, "queriesAttempted");
  const publicWebQueriesSucceeded = sum(publicWebReceipts, "queriesSucceeded");
  const canadianMarketHealthy = requiredMarketReceipts.length > 0
    && requiredMarketQueriesAttempted > 0
    && requiredMarketQueriesSucceeded / requiredMarketQueriesAttempted >= 0.9;
  const publicWebHealthy = publicWebReceipts.length > 0
    && publicWebQueriesAttempted > 0
    && publicWebQueriesSucceeded / publicWebQueriesAttempted >= 0.75;
  const webHealthy = canadianMarketHealthy && publicWebHealthy;
  const directAtsHealthy = employerBoardsAttempted > 0
    && employerBoardsSucceeded / employerBoardsAttempted >= 0.8;
  return {
    marketQueriesAttempted,
    marketQueriesSucceeded,
    employerBoardsAttempted,
    employerBoardsSucceeded,
    candidatesChecked: sum(receipts, "candidates"),
    canonicalVerified: sum(receipts, "verified"),
    queryFailures: webReceipts.flatMap((receipt) => receipt.queryFailures || []),
    canadianMarketHealthy,
    publicWebHealthy,
    webHealthy,
    directAtsHealthy,
  };
}

async function loadConfiguredDirectSources(db, env) {
  const { data, error } = await db.from("mina_source_configs")
    .select("id, source_type, employer, board_identifier, source_name")
    .eq("enabled", true)
    .in("source_type", ["greenhouse", "ashby", "lever", "workday", "smartrecruiters", "workable"])
    .order("priority", { ascending: false });
  if (error) console.warn(`Direct-source registry unavailable; using checked-in defaults: ${error.message}`);

  const configs = new Map();
  for (const row of data ?? []) configs.set(String(row.id), row);
  const addBoards = (type, boards) => {
    for (const [identifier, employer] of Object.entries(boards)) {
      configs.set(`${type}:${identifier}`, {
        id: `${type}:${identifier}`,
        source_type: type,
        employer,
        board_identifier: identifier,
        source_name: `${employer} ${type}`,
      });
    }
  };
  addBoards("greenhouse", DEFAULT_GREENHOUSE_BOARDS);
  addBoards("ashby", DEFAULT_ASHBY_BOARDS);
  addBoards("lever", DEFAULT_LEVER_SITES);
  for (const config of DEFAULT_WORKDAY_BOARDS) {
    configs.set(`workday:${config.id}`, {
      id: `workday:${config.id}`,
      source_type: "workday",
      employer: config.company,
      board_identifier: JSON.stringify(config),
      source_name: `${config.company} Workday`,
    });
  }
  for (const config of DEFAULT_SMARTRECRUITERS_COMPANIES) {
    configs.set(`smartrecruiters:${config.identifier}`, {
      id: `smartrecruiters:${config.identifier}`,
      source_type: "smartrecruiters",
      employer: config.company,
      board_identifier: config.identifier,
      source_name: `${config.company} SmartRecruiters`,
    });
  }
  for (const config of DEFAULT_WORKABLE_ACCOUNTS) {
    configs.set(`workable:${config.account}`, {
      id: `workable:${config.account}`,
      source_type: "workable",
      employer: config.company,
      board_identifier: config.account,
      source_name: `${config.company} Workable`,
    });
  }
  addBoards("greenhouse", mergeBoards({}, env.MINA_GREENHOUSE_BOARDS));
  addBoards("ashby", mergeBoards({}, env.MINA_ASHBY_BOARDS));
  addBoards("lever", mergeBoards({}, env.MINA_LEVER_SITES));

  return [...configs.values()].map((row) => {
    const type = String(row.source_type);
    const identifier = String(row.board_identifier || "");
    const employer = String(row.employer || row.source_name || titleCase(identifier));
    if (!identifier) throw new Error(`Direct source ${row.id} is missing a board identifier.`);
    let fetchSource;
    if (type === "greenhouse") fetchSource = () => fetchGreenhouse(identifier, employer);
    else if (type === "ashby") fetchSource = () => fetchAshby(identifier, employer);
    else if (type === "lever") fetchSource = () => fetchLever(identifier, employer);
    else if (type === "workday") fetchSource = () => fetchWorkdayBoard(JSON.parse(identifier));
    else if (type === "smartrecruiters") fetchSource = () => fetchSmartRecruitersCompany({ identifier, company: employer });
    else if (type === "workable") fetchSource = () => fetchWorkableAccount({ account: identifier, company: employer });
    else throw new Error(`Unsupported direct source type: ${type}`);
    return {
      name: String(row.id),
      family: "direct_ats",
      trustedOpen: true,
      fetch: fetchSource,
    };
  });
}

async function writeBroadReceipt(db, summary, receipts) {
  const now = new Date().toISOString();
  const { error } = await db.from("mina_source_runs").insert({
    source: "broad:mina-discovery-v2",
    started_at: receipts.map((receipt) => receipt.startedAt).filter(Boolean).sort()[0] || now,
    finished_at: now,
    ok: !summary.partialCoverage,
    fetched_count: summary.fetched,
    matched_count: summary.matched,
    upserted_count: summary.upserted,
    partial_coverage: summary.partialCoverage,
    configured_family_count: summary.configuredFamilies,
    successful_family_count: summary.successfulFamilies.length,
    query_count: summary.marketQueriesAttempted,
    error: summary.partialCoverage ? "Required market coverage was incomplete." : null,
    error_category: summary.partialCoverage ? "coverage_incomplete" : null,
    diagnostic_message: summary.partialCoverage ? "Partial scan: required market coverage was incomplete." : "Complete scan: Canadian market, wider public web, and direct employer coverage succeeded.",
    details: {
      attemptedFamilies: summary.attemptedFamilies,
      successfulFamilies: summary.successfulFamilies,
      skippedFamilies: summary.skippedFamilies,
      marketQueriesAttempted: summary.marketQueriesAttempted,
      marketQueriesSucceeded: summary.marketQueriesSucceeded,
      canadianMarketHealthy: summary.canadianMarketHealthy,
      publicWebHealthy: summary.publicWebHealthy,
      employerBoardsAttempted: summary.employerBoardsAttempted,
      employerBoardsSucceeded: summary.employerBoardsSucceeded,
      candidatesChecked: summary.candidatesChecked,
      canonicalVerified: summary.canonicalVerified,
      queryFailures: summary.queryFailures,
      sourceErrors: summary.errors,
      notifications: summary.notification,
    },
  });
  if (error) throw new Error(`Unable to save broad scan heartbeat: ${error.message}`);
}

async function scanSource(db, source) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  try {
    const sourceResult = await source.fetch();
    const sourceJobs = Array.isArray(sourceResult) ? sourceResult : sourceResult.jobs;
    const queryResults = Array.isArray(sourceResult?.queryResults) ? sourceResult.queryResults : [];
    if (!Array.isArray(sourceJobs)) throw new Error("Job source did not return a job list.");
    const fetched = sourceJobs.map((job) => ({
      ...job,
      sourceFamily: job.sourceFamily || source.family,
      canonicalTrustedOpen: job.canonicalTrustedOpen ?? source.trustedOpen,
    }));
    const eligible = fetched.map((rawJob) => ({ rawJob, initiallyScored: scoreJob(rawJob) }))
      .filter((entry) => entry.initiallyScored || shouldVerifyBeforeScoring(entry.rawJob));
    let normalized = await mapWithConcurrency(eligible, 4, ({ rawJob, initiallyScored }) =>
      verifyAndRescore(rawJob, initiallyScored));
    normalized = normalized.filter(Boolean);
    if (!DRY_RUN) {
      await stageCandidates(db, fetched, startedAt, normalized);
      await updateQueryMetrics(db, fetched, normalized, startedAt, queryResults);
    }
    if (VERBOSE) {
      for (const job of normalized) {
        console.log(`  ${job.match_score} · ${job.title} · ${job.company} · ${job.location} · ${formatSalary(job)}`);
      }
    }
    let upserted = 0;
    let newJobs = [];

    if (!DRY_RUN && !STAGE_ONLY) {
      normalized = await reuseExistingFingerprints(db, source.name, normalized);
      normalized = await mergeCrossSourceDuplicates(db, source, normalized);
    }
    if (!DRY_RUN && !STAGE_ONLY && normalized.length) {
      const fingerprints = normalized.map((job) => job.job_fingerprint);
      const { data: existing, error: existingError } = await db
        .from("mina_jobs")
        .select("job_fingerprint")
        .in("job_fingerprint", fingerprints);
      if (existingError) throw new Error(existingError.message);
      const known = new Set((existing ?? []).map((row) => row.job_fingerprint));
      const upsertRows = normalized.map(withoutInternalFields);
      const { data, error } = await db
        .from("mina_jobs")
        .upsert(upsertRows, { onConflict: "job_fingerprint" })
        .select("*");
      if (error) throw new Error(error.message);
      upserted = data?.length ?? 0;
      newJobs = (data ?? []).filter((row) => !known.has(row.job_fingerprint));
      await writeProvenance(db, data ?? [], normalized, startedAt);
      await linkStagedCandidates(db, data ?? [], normalized);
    }
    if (!DRY_RUN && !STAGE_ONLY && source.expireMissing !== false
      && (!queryResults.length || queryResults.every((query) => query.ok))) {
      await expireMissingJobs(db, source.name, normalized.map((job) => job.source_job_id));
    }

    const queriesAttempted = queryResults.length;
    const queriesSucceeded = queryResults.filter((query) => query.ok).length;
    const sourceOk = queriesAttempted ? queriesSucceeded > 0 : true;
    const receipt = {
      source: source.name,
      family: source.family,
      ok: sourceOk,
      fetched: fetched.length,
      matched: normalized.length,
      candidates: eligible.length,
      verified: normalized.filter((job) => job.canonical_status === "open" && job.active).length,
      upserted,
      newJobs,
      queriesAttempted,
      queriesSucceeded,
      queryFailures: queryResults.filter((query) => !query.ok).map((query) => ({ queryId: query.queryId, error: query.error })),
      durationMs: Date.now() - startedMs,
      startedAt,
      error: sourceOk ? "" : "Every configured market query failed.",
    };
    if (!DRY_RUN) {
      await writeReceipt(db, receipt, startedAt);
      await updateSourceHealth(db, source.name, sourceOk, startedAt);
    }
    console.log(`${source.name}: ${fetched.length} fetched, ${eligible.length} candidates, ${receipt.verified} verified${DRY_RUN ? " (dry run)" : STAGE_ONLY ? " (stage only)" : ""}`);
    return receipt;
  } catch (error) {
    const receipt = {
      source: source.name,
      family: source.family,
      ok: false,
      fetched: 0,
      matched: 0,
      candidates: 0,
      verified: 0,
      upserted: 0,
      newJobs: [],
      queriesAttempted: source.queryIds?.length || 0,
      queriesSucceeded: 0,
      queryFailures: (source.queryIds || []).map((queryId) => ({ queryId, error: error instanceof Error ? error.message : String(error) })),
      durationMs: Date.now() - startedMs,
      startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    if (!DRY_RUN) {
      await writeReceipt(db, receipt, startedAt);
      await updateSourceHealth(db, source.name, false, startedAt);
    }
    console.warn(`${source.name}: ${receipt.error}`);
    return receipt;
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function updateSourceHealth(db, sourceId, ok, attemptedAt) {
  const { data, error } = await db.from("mina_source_configs")
    .select("id, consecutive_failure_count")
    .eq("id", sourceId)
    .maybeSingle();
  if (error || !data) return;
  const patch = {
    last_attempt_at: attemptedAt,
    consecutive_failure_count: ok ? 0 : Number(data.consecutive_failure_count || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  if (ok) patch.last_success_at = new Date().toISOString();
  const { error: updateError } = await db.from("mina_source_configs").update(patch).eq("id", sourceId);
  if (updateError) console.warn(`${sourceId}: unable to update source health: ${updateError.message}`);
}

async function updateQueryMetrics(db, fetched, normalized, runAt, queryResults = []) {
  const resultById = new Map(queryResults.map((result) => [result.queryId, result]));
  const queryIds = [...new Set([
    ...queryResults.map((result) => result.queryId),
    ...fetched.map((job) => job.queryId),
  ].filter(Boolean))];
  for (const queryId of queryIds) {
    const queryFetched = fetched.filter((job) => job.queryId === queryId);
    const queryMatched = normalized.filter((job) => job.source_evidence?.queryId === queryId);
    const { data, error } = await db.from("mina_search_queries").select("*").eq("id", queryId).maybeSingle();
    if (error || !data) continue;
    const queryResult = resultById.get(queryId);
    const succeeded = queryResult ? queryResult.ok : true;
    const patch = {
      last_run_at: runAt,
      updated_at: new Date().toISOString(),
    };
    if (!succeeded) {
      const { error: updateError } = await db.from("mina_search_queries").update(patch).eq("id", queryId);
      if (updateError) console.warn(`${queryId}: unable to update query attempt: ${updateError.message}`);
      continue;
    }
    const included = queryMatched.filter((job) => ["priority", "strong"].includes(job.quality_tier)).length;
    const stale = queryMatched.filter((job) => ["aging", "archive"].includes(job.freshness_bucket)).length;
    const verified = queryMatched.filter((job) => job.canonical_status === "open").length;
    const observedCount = Number(queryResult?.resultCount ?? queryFetched.length);
    const fetchedTotal = Number(data.fetched_count || 0) + observedCount;
    const admittedTotal = Number(data.admitted_count || 0) + queryMatched.length;
    const { error: updateError } = await db.from("mina_search_queries").update({
      ...patch,
      last_success_at: new Date().toISOString(),
      last_result_at: observedCount ? new Date().toISOString() : data.last_result_at,
      last_verified_job_at: verified ? new Date().toISOString() : data.last_verified_job_at,
      last_priority_strong_at: included ? new Date().toISOString() : data.last_priority_strong_at,
      fetched_count: fetchedTotal,
      admitted_count: admittedTotal,
      verified_count: Number(data.verified_count || 0) + verified,
      included_count: Number(data.included_count || 0) + included,
      stale_count: Number(data.stale_count || 0) + stale,
      rejected_count: Number(data.rejected_count || 0) + Math.max(0, observedCount - queryMatched.length),
      accepted_yield_rate: fetchedTotal ? admittedTotal / fetchedTotal : 0,
    }).eq("id", queryId);
    if (updateError) console.warn(`${queryId}: unable to update query metrics: ${updateError.message}`);
  }
}

async function verifyAndRescore(rawJob, initiallyScored) {
  if (rawJob.canonicalTrustedOpen) {
    return scoreJob({
      ...rawJob,
      canonicalStatus: "open",
      lastVerifiedAt: new Date().toISOString(),
      freshnessConfidence: rawJob.freshnessConfidence || "high",
    });
  }
  const verification = await verifyCanonical(rawJob.canonicalUrl || rawJob.applyUrl);
  const structured = verification.structured;
  const identityMatches = structured
    ? canonicalIdentityMatches(rawJob, structured)
    : canonicalVisibleTextMatches(rawJob, verification.visibleText);
  const discoveryOnlyPage = verification.status === "open" && isDiscoveryOnlyUrl(verification.canonicalUrl);
  const canonicalStatus = verification.status === "open" && (identityMatches !== true || discoveryOnlyPage)
    ? "error"
    : verification.status;
  const verifiedPostedAt = structured?.postedAt || rawJob.postedAt || "";
  const rescored = scoreJob({
    ...rawJob,
    title: identityMatches === false ? rawJob.title : structured?.title || rawJob.title,
    company: identityMatches === false ? rawJob.company : structured?.company || rawJob.company,
    location: identityMatches === false ? rawJob.location : structured?.location || rawJob.location,
    description: identityMatches === false
      ? rawJob.description
      : structured?.description || verification.visibleText || rawJob.description,
    employmentType: identityMatches === false ? rawJob.employmentType : structured?.employmentType || rawJob.employmentType,
    postedAt: verifiedPostedAt,
    sourceUpdatedAt: structured?.updatedAt || rawJob.sourceUpdatedAt,
    closesAt: structured?.closesAt || rawJob.closesAt,
    canonicalUrl: verification.canonicalUrl || rawJob.canonicalUrl,
    applyUrl: verification.canonicalUrl || rawJob.applyUrl,
    canonicalStatus,
    lastVerifiedAt: verification.verifiedAt,
    freshnessConfidence: structured?.postedAt ? "high" : rawJob.freshnessConfidence || "low",
    evidence: {
      ...rawJob.evidence,
      canonicalVerification: {
        status: canonicalStatus,
        httpStatus: verification.httpStatus,
        verifiedAt: verification.verifiedAt,
        structuredJobPosting: Boolean(structured),
        visibleTextFallback: !structured && identityMatches === true,
        discoveryOnlyPage,
        identityMatches,
        identifier: structured?.identifier || null,
        error: discoveryOnlyPage
          ? "Discovery result did not resolve to an employer or public ATS page."
          : identityMatches === false
            ? "Canonical title, employer, or location did not match the discovery candidate."
            : verification.error || undefined,
      },
    },
  });
  if (rescored) return rescored;
  if (!initiallyScored) return null;
  return {
    ...initiallyScored,
    canonical_status: canonicalStatus,
    last_verified_at: verification.verifiedAt,
    quality_tier: canonicalStatus === "closed" ? "archive" : "watch",
  };
}

function shouldVerifyBeforeScoring(job) {
  if (job.sourceFamily !== "whole_web") return false;
  return Boolean(matchTargetRole(clean(job.title)) && canonicalizeUrl(job.canonicalUrl || job.applyUrl));
}

function canonicalVisibleTextMatches(rawJob, visibleText) {
  if (!visibleText || tokenOverlap(rawJob.title, visibleText) < 0.8) return false;
  const rawCompany = cleanKey(rawJob.company).replace(/\b(?:inc|corp|corporation|company|ltd|limited|llc)\b/g, "").trim();
  const normalizedText = cleanKey(visibleText);
  const companyMatches = !rawCompany || rawCompany === "unknown company" || normalizedText.includes(rawCompany);
  const workModel = inferWorkModel(rawJob.location, visibleText);
  return companyMatches && isEligibleLocation(rawJob.location, visibleText, workModel);
}

function canonicalIdentityMatches(rawJob, structured) {
  const titleMatches = tokenOverlap(rawJob.title, structured.title) >= 0.6;
  const rawCompany = cleanKey(rawJob.company).replace(/\b(?:inc|corp|corporation|company|ltd|limited|llc)\b/g, "").trim();
  const canonicalCompany = cleanKey(structured.company).replace(/\b(?:inc|corp|corporation|company|ltd|limited|llc)\b/g, "").trim();
  const companyMatches = !rawCompany || rawCompany === "unknown company" || !canonicalCompany
    ? true
    : rawCompany.includes(canonicalCompany) || canonicalCompany.includes(rawCompany) || tokenOverlap(rawCompany, canonicalCompany) >= 0.7;
  return titleMatches && companyMatches;
}

function tokenOverlap(first, second) {
  const ignored = new Set(["senior", "sr", "the", "and", "of", "de", "des", "du", "et"]);
  const tokens = (value) => new Set(cleanKey(value).split(" ").filter((token) => token.length > 1 && !ignored.has(token)));
  const a = tokens(first);
  const b = tokens(second);
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / Math.min(a.size, b.size);
}

async function stageCandidates(db, jobs, discoveredAt, normalized = []) {
  if (!jobs.length) return;
  const evaluations = new Map(normalized.map((job) => [`${job.source}|${job.source_job_id}`, job]));
  const rows = jobs.map((job) => ({
    candidate_fingerprint: discoveryFingerprint({
      sourceFamily: job.sourceFamily,
      sourceName: job.source,
      sourceResultId: job.sourceJobId,
      url: job.canonicalUrl,
    }),
    source_family: job.sourceFamily,
    source_name: job.source,
    source_result_id: job.sourceJobId || null,
    query_id: job.sourceFamily === "whole_web" ? job.queryId || null : null,
    raw_title: clean(job.title),
    raw_company: clean(job.company),
    raw_location: clean(job.location),
    raw_snippet: stripHtml(job.description || "").slice(0, 2_000),
    source_url: canonicalizeUrl(job.canonicalUrl || job.applyUrl),
    displayed_date: job.postedAt || null,
    source_timestamp: validDate(job.sourceTimestamp),
    discovered_at: discoveredAt,
    source_rank: job.sourceRank || null,
    canonical_url: canonicalizeUrl(job.canonicalUrl || job.applyUrl) || null,
    employer_ats_id: evaluations.get(`${job.source}|${job.sourceJobId}`)?.source_evidence?.canonicalVerification?.identifier
      || (job.sourceFamily === "direct_ats" ? String(job.sourceJobId || "") || null : null),
    raw_evidence: evaluations.get(`${job.source}|${job.sourceJobId}`)?.source_evidence || job.evidence || {},
    extraction_status: evaluations.get(`${job.source}|${job.sourceJobId}`)?.canonical_status === "open"
      ? "verified"
      : evaluations.get(`${job.source}|${job.sourceJobId}`)?.canonical_status === "error" ? "failed" : "partial",
    eligibility_status: candidateEligibility(evaluations.get(`${job.source}|${job.sourceJobId}`)),
    rejection_gate: evaluations.has(`${job.source}|${job.sourceJobId}`) ? null : rejectionGate(job),
    rejection_reason: evaluations.has(`${job.source}|${job.sourceJobId}`) ? null : rejectionReason(job),
    duplicate_key: evaluations.get(`${job.source}|${job.sourceJobId}`)?.job_fingerprint || null,
    last_observed_at: discoveredAt,
    updated_at: discoveredAt,
  })).filter((row) => row.source_url);
  if (!rows.length) return;
  const { error } = await db.from("mina_discovery_candidates").upsert(rows, {
    onConflict: "candidate_fingerprint",
    ignoreDuplicates: false,
  });
  if (error) throw new Error(`Unable to stage candidates: ${error.message}`);
}

function candidateEligibility(job) {
  if (!job) return "rejected";
  if (!job.active) return "rejected";
  return ["priority", "strong"].includes(job.quality_tier) ? "accepted" : "watch";
}

function rejectionGate(job) {
  if (!matchTargetRole(clean(job.title))) return "title";
  if (!isEligibleLocation(clean(job.location), job.description, job.workModel)) return "location";
  return "normalization";
}

function rejectionReason(job) {
  const gate = rejectionGate(job);
  if (gate === "title") return "Title is outside Mina's bounded manager and business-partner taxonomy.";
  if (gate === "location") return "Location is not Montréal Island, Canada-remote, or explicitly Canada-based global.";
  return "Candidate could not be normalized safely.";
}

async function writeProvenance(db, savedRows, normalized, observedAt) {
  const byFingerprint = new Map(savedRows.map((row) => [row.job_fingerprint, row]));
  const rows = normalized.map((job) => {
    const saved = byFingerprint.get(job.job_fingerprint);
    if (!saved) return null;
    return {
      job_id: saved.id,
      source_family: String((job._discovery || job).source_evidence?.sourceFamily || "unknown"),
      source_name: (job._discovery || job).source,
      source_result_id: (job._discovery || job).source_job_id || null,
      source_url: canonicalizeUrl((job._discovery || job).canonical_url),
      query_id: (job._discovery || job).source_evidence?.sourceFamily === "whole_web"
        ? (job._discovery || job).source_evidence.queryId || null
        : null,
      source_posted_at: (job._discovery || job).source_posted_at,
      source_updated_at: (job._discovery || job).source_updated_at,
      last_seen_at: observedAt,
      evidence: (job._discovery || job).source_evidence || {},
    };
  }).filter((row) => row?.source_url);
  if (!rows.length) return;
  const { error } = await db.from("mina_job_sources").upsert(rows, {
    onConflict: "job_id,source_family,source_name,source_url",
  });
  if (error) throw new Error(`Unable to save job provenance: ${error.message}`);
}

async function linkStagedCandidates(db, savedRows, normalized) {
  const byFingerprint = new Map(savedRows.map((row) => [row.job_fingerprint, row]));
  for (const job of normalized) {
    const saved = byFingerprint.get(job.job_fingerprint);
    if (!saved) continue;
    const discovery = job._discovery || job;
    const status = !discovery.active
      ? "rejected"
      : ["priority", "strong"].includes(discovery.quality_tier) ? "accepted" : "watch";
    const { error } = await db.from("mina_discovery_candidates").update({
      extraction_status: discovery.canonical_status === "open" ? "verified" : discovery.canonical_status === "error" ? "failed" : "partial",
      eligibility_status: status,
      duplicate_key: job.job_fingerprint,
      promoted_job_id: saved.id,
      canonical_url: discovery.canonical_url,
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("source_name", discovery.source).eq("source_result_id", discovery.source_job_id);
    if (error) throw new Error(`Unable to link staged candidate: ${error.message}`);
  }
}

async function fetchGreenhouse(board, company) {
  const response = await fetchPublic(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    { headers: { "User-Agent": "MinaJobsPortal/1.0" } },
  );
  if (!response.ok) throw new Error(`Greenhouse returned ${response.status}`);
  const payload = await response.json();
  return (payload.jobs ?? []).map((job) => ({
    source: `greenhouse:${board}`,
    sourceJobId: String(job.id),
    canonicalUrl: job.absolute_url,
    applyUrl: job.absolute_url,
    title: job.title,
    company: job.company_name || company,
    location: job.location?.name || "",
    employmentType: metadataValue(job.metadata, "employment") || "",
    description: job.content || "",
    postedAt: job.first_published || job.updated_at || "",
    closesAt: job.application_deadline || "",
    workModel: inferWorkModel(job.location?.name, job.content),
    compensationText: job.content || "",
    evidence: { provider: "Greenhouse", board },
  }));
}

async function fetchAshby(board, company) {
  const response = await fetchPublic(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    { headers: { "User-Agent": "MinaJobsPortal/1.0" } },
  );
  if (!response.ok) throw new Error(`Ashby returned ${response.status}`);
  const payload = await response.json();
  return (payload.jobs ?? []).filter((job) => job.isListed !== false).map((job) => ({
    source: `ashby:${board}`,
    sourceJobId: String(job.id),
    canonicalUrl: job.jobUrl,
    applyUrl: job.applyUrl || job.jobUrl,
    title: job.title,
    company,
    location: ashbyLocation(job),
    employmentType: job.employmentType || "",
    description: job.descriptionHtml || job.descriptionPlain || "",
    postedAt: job.publishedAt || "",
    closesAt: "",
    workModel: ashbyWorkModel(job),
    compensationText: [
      job.compensation?.compensationTierSummary,
      job.compensation?.scrapeableCompensationSalarySummary,
      job.descriptionHtml,
    ].filter(Boolean).join(" "),
    evidence: { provider: "Ashby", board },
  }));
}

async function fetchLever(site, company) {
  const response = await fetchPublic(
    `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
    { headers: { "User-Agent": "MinaJobsPortal/1.0" } },
  );
  if (!response.ok) throw new Error(`Lever returned ${response.status}`);
  const jobs = await response.json();
  return (Array.isArray(jobs) ? jobs : []).map((job) => ({
    source: `lever:${site}`,
    sourceJobId: String(job.id),
    canonicalUrl: job.hostedUrl,
    applyUrl: job.applyUrl || job.hostedUrl,
    title: job.text,
    company,
    location: job.categories?.location || "",
    employmentType: job.categories?.commitment || "",
    description: [job.descriptionPlain, job.additionalPlain].filter(Boolean).join("\n\n"),
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : "",
    closesAt: "",
    workModel: inferWorkModel(job.categories?.location, job.workplaceType || job.descriptionPlain),
    compensationText: [job.salaryRange, job.descriptionPlain, job.additionalPlain].filter(Boolean).join(" "),
    evidence: { provider: "Lever", site },
  }));
}

async function fetchAdzuna(appId, appKey) {
  const queries = [
    { what: "HR Business Partner", where: "Montreal" },
    { what: "Human Resources Manager", where: "Montreal" },
    { what: "People Operations Manager", where: "Montreal" },
    { what: "Talent Acquisition Manager", where: "Montreal" },
    { what: "Gestionnaire acquisition de talents", where: "Montreal" },
    { what: "Partenaire affaires ressources humaines", where: "Montreal" },
    { what: "Global Talent Acquisition Manager", where: "Canada" },
    { what: "International Recruitment Manager", where: "Canada" },
    { what: "People Partner remote", where: "Canada" },
  ];
  const batches = await Promise.all(
    queries.map(async (query) => {
      const url = new URL("https://api.adzuna.com/v1/api/jobs/ca/search/1");
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "50");
      url.searchParams.set("what", query.what);
      url.searchParams.set("where", query.where);
      url.searchParams.set("sort_by", "date");
      url.searchParams.set("content-type", "application/json");
      const response = await fetchPublic(url, { headers: { "User-Agent": "MinaJobsPortal/1.0" } });
      if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
      return ((await response.json()).results ?? []).map((job) => ({ ...job, searchQuery: query }));
    }),
  );
  const seen = new Set();
  return batches.flat().filter((job) => {
    if (seen.has(String(job.id))) return false;
    seen.add(String(job.id));
    return true;
  }).map((job) => ({
    source: "adzuna:canada",
    sourceJobId: String(job.id),
    canonicalUrl: job.redirect_url,
    applyUrl: job.redirect_url,
    title: job.title,
    company: job.company?.display_name || "Unknown company",
    location: job.location?.display_name || "Montréal",
    employmentType: job.contract_type || job.contract_time || "",
    description: job.description || "",
    postedAt: job.created || "",
    closesAt: "",
    workModel: inferWorkModel(job.location?.display_name, job.description),
    salaryMin: dollarsToCents(job.salary_min),
    salaryMax: dollarsToCents(job.salary_max),
    salaryCurrency: "CAD",
    compensationText: "",
    evidence: { provider: "Adzuna", category: job.category?.label || "", query: job.searchQuery },
  }));
}

function scoreJob(job) {
  const title = clean(job.title);
  const location = clean(job.location);
  const roleMatch = matchTargetRole(title);
  if (!roleMatch) return null;
  if (!isEligibleLocation(location, job.description, job.workModel)) return null;

  const roleFamily = roleMatch.family;
  const parsedSalary = parseSalary(job.compensationText || "");
  const salaryMin = job.salaryMin ?? parsedSalary.min;
  const salaryMax = job.salaryMax ?? parsedSalary.max;
  const salaryCurrency = job.salaryCurrency ?? parsedSalary.currency ?? "CAD";
  const salaryCeiling = salaryMax ?? salaryMin;
  const knownBelowFloor = Boolean(salaryCeiling && salaryCurrency === "CAD" && salaryCeiling < ACCEPTABLE_SALARY_CENTS);
  const salaryIsEstimated = job.salaryMin == null && job.salaryMax == null && Boolean(parsedSalary.estimated);
  const reasons = [roleReason(roleFamily)];
  const flags = [];
  const scoreBreakdown = {
    responsibility: roleFamily === "other" ? 0 : 25,
    cvEvidence: 0,
    freshness: 0,
    compensation: 0,
    location: 0,
    preference: 0,
    reachability: canonicalizeUrl(job.applyUrl || job.canonicalUrl) ? 3 : 0,
  };

  if (isMontrealIsland(location, job.description)) {
    scoreBreakdown.location = 10;
    reasons.push("Located on Montréal Island");
  } else if (isRemoteCanada(location, job.description)) {
    scoreBreakdown.location = 9;
    reasons.push("Remote role open to candidates in Canada");
  } else if (isCanadaBasedGlobalRole(location, job.description)) {
    scoreBreakdown.location = 8;
    reasons.push("Global role is explicitly based in Canada");
  }
  if (job.workModel === "remote" || job.workModel === "hybrid") {
    reasons.push(`${capitalize(job.workModel)} work model is stated`);
  }
  if (salaryCurrency !== "CAD" && (salaryMin || salaryMax)) {
    flags.push(`Salary is posted in ${salaryCurrency}; not compared with Mina's CAD target`);
  } else if (salaryMin && salaryMin >= TARGET_SALARY_CENTS) {
    scoreBreakdown.compensation = 15;
    reasons.push("Posted salary floor meets the CAD 110k target");
  } else if (salaryMin && salaryMin >= ACCEPTABLE_SALARY_CENTS) {
    scoreBreakdown.compensation = 12;
    reasons.push("Posted salary floor is within Mina's acceptable CAD 107k–110k band");
  } else if (salaryCeiling && salaryCeiling >= TARGET_SALARY_CENTS) {
    scoreBreakdown.compensation = 7;
    reasons.push("Posted salary range overlaps the CAD 110k target");
    flags.push("Salary floor may be below CAD 107k");
  } else if (salaryCeiling && salaryCeiling >= ACCEPTABLE_SALARY_CENTS) {
    scoreBreakdown.compensation = 5;
    reasons.push("Posted salary range reaches Mina's acceptable CAD 107k band");
    flags.push("Salary floor is below the preferred range");
  } else if (salaryCeiling && salaryCeiling < ACCEPTABLE_SALARY_CENTS) {
    flags.push("Posted salary appears below CAD 107k");
  } else {
    flags.push("Salary not posted");
  }
  if (salaryIsEstimated) flags.push("Hourly salary annualized at 2,080 hours");
  if (/contract|temporary|fixed[- ]term/i.test(job.employmentType || title)) {
    flags.push("Contract or temporary role");
  }
  const freshness = freshnessFor(job.postedAt);
  scoreBreakdown.freshness = { hot: 20, fresh: 16, recent: 10 }[freshness.bucket] || 0;
  if (freshness.queueEligible) reasons.push(`Employer posting is ${freshness.bucket}`);
  else if (freshness.bucket === "unknown") flags.push("Employer posting date could not be verified");
  else flags.push("Employer posting is older, but the role is still open");

  const evidence = scoreProfileEvidence(`${title} ${stripHtml(job.description || "")}`, flags);
  scoreBreakdown.cvEvidence = Math.min(20, evidence.score);
  reasons.push(...evidence.reasons);

  if (/fashion|apparel|cosmetics|beauty|athletic wear|sportswear|consumer brand/i.test(`${job.company} ${job.description}`)) {
    scoreBreakdown.preference = 7;
  } else if (/canadian[- ](?:owned|founded|headquartered)|canada[- ]based|founded in canada|canadian company/i.test(`${job.company} ${job.description}`)) {
    scoreBreakdown.preference = 4;
  }

  const score = Object.values(scoreBreakdown).reduce((total, value) => total + Number(value || 0), 0);
  const canonicalStatus = job.canonicalStatus || (job.canonicalTrustedOpen ? "open" : "unverified");
  const freshnessConfidence = job.freshnessConfidence || (job.postedAt ? "high" : "low");
  let tier = qualityTier({ score, freshnessBucket: freshness.bucket, canonicalStatus });
  if (freshnessConfidence !== "high") tier = freshness.bucket === "archive" ? "archive" : "watch";
  if (knownBelowFloor || /contract|temporary|fixed[- ]term/i.test(job.employmentType || title)) {
    tier = freshness.bucket === "archive" ? "archive" : "watch";
  }

  const now = new Date().toISOString();
  return {
    source: job.source,
    source_job_id: job.sourceJobId,
    canonical_url: job.canonicalUrl,
    apply_url: job.applyUrl || job.canonicalUrl,
    job_fingerprint: fingerprint(job.company, title, location, job.postedAt),
    title,
    company: clean(job.company),
    location,
    work_model: job.workModel,
    employment_type: clean(job.employmentType || ""),
    description: stripHtml(job.description || "").trim().slice(0, 80_000),
    role_family: roleFamily,
    posted_at: validDate(job.postedAt),
    source_posted_at: validDate(job.postedAt),
    source_updated_at: validDate(job.sourceUpdatedAt),
    closes_at: validDate(job.closesAt),
    salary_min_cents: salaryMin,
    salary_max_cents: salaryMax,
    salary_currency: salaryCurrency,
    salary_period: "year",
    salary_is_estimated: salaryIsEstimated,
    match_score: Math.max(0, Math.min(100, score)),
    fit_reasons: [...new Set(reasons.filter(Boolean))],
    flags: [...new Set(flags)],
    requirements: [],
    source_evidence: {
      ...job.evidence,
      sourceFamily: job.sourceFamily || "unknown",
      queryId: job.queryId || null,
      matchedRoleAlias: roleMatch.alias,
      verifiedAt: now,
    },
    date_evidence: {
      sourcePostedAt: validDate(job.postedAt),
      sourceUpdatedAt: validDate(job.sourceUpdatedAt),
      confidence: job.freshnessConfidence || (job.postedAt ? "high" : "low"),
      firstSeenIsNotPostingDate: true,
    },
    score_breakdown: scoreBreakdown,
    canonical_status: canonicalStatus,
    freshness_bucket: freshness.bucket,
    freshness_confidence: freshnessConfidence,
    quality_tier: tier,
    last_verified_at: validDate(job.lastVerifiedAt),
    active: canonicalStatus === "open" && !knownBelowFloor,
    first_seen_at: now,
    last_seen_at: now,
    updated_at: now,
  };
}

async function expireMissingJobs(db, source, activeIds) {
  const { data, error } = await db
    .from("mina_jobs")
    .select("id, source_job_id")
    .eq("source", source)
    .eq("active", true);
  if (error) throw new Error(error.message);
  const current = new Set(activeIds.filter(Boolean).map(String));
  const expired = (data ?? []).filter((row) => !current.has(String(row.source_job_id))).map((row) => row.id);
  if (!expired.length) return;
  const { error: updateError } = await db
    .from("mina_jobs")
    .update({ active: false, updated_at: new Date().toISOString() })
    .in("id", expired);
  if (updateError) throw new Error(updateError.message);
}

async function reuseExistingFingerprints(db, source, jobs) {
  const sourceIds = jobs.map((job) => job.source_job_id).filter(Boolean);
  if (!sourceIds.length) return jobs;
  const { data, error } = await db
    .from("mina_jobs")
    .select("source_job_id, job_fingerprint, source_posted_at, posted_at, first_seen_at")
    .eq("source", source)
    .in("source_job_id", sourceIds);
  if (error) throw new Error(error.message);
  const existing = new Map((data ?? []).map((row) => [String(row.source_job_id), row]));
  return jobs.map((job) => {
    const prior = existing.get(String(job.source_job_id));
    const originalPostedAt = earliestDate(prior?.source_posted_at || prior?.posted_at, job.source_posted_at);
    const merged = {
      ...job,
      job_fingerprint: prior?.job_fingerprint ?? job.job_fingerprint,
      source_posted_at: originalPostedAt,
      posted_at: originalPostedAt,
    };
    if (prior?.first_seen_at) merged.first_seen_at = prior.first_seen_at;
    return merged;
  });
}

async function mergeCrossSourceDuplicates(db, source, jobs) {
  const urls = [...new Set(jobs.map((job) => canonicalizeUrl(job.canonical_url)).filter(Boolean))];
  const identifiers = [...new Set(jobs.map((job) => job.source_evidence?.canonicalVerification?.identifier).filter(Boolean).map(String))];
  if (!urls.length && !identifiers.length) return jobs;
  const canonicalRequest = urls.length
    ? db.from("mina_jobs").select("*").in("canonical_url", urls)
    : Promise.resolve({ data: [], error: null });
  const provenanceRequest = urls.length
    ? db.from("mina_job_sources").select("job_id, source_url").in("source_url", urls)
    : Promise.resolve({ data: [], error: null });
  const identifierRequest = identifiers.length
    ? db.from("mina_discovery_candidates").select("employer_ats_id, promoted_job_id").in("employer_ats_id", identifiers).not("promoted_job_id", "is", null)
    : Promise.resolve({ data: [], error: null });
  const [
    { data: canonicalRows, error: canonicalError },
    { data: provenanceRows, error: provenanceError },
    { data: identifierRows, error: identifierError },
  ] = await Promise.all([canonicalRequest, provenanceRequest, identifierRequest]);
  if (canonicalError) throw new Error(canonicalError.message);
  if (provenanceError) throw new Error(provenanceError.message);
  if (identifierError) throw new Error(identifierError.message);

  const jobIds = [...new Set([
    ...(provenanceRows ?? []).map((row) => row.job_id),
    ...(identifierRows ?? []).map((row) => row.promoted_job_id),
  ].filter(Boolean))];
  let sourcedRows = [];
  if (jobIds.length) {
    const { data, error } = await db.from("mina_jobs").select("*").in("id", jobIds);
    if (error) throw new Error(error.message);
    sourcedRows = data ?? [];
  }
  const rowsById = new Map([...(canonicalRows ?? []), ...sourcedRows].map((row) => [row.id, row]));
  const byUrl = new Map((canonicalRows ?? []).map((row) => [canonicalizeUrl(row.canonical_url), row]));
  for (const provenance of provenanceRows ?? []) {
    const row = rowsById.get(provenance.job_id);
    if (row) byUrl.set(canonicalizeUrl(provenance.source_url), row);
  }
  const byIdentifier = new Map();
  for (const candidate of identifierRows ?? []) {
    const row = rowsById.get(candidate.promoted_job_id);
    if (row) byIdentifier.set(String(candidate.employer_ats_id), row);
  }

  return jobs.map((job) => {
    const identifier = job.source_evidence?.canonicalVerification?.identifier;
    const existing = byUrl.get(canonicalizeUrl(job.canonical_url)) || byIdentifier.get(String(identifier || ""));
    return existing ? mergeCanonicalDuplicate(existing, job, source.family) : job;
  });
}

function mergeCanonicalDuplicate(existing, incoming, incomingFamily) {
  const originalPostedAt = earliestDate(existing.source_posted_at || existing.posted_at, incoming.source_posted_at);
  const existingIsDirect = /^(?:greenhouse|ashby|lever):/.test(existing.source || "");
  if (incomingFamily !== "direct_ats" && existingIsDirect) {
    const preserved = { ...existing };
    delete preserved.id;
    delete preserved.created_at;
    return {
      ...preserved,
      first_seen_at: existing.first_seen_at,
      last_seen_at: incoming.last_seen_at,
      updated_at: incoming.updated_at,
      active: existing.active && incoming.canonical_status !== "closed",
      source_posted_at: originalPostedAt,
      posted_at: originalPostedAt,
      _discovery: { ...incoming },
      _mergedExisting: true,
    };
  }
  return {
    ...incoming,
    job_fingerprint: existing.job_fingerprint,
    first_seen_at: existing.first_seen_at,
    source_posted_at: originalPostedAt,
    posted_at: originalPostedAt,
    _discovery: { ...incoming },
    _mergedExisting: true,
  };
}

function withoutInternalFields(job) {
  const row = { ...job };
  delete row._discovery;
  delete row._mergedExisting;
  return row;
}

async function writeReceipt(db, receipt, startedAt) {
  const { error } = await db.from("mina_source_runs").insert({
    source: receipt.source,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    ok: receipt.ok,
    fetched_count: receipt.fetched,
    matched_count: receipt.matched,
    upserted_count: receipt.upserted,
    rejected_count: Math.max(0, receipt.fetched - receipt.candidates),
    duration_ms: receipt.durationMs,
    partial_coverage: false,
    configured_family_count: 1,
    successful_family_count: receipt.ok ? 1 : 0,
    provider: receipt.source.split(":")[0],
    error: receipt.error || null,
    query_count: receipt.queriesAttempted || 0,
    details: {
      targetSalaryCad: TARGET_SALARY_CENTS / 100,
      sourceFamily: receipt.family,
      candidates: receipt.candidates,
      canonicalVerified: receipt.verified,
      queriesAttempted: receipt.queriesAttempted,
      queriesSucceeded: receipt.queriesSucceeded,
      queryFailures: receipt.queryFailures,
    },
  });
  if (error) console.warn(`${receipt.source}: unable to save source receipt: ${error.message}`);
}

function mergeBoards(defaults, raw) {
  const merged = { ...defaults };
  for (const token of String(raw || "").split(",").map((item) => item.trim()).filter(Boolean)) {
    const [id, label] = token.split(":").map((item) => item.trim());
    if (id) merged[id] = label || titleCase(id);
  }
  return merged;
}

function parseSalary(value) {
  const text = stripHtml(String(value || ""));
  const hourly = text.match(/(?:CA\$|US\$|\$)?\s*(?<![\d,])(\d{1,3}(?:[.,]\d{1,4})?)(?![\d,])(?:\s*(?:-|–|—|to|à)\s*(?:CA\$|US\$|\$)?\s*(\d{1,3}(?:[.,]\d{1,4})?)(?![\d,]))?\s*(?:hourly|per hour|\/\s*(?:h|hr|heure))/i);
  if (hourly) {
    const hourlyMin = decimalNumber(hourly[1]);
    const hourlyMax = decimalNumber(hourly[2]);
    if (hourlyMin > 0 && hourlyMin <= 250 && (!hourlyMax || (hourlyMax >= hourlyMin && hourlyMax <= 250))) {
      return {
        min: Math.round(hourlyMin * 2_080 * 100),
        max: hourlyMax ? Math.round(hourlyMax * 2_080 * 100) : null,
        currency: /(?:USD|US\$)/i.test(text) ? "USD" : "CAD",
        estimated: true,
      };
    }
  }
  if (/(?:hourly|per hour|\/\s*(?:h|hr|heure))/i.test(text)) {
    return { min: null, max: null, currency: null };
  }
  const match = text.match(
    /(?:(CA|US)\$|(CAD|USD)\s*\$|\$)\s*([\d,]{5,})(?:\.\d{2})?(?:\s*(?:-|–|—|to)\s*(?:(CA|US)\$|(CAD|USD)\s*\$|\$)?\s*([\d,]{5,})(?:\.\d{2})?)?\s*(CAD|USD)?/i,
  );
  const frenchMatch = match
    ? null
    : text.match(/([\d ]{5,})(?:[,.]\d{2})?\s*\$(?:\s*(?:-|–|—|à)\s*([\d ]{5,})(?:[,.]\d{2})?\s*\$)?\s*(CAD)?/i);
  if (!match && !frenchMatch) return { min: null, max: null, currency: null };
  const firstRaw = match?.[3] ?? frenchMatch?.[1] ?? "";
  const secondRaw = match?.[6] ?? frenchMatch?.[2] ?? "";
  const first = dollarsToCents(Number(firstRaw.replace(/[ ,]/g, "")));
  const second = dollarsToCents(Number(secondRaw.replace(/[ ,]/g, "")));
  const currencyToken = match
    ? [match[1], match[2], match[4], match[5], match[7]].find(Boolean)?.toUpperCase()
    : "CAD";
  const currency = currencyToken?.startsWith("US") ? "USD" : "CAD";
  if (!first || first < 5_000_000 || first > 40_000_000) return { min: null, max: null, currency: null };
  if (second && (second < first || second > 40_000_000)) return { min: first, max: null, currency };
  return { min: first, max: second || null, currency };
}

function decimalNumber(value) {
  const normalized = String(value || "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatSalary(job) {
  if (!job.salary_min_cents && !job.salary_max_cents) return "salary not posted";
  const dollars = (cents) => cents ? `$${Math.round(cents / 100).toLocaleString("en-CA")}` : "?";
  return job.salary_max_cents
    ? `${dollars(job.salary_min_cents)}–${dollars(job.salary_max_cents)} ${job.salary_currency}`
    : `${dollars(job.salary_min_cents)} ${job.salary_currency}`;
}

function inferWorkModel(location, description) {
  const text = `${location || ""} ${stripHtml(description || "")}`;
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\bremote\b|work from home/i.test(text)) return "remote";
  if (/on[- ]site|in office|office-based/i.test(text)) return "on_site";
  return "unknown";
}

function ashbyWorkModel(job) {
  if (/hybrid/i.test(job.workplaceType || "")) return "hybrid";
  if (job.isRemote || /remote/i.test(job.workplaceType || "")) return "remote";
  if (/onsite|on-site/i.test(job.workplaceType || "")) return "on_site";
  return inferWorkModel(job.location, job.descriptionHtml);
}

function ashbyLocation(job) {
  const locations = [
    job.location,
    ...(Array.isArray(job.secondaryLocations) ? job.secondaryLocations.map((entry) => entry?.location) : []),
  ].map((value) => clean(value)).filter(Boolean);
  const unique = [...new Set(locations)];
  if (job.isRemote || /remote/i.test(job.workplaceType || "")) {
    return unique.length ? `Remote — ${unique.join(", ")}` : "Remote";
  }
  return unique.join(", ");
}

function scoreProfileEvidence(text, flags) {
  const reasons = [];
  let score = 0;
  const add = (pattern, points, reason) => {
    if (!pattern.test(text)) return;
    score += points;
    reasons.push(reason);
  };

  add(/bilingual|english.{0,40}french|french.{0,40}english|fran[cç]ais/i, 5, "Her bilingual English–French background is directly relevant");
  add(/employee relations|employee lifecycle|benefits|leave|accommodation|human resources policy|hr policy/i, 4, "Matches her employee-relations and HR lifecycle experience");
  add(/workforce planning|compensation|talent strategy|coach(?:ing)? leaders?|leader advisory/i, 4, "Matches her workforce planning and leader-advisory work");
  add(/talent acquisition|recruiting|recruitment/i, 5, "Draws on her recruiting leadership background");
  add(/successfactors|service ?now|workday|\bhris\b/i, 3, "Matches her HR systems and process-transformation experience");
  add(/qu[ée]bec.{0,40}(?:law|legislation|labour|labor)|bill 96|employment (?:law|legislation)/i, 4, "Values Québec employment-law knowledge");
  add(/fashion|apparel|cosmetics|beauty|athletic wear|sportswear|consumer brand/i, 6, "Matches her interest in consumer brands, fashion, beauty, or athletic wear");
  add(/canadian[- ](?:owned|founded|headquartered)|canada[- ]based|founded in canada|canadian company/i, 4, "Matches her preference for Canadian businesses");
  add(/global talent acquisition|international recruitment|global recruiting|international hiring/i, 5, "Matches her interest in global and international recruiting leadership");
  add(/travel required|international travel|global travel|willingness to travel/i, 2, "Required travel is compatible with her preferences");

  if (/\b(?:crha|chrp)\b.{0,80}(?:required|mandatory|must have)|(?:required|mandatory|must have).{0,80}\b(?:crha|chrp)\b/i.test(text)) {
    score -= 6;
    flags.push("CRHA/CHRP required; not listed on the CV");
  } else if (/\b(?:crha|chrp)\b/i.test(text)) {
    flags.push("CRHA/CHRP is mentioned; not listed on the CV");
  }
  if (/(?:8|9|10)\+? years?.{0,60}(?:hr business partner|human resources business partner|strategic hr)/i.test(text)) {
    flags.push("May require 8+ years of direct strategic HRBP experience");
  }
  return { score, reasons };
}

function roleReason(role) {
  return {
    hr_business_partner: "Direct HR business partner scope",
    recruiting_manager: "Matches recruiting leadership target",
    hr_manager: "Matches HR manager target",
    people_operations: "People operations leadership is a close title match",
    other: "Related HR leadership title",
  }[role];
}

function metadataValue(metadata, needle) {
  const item = Array.isArray(metadata)
    ? metadata.find((entry) => String(entry?.name || "").toLowerCase().includes(needle))
    : null;
  return item?.value ? String(item.value) : "";
}

function fingerprint(company, title, location, postedAt) {
  const region = isMontrealIsland(location) ? "montreal" : isRemoteCanada(location, "", "remote") ? "canada" : cleanKey(location);
  const posted = validDate(postedAt);
  const week = posted ? Math.floor(Date.parse(posted) / (7 * 86_400_000)) : "unknown";
  return createHash("sha256")
    .update([cleanKey(company), cleanKey(title), region, week].join("|"))
    .digest("hex");
}

function earliestDate(first, second) {
  const values = [validDate(first), validDate(second)].filter(Boolean).sort();
  return values[0] || null;
}

function cleanKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  let decoded = String(value || "");
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decoded
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&mdash;|&#8212;/gi, "—")
      .replace(/&ndash;|&#8211;/gi, "–")
      .replace(/&nbsp;/gi, " ");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function dollarsToCents(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 100) : null;
}

function validDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCase(value) {
  return String(value).replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function fetchPublic(url, options = {}, timeoutMs = 15_000) {
  return fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(timeoutMs) });
}

async function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const raw = await readFile(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = String(match[2] || "").trim().replace(/^[\"']|[\"']$/g, "");
  }
  return env;
}

export { ashbyLocation, buildCoverageSummary, canonicalIdentityMatches, fingerprint, isEligibleLocation, matchTargetRole, mergeCanonicalDuplicate, parseSalary, runMinaJobScan, scanSource, scoreJob, stripHtml };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMinaJobScan()
    .then((summary) => {
      if (!summary.successfulSources || summary.partialCoverage) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
