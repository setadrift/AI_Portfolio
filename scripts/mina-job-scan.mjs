#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");
const TARGET_SALARY_CENTS = 11_000_000;
const ACCEPTABLE_SALARY_CENTS = 10_700_000;
const TITLE_PATTERN =
  /(?:senior\s+)?(?:hr|human resources)\s+(?:business partner|manager)|(?:senior\s+manager,?\s*)?(?:hr|human resources)\s+business partner|(?:senior\s+)?people partner|people (?:operations|& culture|and culture) manager|(?:global\s+)?talent acquisition manager|manager,?\s*(?:global\s+)?talent acquisition|(?:global\s+)?recruit(?:ing|ment) manager|manager,?\s*(?:global\s+)?recruit(?:ing|ment)|international recruitment(?:\s*(?:&|and)\s*(?:hr|human resources))? manager|gestionnaire(?:\s+de\s+l['’])?,?\s+acquisition\s+de\s+talents|partenaire\s+d['’]affaires,?\s+(?:ressources humaines|rh)|gestionnaire\s+(?:des\s+)?ressources humaines|directeur(?:trice)?\s+(?:des\s+)?ressources humaines/i;

const DEFAULT_GREENHOUSE_BOARDS = {
  stackadapt: "StackAdapt",
  hootsuite: "Hootsuite",
};

const DEFAULT_ASHBY_BOARDS = {
  koho: "KOHO",
  cohere: "Cohere",
  beaconsoftware: "Beacon Software",
  homebase: "Homebase",
  ignition: "Ignition",
  semperis: "Semperis",
  "1password": "1Password",
};

const DEFAULT_LEVER_SITES = {
  knix: "Knix",
  eqbank: "EQ Bank",
  dulcedo: "Dulcedo Management",
  pointclickcare: "PointClickCare",
};

async function main() {
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
  const sources = [
    ...Object.entries(mergeBoards(DEFAULT_GREENHOUSE_BOARDS, env.MINA_GREENHOUSE_BOARDS)).map(
      ([board, company]) => ({
        name: `greenhouse:${board}`,
        fetch: () => fetchGreenhouse(board, company),
      }),
    ),
    ...Object.entries(mergeBoards(DEFAULT_ASHBY_BOARDS, env.MINA_ASHBY_BOARDS)).map(
      ([board, company]) => ({
        name: `ashby:${board}`,
        fetch: () => fetchAshby(board, company),
      }),
    ),
    ...Object.entries(mergeBoards(DEFAULT_LEVER_SITES, env.MINA_LEVER_SITES)).map(
      ([site, company]) => ({
        name: `lever:${site}`,
        fetch: () => fetchLever(site, company),
      }),
    ),
  ];

  if (env.MINA_ADZUNA_APP_ID && env.MINA_ADZUNA_APP_KEY) {
    sources.push({
      name: "adzuna:canada",
      fetch: () => fetchAdzuna(env.MINA_ADZUNA_APP_ID, env.MINA_ADZUNA_APP_KEY),
    });
  }

  const receipts = [];
  for (const source of sources) {
    receipts.push(await scanSource(db, source));
  }

  const summary = {
    dryRun: DRY_RUN,
    sources: receipts.length,
    successfulSources: receipts.filter((receipt) => receipt.ok).length,
    fetched: sum(receipts, "fetched"),
    matched: sum(receipts, "matched"),
    upserted: sum(receipts, "upserted"),
    errors: receipts.filter((receipt) => !receipt.ok).map((receipt) => ({ source: receipt.source, error: receipt.error })),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.successfulSources || summary.errors.length) process.exitCode = 1;
}

async function scanSource(db, source) {
  const startedAt = new Date().toISOString();
  try {
    const fetched = await source.fetch();
    let normalized = fetched.map((job) => scoreJob(job)).filter(Boolean);
    if (VERBOSE) {
      for (const job of normalized) {
        console.log(`  ${job.match_score} · ${job.title} · ${job.company} · ${job.location} · ${formatSalary(job)}`);
      }
    }
    let upserted = 0;

    if (!DRY_RUN) {
      normalized = await reuseExistingFingerprints(db, source.name, normalized);
    }
    if (!DRY_RUN && normalized.length) {
      const { data, error } = await db
        .from("mina_jobs")
        .upsert(normalized, { onConflict: "job_fingerprint" })
        .select("id");
      if (error) throw new Error(error.message);
      upserted = data?.length ?? 0;
    }
    if (!DRY_RUN) {
      await expireMissingJobs(db, source.name, normalized.map((job) => job.source_job_id));
    }

    const receipt = {
      source: source.name,
      ok: true,
      fetched: fetched.length,
      matched: normalized.length,
      upserted,
      error: "",
    };
    if (!DRY_RUN) await writeReceipt(db, receipt, startedAt);
    console.log(`${source.name}: ${fetched.length} fetched, ${normalized.length} matched${DRY_RUN ? " (dry run)" : ""}`);
    return receipt;
  } catch (error) {
    const receipt = {
      source: source.name,
      ok: false,
      fetched: 0,
      matched: 0,
      upserted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
    if (!DRY_RUN) await writeReceipt(db, receipt, startedAt);
    console.warn(`${source.name}: ${receipt.error}`);
    return receipt;
  }
}

async function fetchGreenhouse(board, company) {
  const response = await fetch(
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
  const response = await fetch(
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
    location: job.location || "",
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
  const response = await fetch(
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
    "HR Business Partner",
    "Human Resources Manager",
    "Recruiting Manager",
    "Talent Acquisition Manager",
    "Global Talent Acquisition Manager",
    "International Recruitment Manager",
    "International Recruitment HR Manager",
    "Gestionnaire acquisition de talents",
    "Partenaire affaires ressources humaines",
    "Gestionnaire ressources humaines",
    "People Partner",
    "People Operations Manager",
  ];
  const batches = await Promise.all(
    queries.map(async (query) => {
      const url = new URL("https://api.adzuna.com/v1/api/jobs/ca/search/1");
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "50");
      url.searchParams.set("what", query);
      url.searchParams.set("where", "Montreal");
      url.searchParams.set("salary_min", "100000");
      url.searchParams.set("sort_by", "date");
      url.searchParams.set("content-type", "application/json");
      const response = await fetch(url, { headers: { "User-Agent": "MinaJobsPortal/1.0" } });
      if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
      return (await response.json()).results ?? [];
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
    evidence: { provider: "Adzuna", category: job.category?.label || "" },
  }));
}

function scoreJob(job) {
  const title = clean(job.title);
  const location = clean(job.location);
  if (!TITLE_PATTERN.test(title)) return null;
  if (!isEligibleLocation(location, job.description, job.workModel)) return null;

  const roleFamily = classifyRole(title);
  const parsedSalary = parseSalary(job.compensationText || "");
  const salaryMin = job.salaryMin ?? parsedSalary.min;
  const salaryMax = job.salaryMax ?? parsedSalary.max;
  const salaryCurrency = job.salaryCurrency ?? parsedSalary.currency ?? "CAD";
  const reasons = [roleReason(roleFamily)];
  const flags = [];
  let score = 24;

  if (roleFamily !== "other") score += 24;
  if (isMontrealIsland(location, job.description)) {
    score += 10;
    reasons.push("Located on Montréal Island");
  } else if (isRemoteCanada(location, job.description)) {
    score += 8;
    reasons.push("Remote role open to candidates in Canada");
  }
  if (job.workModel === "remote" || job.workModel === "hybrid") {
    score += 3;
    reasons.push(`${capitalize(job.workModel)} work model is stated`);
  }
  if (salaryCurrency !== "CAD" && (salaryMin || salaryMax)) {
    flags.push(`Salary is posted in ${salaryCurrency}; not compared with Mina's CAD target`);
  } else if (salaryMin && salaryMin >= TARGET_SALARY_CENTS) {
    score += 20;
    reasons.push("Posted salary floor meets the CAD 110k target");
  } else if (salaryMin && salaryMin >= ACCEPTABLE_SALARY_CENTS) {
    score += 15;
    reasons.push("Posted salary floor is within Mina's acceptable CAD 107k–110k band");
  } else if (salaryMax && salaryMax >= TARGET_SALARY_CENTS) {
    score += 10;
    reasons.push("Posted salary range reaches the CAD 110k target");
    flags.push("Salary floor may be below CAD 107k");
  } else if (salaryMax && salaryMax >= ACCEPTABLE_SALARY_CENTS) {
    score += 7;
    reasons.push("Posted salary range reaches Mina's acceptable CAD 107k band");
    flags.push("Salary floor is below the preferred range");
  } else if (salaryMax && salaryMax < ACCEPTABLE_SALARY_CENTS) {
    score -= 16;
    flags.push("Posted salary appears below CAD 107k");
  } else {
    flags.push("Salary not posted");
  }
  if (/contract|temporary|fixed[- ]term/i.test(job.employmentType || title)) {
    score -= 8;
    flags.push("Contract or temporary role");
  }
  if (isFresh(job.postedAt, 7)) {
    score += 7;
    reasons.push("Posted within the last week");
  }

  const evidence = scoreProfileEvidence(`${title} ${stripHtml(job.description || "")}`, flags);
  score += evidence.score;
  reasons.push(...evidence.reasons);

  const now = new Date().toISOString();
  return {
    source: job.source,
    source_job_id: job.sourceJobId,
    canonical_url: job.canonicalUrl,
    apply_url: job.applyUrl || job.canonicalUrl,
    job_fingerprint: fingerprint(job.company, title, location),
    title,
    company: clean(job.company),
    location,
    work_model: job.workModel,
    employment_type: clean(job.employmentType || ""),
    description: String(job.description || "").slice(0, 80_000),
    role_family: roleFamily,
    posted_at: validDate(job.postedAt),
    closes_at: validDate(job.closesAt),
    salary_min_cents: salaryMin,
    salary_max_cents: salaryMax,
    salary_currency: salaryCurrency,
    salary_period: "year",
    salary_is_estimated: false,
    match_score: Math.max(0, Math.min(100, score)),
    fit_reasons: [...new Set(reasons.filter(Boolean))],
    flags: [...new Set(flags)],
    requirements: [],
    source_evidence: { ...job.evidence, verifiedAt: now },
    active: true,
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
    .select("source_job_id, job_fingerprint")
    .eq("source", source)
    .in("source_job_id", sourceIds);
  if (error) throw new Error(error.message);
  const fingerprints = new Map(
    (data ?? []).map((row) => [String(row.source_job_id), String(row.job_fingerprint)]),
  );
  return jobs.map((job) => ({
    ...job,
    job_fingerprint: fingerprints.get(String(job.source_job_id)) ?? job.job_fingerprint,
  }));
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
    error: receipt.error || null,
    details: { targetSalaryCad: TARGET_SALARY_CENTS / 100 },
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
  const match = text.match(
    /(?:(CA|US)\$|(CAD|USD)\s*\$|\$)\s*([\d,]{5,})(?:\s*(?:-|–|—|to)\s*(?:(CA|US)\$|(CAD|USD)\s*\$|\$)?\s*([\d,]{5,}))?\s*(CAD|USD)?/i,
  );
  const frenchMatch = match
    ? null
    : text.match(/([\d ]{5,})\s*\$(?:\s*(?:-|–|—|à)\s*([\d ]{5,})\s*\$)?\s*(CAD)?/i);
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

function isEligibleLocation(location, description, workModel) {
  return isMontrealIsland(location) || isRemoteCanada(location, description, workModel) || isCanadaBasedGlobalRole(location, description);
}

function isMontrealIsland(location) {
  return /montr[ée]al|west island|dorval|saint[- ]laurent|verdun|lasalle|outremont|mont[- ]royal|c[oô]te[- ]saint[- ]luc|pointe[- ]claire|kirkland|beaconsfield|dollard[- ]des[- ]ormeaux/i.test(location);
}

function isRemoteCanada(location, description, workModel) {
  const text = `${location} ${stripHtml(description || "").slice(0, 5000)}`;
  const remote = workModel === "remote" || /\bremote\b|work from home/i.test(location);
  const canada = /canada|canadian|toronto|ontario|anywhere in canada|remote\s*[-–—/]?\s*(?:in\s+)?canada/i.test(text);
  const restrictedElsewhere = /new york|london|united states|\busa\b|remote\s*[-–—/]?\s*us/i.test(location);
  return remote && canada && !restrictedElsewhere;
}

function isCanadaBasedGlobalRole(location, description) {
  if (!/global|international|multiple locations/i.test(location)) return false;
  const text = stripHtml(description || "").slice(0, 8000);
  return /(?:based|located) in (?:canada|montr[ée]al)|canada[- ]based|montr[ée]al[- ]based/i.test(text);
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

function classifyRole(title) {
  if (/recruit(ing|ment)(?:\s*(?:&|and)\s*(?:hr|human resources))? manager|talent acquisition manager|manager,?\s*(?:global\s+)?(?:talent acquisition|recruiting|recruitment)|gestionnaire(?:\s+de\s+l['’])?,?\s+acquisition\s+de\s+talents/i.test(title)) return "recruiting_manager";
  if (/business partner|people partner|partenaire\s+d['’]affaires,?\s+(?:ressources humaines|rh)/i.test(title)) return "hr_business_partner";
  if (/people operations|people & culture|people and culture/i.test(title)) return "people_operations";
  if (/human resources manager|hr manager|gestionnaire\s+(?:des\s+)?ressources humaines|directeur(?:trice)?\s+(?:des\s+)?ressources humaines/i.test(title)) return "hr_manager";
  return "other";
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

function fingerprint(company, title, location) {
  return createHash("sha256")
    .update([company, title, location].map(cleanKey).join("|"))
    .digest("hex");
}

function cleanKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function dollarsToCents(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 100) : null;
}

function validDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function isFresh(value, days) {
  const time = Date.parse(value || "");
  return !Number.isNaN(time) && Date.now() - time <= days * 86_400_000;
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

export { isEligibleLocation, parseSalary, scoreJob };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
