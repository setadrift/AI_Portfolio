import { readFile } from "node:fs/promises";
import { searchPublicJobs } from "./search/provider.mjs";

const USER_AGENT = "MinaJobsResearch/2.0 (+public-job-discovery)";
const JOB_BANK_PAGE_SIZE = 25;
const JOB_BANK_MAX_PAGES = 4;

const JOB_BANK_QUERIES = [
  { id: "jobbank-qc-hr-managers", noc: "10011", province: "QC" },
  { id: "jobbank-qc-hr-professionals", noc: "11200", province: "QC" },
  { id: "jobbank-remote-hr-managers", noc: "10011", remote: true },
  { id: "jobbank-remote-hr-professionals", noc: "11200", remote: true },
];

export async function loadSearchConfig(path = "config/mina-job-search.json") {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function fetchJobBank(fetchImpl = fetchPublic, queries = JOB_BANK_QUERIES) {
  const outcomes = await mapWithConcurrency(queries, 2, async (query) => {
    try {
      const firstUrl = jobBankUrl(query, 1);
      const firstHtml = await fetchJobBankPage(firstUrl, fetchImpl);
      const totalCount = jobBankResultCount(firstHtml);
      if (totalCount == null) throw new Error("Job Bank result count could not be parsed.");
      if (totalCount > JOB_BANK_PAGE_SIZE * JOB_BANK_MAX_PAGES) {
        throw new Error(`Job Bank query returned ${totalCount} results, beyond the safe pagination limit.`);
      }
      const pageCount = Math.min(JOB_BANK_MAX_PAGES, Math.max(1, Math.ceil(totalCount / JOB_BANK_PAGE_SIZE)));
      const pages = [firstHtml];
      for (let page = 2; page <= pageCount; page += 1) {
        pages.push(await fetchJobBankPage(jobBankUrl(query, page), fetchImpl));
      }
      const jobs = pages.flatMap((html) => parseJobBankResults(html, query));
      if (jobs.length < totalCount) {
        throw new Error(`Job Bank reported ${totalCount} results but only ${jobs.length} job cards were parsed.`);
      }
      return { queryId: query.id, ok: true, jobs, error: "" };
    } catch (error) {
      return {
        queryId: query.id,
        ok: false,
        jobs: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const seen = new Set();
  const jobs = outcomes.flatMap((outcome) => outcome.jobs).filter((job) => {
    if (seen.has(job.sourceJobId)) return false;
    seen.add(job.sourceJobId);
    return true;
  });
  return {
    jobs,
    queryResults: outcomes.map(({ queryId, ok, jobs: queryJobs, error }) => ({
      queryId,
      ok,
      resultCount: queryJobs.length,
      error,
    })),
  };
}

export function parseJobBankResults(html, query = {}) {
  const jobs = [];
  const articlePattern = /<article\b[^>]*id=["']article-(\d+)["'][^>]*>[\s\S]*?<a\b[^>]*class=["'][^"']*resultJobItem[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || "").matchAll(articlePattern)) {
    const sourceJobId = match[1];
    const card = match[2];
    const title = classText(card, "noctitle");
    const company = classText(card, "business");
    const location = classText(card, "location").replace(/^Location\s*/i, "");
    const postedAt = classText(card, "date");
    const compensationText = classText(card, "salary").replace(/^Salary\s*/i, "");
    const workLabel = classText(card, "telework");
    if (!title || !location) continue;
    const canonicalUrl = `https://www.jobbank.gc.ca/jobsearch/jobposting/${sourceJobId}`;
    jobs.push({
      source: "jobbank:canada",
      sourceFamily: "canadian_market",
      sourceJobId,
      canonicalUrl,
      applyUrl: canonicalUrl,
      title,
      company: company || "Employer listed on Job Bank",
      location,
      employmentType: "",
      description: stripMarkup(card),
      postedAt,
      closesAt: "",
      workModel: /remote|work from home/i.test(workLabel)
        ? "remote"
        : /hybrid/i.test(workLabel) ? "hybrid" : /on site/i.test(workLabel) ? "on_site" : "unknown",
      compensationText,
      canonicalTrustedOpen: true,
      freshnessConfidence: "high",
      evidence: {
        provider: "Government of Canada Job Bank",
        queryId: query.id || null,
        noc: query.noc || null,
        province: query.province || null,
        remote: Boolean(query.remote),
        liveSearchResult: true,
      },
    });
  }
  return jobs;
}

function jobBankUrl(query, page) {
  const url = new URL("https://www.jobbank.gc.ca/jobsearch/jobsearch");
  url.searchParams.set("fn21", query.noc);
  if (query.province) url.searchParams.set("fprov", query.province);
  if (query.remote) url.searchParams.set("fskl", "100000");
  url.searchParams.set("sort", "D");
  if (page > 1) url.searchParams.set("page", String(page));
  return url;
}

async function fetchJobBankPage(url, fetchImpl) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } });
      if (response.ok) return await response.text();
      lastError = new Error(`Job Bank returned ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw lastError || new Error("Job Bank request failed.");
}

function jobBankResultCount(html) {
  const match = String(html || "").match(/content=["']View\s+([\d,]+)\s+job postings?/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function classText(html, className) {
  for (const tag of ["li", "span"]) {
    const pattern = new RegExp(`<${tag}\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const match = String(html || "").match(pattern);
    if (match) return stripMarkup(match[1]);
  }
  return "";
}

function stripMarkup(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export async function fetchHimalayas() {
  const url = new URL("https://himalayas.app/jobs/api/search");
  url.searchParams.set("q", "human resources");
  url.searchParams.set("country", "CA");
  url.searchParams.set("seniority", "Manager");
  url.searchParams.set("sort", "recent");
  url.searchParams.set("page", "1");
  const response = await fetchPublic(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Himalayas returned ${response.status}`);
  const payload = await response.json();
  return (payload.jobs ?? payload.results ?? []).map((job) => ({
    source: "himalayas:canada-hr",
    sourceFamily: "structured_api",
    sourceJobId: String(job.guid || job.applicationLink || `${job.companySlug}:${job.title}`),
    canonicalUrl: job.applicationLink || job.guid,
    applyUrl: job.applicationLink || job.guid,
    title: job.title,
    company: job.companyName,
    location: `Remote — ${Array.isArray(job.locationRestrictions) ? job.locationRestrictions.join(", ") : "Canada"}`,
    employmentType: job.employmentType || "",
    description: job.description || job.excerpt || "",
    postedAt: unixDate(job.pubDate),
    closesAt: unixDate(job.expiryDate),
    workModel: "remote",
    salaryMin: dollarsToCents(job.minSalary),
    salaryMax: dollarsToCents(job.maxSalary),
    salaryCurrency: job.currency || "CAD",
    compensationText: "",
    canonicalTrustedOpen: false,
    freshnessConfidence: "medium",
    evidence: { provider: "Himalayas", delayed: false, countryFilter: "CA" },
  }));
}

export async function fetchRemotive() {
  const response = await fetchPublic("https://remotive.com/api/remote-jobs?category=hr&limit=100", {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`Remotive returned ${response.status}`);
  const payload = await response.json();
  return (payload.jobs ?? []).map((job) => ({
    source: "remotive:hr",
    sourceFamily: "structured_api",
    sourceJobId: String(job.id),
    canonicalUrl: job.url,
    applyUrl: job.url,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || "Remote",
    employmentType: job.job_type || "",
    description: job.description || "",
    postedAt: job.publication_date || "",
    closesAt: "",
    workModel: "remote",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "CAD",
    compensationText: job.salary || "",
    canonicalTrustedOpen: false,
    freshnessConfidence: "medium",
    evidence: { provider: "Remotive", feedDelayHours: 24 },
  }));
}

export async function fetchJooble(apiKey) {
  const queries = [
    { keywords: "HR Business Partner", location: "Montreal" },
    { keywords: "Talent Acquisition Manager", location: "Canada" },
    { keywords: "Gestionnaire acquisition de talents", location: "Montreal" },
  ];
  const batches = await Promise.all(queries.map(async ({ keywords, location }) => {
    const response = await fetchPublic(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ keywords, location, page: 1 }),
    });
    if (!response.ok) throw new Error(`Jooble returned ${response.status}`);
    const payload = await response.json();
    return (payload.jobs ?? []).map((job) => ({
      source: "jooble:canada",
      sourceFamily: "structured_api",
      sourceJobId: String(job.id || job.link),
      canonicalUrl: job.link,
      applyUrl: job.link,
      title: job.title,
      company: job.company || "Unknown company",
      location: job.location || location,
      employmentType: job.type || "",
      description: job.snippet || "",
      postedAt: "",
      sourceTimestamp: job.updated || "",
      closesAt: "",
      workModel: /remote/i.test(`${job.location} ${job.snippet}`) ? "remote" : "unknown",
      compensationText: job.salary || "",
      canonicalTrustedOpen: false,
      freshnessConfidence: "low",
      evidence: { provider: "Jooble", query: keywords, joobleUpdatedAt: job.updated || null, updatedIsNotPostingDate: true },
    }));
  }));
  const seen = new Set();
  return batches.flat().filter((job) => {
    if (seen.has(job.sourceJobId)) return false;
    seen.add(job.sourceJobId);
    return true;
  });
}

export async function fetchPublicWebSearch(providerName, apiKey, queries, maximumQueries = 2, fetchImpl = fetchPublic) {
  const selected = rotate(queries, maximumQueries);
  const outcomes = await mapWithConcurrency(selected, selected.length, async (query) => {
    try {
      const results = await searchPublicJobs({
        queryId: query.id,
        query: query.query,
        freshness: query.freshness,
        country: "CA",
        language: query.language,
        location: query.locationModel === "montreal_island" ? "Montreal, Quebec, Canada" : "Canada",
        maxResults: 20,
        sourceFamily: query.family,
      }, {
        provider: { name: providerName, apiKey },
        fetchImpl,
      });
      const jobs = results.map((result) => {
        const extensions = result.structured || {};
        return {
          source: providerName === "brave-web" ? "brave:web" : "serpapi:google-jobs",
          sourceFamily: "whole_web",
          sourceJobId: String(result.url),
          queryId: query.id,
          sourceRank: result.rank,
          canonicalUrl: result.url,
          applyUrl: result.url,
          title: result.title,
          company: result.company,
          location: result.location || "",
          employmentType: extensions.schedule_type || "",
          description: result.snippet || "",
          postedAt: dateFromExtensions(extensions, [result.displayedDate]),
          closesAt: "",
          workModel: /remote/i.test(`${result.location} ${result.snippet}`) ? "remote" : "unknown",
          compensationText: extensions.salary || "",
          canonicalTrustedOpen: false,
          freshnessConfidence: "low",
          evidence: {
            provider: result.provider,
            query: query.query,
            queryId: query.id,
            queryFamily: query.family,
            requestedFreshness: result.requestedFreshness,
            displayedDate: result.displayedDate,
            rank: result.rank,
          },
        };
      });
      return { queryId: query.id, ok: true, jobs, error: "" };
    } catch (error) {
      return {
        queryId: query.id,
        ok: false,
        jobs: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const seen = new Set();
  const jobs = outcomes.flatMap((outcome) => outcome.jobs).filter((job) => {
    if (seen.has(job.sourceJobId)) return false;
    seen.add(job.sourceJobId);
    return true;
  });
  return {
    jobs,
    queryResults: outcomes.map(({ queryId, ok, jobs, error }) => ({
      queryId,
      ok,
      resultCount: jobs.length,
      error,
    })),
  };
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
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}

export async function fetchReddit(env, queries) {
  const token = await redditToken(env);
  const batches = [];
  for (const [queryIndex, query] of queries.entries()) {
    const url = new URL("https://oauth.reddit.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("restrict_sr", "false");
    url.searchParams.set("sort", "new");
    url.searchParams.set("t", "week");
    url.searchParams.set("type", "link");
    url.searchParams.set("limit", "25");
    url.searchParams.set("raw_json", "1");
    const response = await fetchPublic(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": env.REDDIT_USER_AGENT || USER_AGENT } });
    if (!response.ok) throw new Error(`Reddit search returned ${response.status}`);
    const payload = await response.json();
    for (const [rank, child] of (payload.data?.children ?? []).entries()) {
      const post = child.data ?? {};
      const external = externalRedditUrl(post);
      if (!external || !isRelevantRedditHiringPost(post)) continue;
      batches.push({
        source: "reddit:global-search",
        sourceFamily: "social",
        sourceJobId: String(post.name || post.id),
        queryId: `reddit-${queryIndex + 1}`,
        sourceRank: rank + 1,
        canonicalUrl: external,
        applyUrl: external,
        title: post.title || "",
        company: "Unknown company",
        location: inferLocation(`${post.title || ""} ${post.selftext || ""}`),
        employmentType: "",
        description: `${post.title || ""}\n${post.selftext || ""}`,
        postedAt: "",
        sourceTimestamp: unixDate(post.created_utc),
        closesAt: "",
        workModel: /remote/i.test(`${post.title} ${post.selftext}`) ? "remote" : "unknown",
        compensationText: post.selftext || "",
        canonicalTrustedOpen: false,
        freshnessConfidence: "low",
        evidence: { provider: "Reddit", postUrl: `https://www.reddit.com${post.permalink || ""}`, postCreatedAt: unixDate(post.created_utc), query },
      });
    }
  }
  return batches;
}

export function isRelevantRedditHiringPost(post) {
  const text = `${post?.title || ""} ${post?.selftext || ""}`;
  const targetRole = /\b(?:hr|human resources)\b|people (?:business )?partner|talent acquisition|recruit(?:ing|ment) (?:manager|lead)|gestionnaire.{0,40}(?:ressources humaines|acquisition)|partenaire d['’]affaires/i.test(text);
  const hiringSignal = /(?:we(?:'re| are) hiring|now hiring|hiring for|job (?:opening|posting)|open (?:role|position)|vacancy|apply (?:here|now)|careers? page)/i.test(text);
  const seekerNoise = /(?:looking for (?:a |an )?(?:job|work)|seeking (?:a |an )?(?:job|role|position)|here(?:'s| is) my (?:resume|cv)|career advice|resume review|laid off|unemployed|pyramid scheme|\bmlm\b)/i.test(text);
  return targetRole && hiringSignal && !seekerNoise;
}

async function redditToken(env) {
  const credentials = Buffer.from(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const response = await fetchPublic("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": env.REDDIT_USER_AGENT || USER_AGENT },
    body,
  });
  if (!response.ok) throw new Error(`Reddit OAuth returned ${response.status}`);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("Reddit OAuth did not return a token.");
  return payload.access_token;
}

function fetchPublic(url, options = {}, timeoutMs = 15_000) {
  return fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(timeoutMs) });
}

function externalRedditUrl(post) {
  const candidates = [post.url_overridden_by_dest, post.url];
  const markdownUrls = String(post.selftext || "").match(/https?:\/\/[^\s)\]]+/g) ?? [];
  candidates.push(...markdownUrls);
  return candidates.find((value) => {
    try {
      const host = new URL(value).hostname;
      return !/(^|\.)reddit\.com$|redd\.it$/i.test(host);
    } catch {
      return false;
    }
  }) || "";
}

function rotate(items, count) {
  if (items.length <= count) return items;
  const offset = Math.floor(Date.now() / 43_200_000) % items.length;
  return Array.from({ length: count }, (_, index) => items[(offset + index) % items.length]);
}

function dateFromExtensions(detected = {}, extensions = []) {
  const text = detected.posted_at || extensions.find((item) => /ago|today|yesterday/i.test(item)) || "";
  const now = Date.now();
  if (/today|just posted/i.test(text)) return new Date(now).toISOString();
  if (/yesterday/i.test(text)) return new Date(now - 86_400_000).toISOString();
  const match = String(text).match(/(\d+)\s*(hour|day|week)s?\s+ago/i);
  if (!match) return "";
  const unit = match[2].toLowerCase();
  const hours = Number(match[1]) * (unit === "hour" ? 1 : unit === "day" ? 24 : 168);
  return new Date(now - hours * 3_600_000).toISOString();
}

function unixDate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return new Date(number * (number > 10_000_000_000 ? 1 : 1000)).toISOString();
}

function dollarsToCents(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value) * 100) : null;
}

function inferLocation(text) {
  if (/montr[ée]al/i.test(text)) return "Montréal, QC";
  if (/remote.{0,30}canada|canada.{0,30}remote/i.test(text)) return "Remote — Canada";
  return "";
}
