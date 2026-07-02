import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CONFIG_PATH = "config/reddit-lead-monitor.json";
const OUTPUT_DIR = process.env.REDDIT_LEAD_OUTPUT_DIR || "outputs/reddit-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const DEFAULT_USER_AGENT =
  "DuncanAndersonLeadMonitor/0.1 (manual lead review; https://duncananderson.ca)";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_OAUTH_HOST = "https://oauth.reddit.com";

const positiveTerms = [
  "automate",
  "automation",
  "manual",
  "spreadsheet",
  "excel",
  "google sheets",
  "crm",
  "zapier",
  "make",
  "n8n",
  "airtable",
  "pdf",
  "report",
  "reporting",
  "dashboard",
  "invoice",
  "receipt",
  "ocr",
  "lead follow-up",
  "lead follow up",
  "drip campaign",
  "email sequence",
  "sms",
  "workflow",
  "data entry",
  "onboarding",
  "offboarding",
  "internal tool",
  "follow-up",
  "follow up",
  "quickbooks",
  "xero",
  "shopify",
  "notion",
  "hubspot",
  "pipedrive",
  "zoho",
  "forms",
  "form submission",
  "client portal",
  "power bi",
  "reconciliation",
  "inventory",
  "order management",
  "fulfillment",
  "data cleanup",
];

const communityPainTerms = [
  "job boards are not",
  "job boards aren't",
  "job boards not",
  "not bringing in anyone",
  "need help finding",
  "can't find",
  "cant find",
  "need someone who knows",
  "network of",
  "remote recruiting",
  "busy season",
  "can't keep track",
  "cant keep track",
  "buried in emails",
  "missed follow up",
  "missed follow-up",
  "too many messages",
  "too many calls",
  "missed calls",
  "scheduling mess",
  "intake is chaotic",
  "intake is messy",
  "intake is broken",
  "need a better system",
  "follow up with applicants",
  "screening applicants",
  "quote requests",
  "customer messages",
];

const buyingIntentTerms = [
  "hire",
  "hire someone",
  "need to hire",
  "need to hire someone",
  "paid help",
  "open to paid help",
  "willing to pay",
  "take my money",
  "consultant",
  "freelancer",
  "developer",
  "expert",
  "build this",
  "build this for me",
  "need someone",
  "looking for someone",
  "can someone help",
  "need help finding",
  "need to automate",
  "automate it",
  "need a solution",
  "where do i start",
  "help setting up",
  "looking for help",
  "can't figure out",
  "cant figure out",
  "stuck",
  "desperate",
  "too slow",
  "takes forever",
  "mess",
];

const negativeTerms = [
  "selling",
  "course",
  "newsletter",
  "affiliate",
  "template",
  "looking for clients",
  "how do i start an ai agency",
  "for hire",
  "hire me",
  "available for freelance",
  "available for contract",
  "white label",
  "partner program",
  "cold email",
  "seo agency",
  "lead gen agency",
  "here's how",
  "here’s how",
  "i automated",
  "i built",
  "i made",
  "case study",
  "looking for feedback",
  "feedback on my",
  "built a",
  "i built",
  "launching",
  "my product",
  "my app",
  "showcase",
  "looking for a role",
  "looking for work",
  "looking for a job",
  "open to work",
  "seeking a role",
  "seeking a job",
  "job search",
  "resume",
  "portfolio",
  "sales guy",
  "virtual assistant",
  "full-time",
  "part-time",
  "per hour",
  "hourly",
  "$6",
  "$12",
  "market for",
  "potential collab",
  "collab opportunity",
  "market research",
  "do you actually need",
  "bad idea",
];

const hardNegativeTerms = [
  "for hire",
  "hire me",
  "available for freelance",
  "available for contract",
  "looking for clients",
  "how do i start an ai agency",
  "course",
  "newsletter",
  "affiliate",
  "white label",
  "partner program",
  "cold email",
  "seo agency",
  "lead gen agency",
  "looking for feedback",
  "feedback on my",
  "showcase",
  "looking for a role",
  "looking for work",
  "looking for a job",
  "open to work",
  "seeking a role",
  "seeking a job",
  "job search",
  "resume",
  "portfolio",
  "hire me",
  "do you actually need",
];

const allowedCategories = new Set([
  "crm_lead_followup",
  "reporting_automation",
  "document_pdf_automation",
  "spreadsheet_internal_tools",
  "staffing_recruiting",
  "operations_intake",
  "other",
]);

const allowedActions = new Set(["ignore", "watch", "comment", "dm_if_engaged", "dm"]);
const allowedOutreachPostures = new Set(["ignore", "watch", "comment_first", "dm_if_engaged", "dm_now"]);
const toolSpecificSubreddits = new Set([
  "airtable",
  "automation",
  "crm",
  "crmsoftware",
  "googlesheets",
  "make",
  "marketingautomation",
  "nocode",
  "notion",
  "shopify",
  "zapier",
]);

async function main() {
  const config = await loadConfig();
  if (process.argv.includes("--score-fixtures")) {
    await runFixtureScoring(config);
    return;
  }

  const scanConfig = selectedScanConfig(config);
  const env = {
    ...process.env,
    ...(await loadDotEnv(".env.local")),
  };
  const outputDate = localDate();
  const maxAgeMs = (config.maxAgeHours ?? 48) * 60 * 60 * 1000;
  const now = Date.now();

  const feedResults = [];
  const posts = [];

  const channels = limitChannels(normalizeChannels(scanConfig));
  const searchQueries = limitSearchQueries(scanConfig.searchQueries ?? []);
  const totalConfiguredFeeds = channels.length + searchQueries.length;
  const requiresOauth = (config.ingestionMode ?? "oauth") === "oauth";
  const redditToken = await getRedditOAuthToken(env, { required: requiresOauth });
  const useOauth = Boolean(redditToken);
  if (requiresOauth && !useOauth) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeStatus({
      ok: false,
      generatedAt: new Date().toISOString(),
      successfulFeeds: 0,
      totalFeeds: totalConfiguredFeeds,
      ingestionMode: "oauth",
      scanMode: scanConfig.scanMode?.id ?? "legacy-config",
      fetchedPosts: 0,
      candidatesScored: 0,
      leadsIncluded: 0,
      outputPath: "",
      message:
        "Skipped Reddit lead scan because REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and REDDIT_USER_AGENT are required for OAuth ingestion.",
      feedErrors: channels.map((channel) => ({
        url: `oauth:/r/${channel.subreddit}`,
        status: "missing_oauth_credentials",
        error: "Missing Reddit OAuth credentials.",
      })).concat(searchQueries.map((query) => ({
        url: `reddit-search:${query}`,
        status: "missing_oauth_credentials",
        error: "Missing Reddit OAuth credentials.",
      }))),
    });
    console.log(
      "Skipped Reddit lead scan: missing REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, or REDDIT_USER_AGENT.",
    );
    console.log(`Wrote run status: ${STATUS_PATH}`);
    return;
  }
  for (const [index, channel] of channels.entries()) {
    const result = await fetchChannel(channel, {
      token: redditToken,
      limit: config.limitPerChannel ?? 25,
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
    });
    feedResults.push(result);
    if (result.ok) posts.push(...result.posts);
    if (index < channels.length - 1) {
      await sleep(config.requestDelayMs ?? 1500);
    }
  }
  for (const [index, query] of searchQueries.entries()) {
    const result = await fetchSearchQuery(query, {
      token: redditToken,
      limit: config.limitPerSearch ?? 25,
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
    });
    feedResults.push(result);
    if (result.ok) posts.push(...result.posts);
    if (index < searchQueries.length - 1) {
      await sleep(config.requestDelayMs ?? 1500);
    }
  }

  const freshPosts = dedupePosts(posts).filter((post) => {
    if (!post.publishedAt) return true;
    return now - new Date(post.publishedAt).getTime() <= maxAgeMs;
  });

  const matchedPosts = freshPosts
    .map((post) => ({ ...post, ...matchPost(post, scanConfig) }));
  const preScoringRejected = matchedPosts.filter((post) => !shouldKeepPost(post));
  const eligiblePosts = matchedPosts
    .filter((post) => shouldKeepPost(post))
    .sort((a, b) => candidatePriority(b) - candidatePriority(a));
  let filtered = selectCandidatePortfolio(eligiblePosts, scanConfig, config);
  const portfolioRejectedCount = Math.max(0, freshPosts.length - filtered.length - preScoringRejected.length);

  if (useOauth && config.commentContextEnabled !== false) {
    filtered = await enrichCandidatesWithCommentContext(filtered, {
      token: redditToken,
      limit: config.commentLimitPerPost ?? 20,
      candidateLimit: config.commentContextCandidateLimit ?? 15,
      sort: config.commentSort || "top",
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
      requestDelayMs: config.requestDelayMs ?? 1500,
    });
  }

  const scored = await scorePosts(filtered, config, env.OPENAI_API_KEY);
  const includedLeads = scored.filter((lead) => lead.score >= config.minScore);
  const successfulFeeds = feedResults.filter((result) => result.ok).length;
  const minSuccessfulFeeds = Math.min(
    scanConfig.minSuccessfulFeeds ?? Math.min(3, totalConfiguredFeeds),
    totalConfiguredFeeds,
  );
  const hasLeads = includedLeads.length > 0;
  const hasEnoughCoverage = successfulFeeds >= minSuccessfulFeeds;
  const shouldWriteDigest = hasEnoughCoverage || hasLeads;
  const partialCoverage = shouldWriteDigest && !hasEnoughCoverage;
  const digest = buildDigest({
    date: outputDate,
    leads: scored,
    rejectedCount: freshPosts.length - filtered.length,
    feedResults,
    config,
    scanMode: scanConfig.scanMode,
    rejectionSummary: rejectionReasonSummary(preScoringRejected, portfolioRejectedCount),
    partialCoverage,
  });

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${outputDate}.md`);
  await writeStatus({
    ok: shouldWriteDigest,
    generatedAt: new Date().toISOString(),
    successfulFeeds,
    totalFeeds: feedResults.length,
    ingestionMode: useOauth ? "oauth" : "rss",
    scanMode: scanConfig.scanMode?.id ?? "legacy-config",
    fetchedPosts: posts.length,
    candidatesScored: filtered.length,
    leadsIncluded: includedLeads.length,
    outputPath: shouldWriteDigest ? outputPath : "",
    queryDiagnostics: queryDiagnostics(feedResults),
    message: partialCoverage
      ? `Partial digest updated with ${scored.length} lead(s); only ${successfulFeeds}/${feedResults.length} feeds succeeded.`
      : shouldWriteDigest
        ? "Digest updated."
      : `Skipped digest update because only ${successfulFeeds}/${feedResults.length} feeds succeeded.`,
    feedErrors: feedResults
      .filter((result) => !result.ok)
      .map((result) => ({
        url: result.url,
        status: result.status,
        error: result.error ?? "",
      })),
  });

  if (shouldWriteDigest) {
    await writeFile(outputPath, digest, "utf8");
  }

  console.log(`Fetched ${posts.length} posts from ${feedResults.length} feeds.`);
  console.log(`Filtered ${filtered.length} candidates for scoring.`);
  if (shouldWriteDigest) {
    console.log(`Wrote digest: ${outputPath}`);
  } else {
    console.log(
      `Skipped digest update: only ${successfulFeeds}/${feedResults.length} feeds succeeded.`,
    );
    console.log(`Wrote run status: ${STATUS_PATH}`);
  }
}

async function loadConfig() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

async function runFixtureScoring(config) {
  const fixturePath = process.env.REDDIT_SCANNER_FIXTURE_PATH ||
    path.join("scripts", "fixtures", "reddit-lead-scanner-quality.json");
  const raw = await readFile(fixturePath, "utf8");
  const payload = JSON.parse(raw);
  const fixtures = Array.isArray(payload) ? payload : payload.fixtures;
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error(`No Reddit scanner fixtures found in ${fixturePath}.`);
  }

  const scanConfig = selectedScanConfig(config);
  const failures = [];
  const scoredLeads = [];
  const rows = fixtures.map((fixture) => {
    const post = {
      title: fixture.title,
      summary: fixture.summary,
      author: fixture.author || "fixture_user",
      subreddit: fixture.subreddit || "smallbusiness",
      url: fixture.url || `https://www.reddit.com/r/${fixture.subreddit || "smallbusiness"}/comments/${fixture.id}`,
      publishedAt: fixture.publishedAt || new Date().toISOString(),
      redditScore: 0,
      commentCount: 0,
      sourceMode: "fixture",
      sourceDetail: fixture.id,
    };
    const matched = { ...post, ...matchPost(post, scanConfig) };
    const scored = scoreDeterministically(matched);
    scoredLeads.push(scored);
    const expected = fixture.expected ?? {};
    const minScore = expected.scoreMin ?? expected.score ?? 1;
    const maxScore = expected.scoreMax ?? expected.score ?? 5;
    const checks = [
      {
        ok: scored.score >= minScore && scored.score <= maxScore,
        message: `score ${scored.score} outside expected ${minScore}-${maxScore}`,
      },
      {
        ok: !expected.posture || scored.outreachPosture === expected.posture,
        message: `posture ${scored.outreachPosture || "blank"} did not match ${expected.posture}`,
      },
      {
        ok: !("leadType" in expected) ||
          (expected.leadType
            ? scored.leadType === expected.leadType
            : !scored.leadType || scored.leadType === "other"),
        message: `lead type ${scored.leadType || "blank"} did not match ${expected.leadType || "blank"}`,
      },
      {
        ok: !/https?:\/\//i.test(scored.suggestedComment || ""),
        message: "suggested public comment contains a URL",
      },
    ];
    const failedChecks = checks.filter((check) => !check.ok);
    if (failedChecks.length) {
      failures.push({
        id: fixture.id,
        title: fixture.title,
        failures: failedChecks.map((check) => check.message),
        scored,
      });
    }
    return {
      id: fixture.id,
      score: scored.score,
      posture: scored.outreachPosture,
      leadType: scored.leadType || "blank",
      status: failedChecks.length ? "FAIL" : "PASS",
    };
  });

  for (const row of rows) {
    console.log(`${row.status} ${row.id}: score=${row.score} posture=${row.posture} leadType=${row.leadType}`);
  }
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    throw new Error(`${failures.length}/${fixtures.length} Reddit scanner fixture(s) failed.`);
  }
  if (process.env.REDDIT_SCANNER_WRITE_FIXTURE_DIGEST === "1") {
    await mkdir(OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(OUTPUT_DIR, `${localDate()}-fixtures.md`);
    const digest = buildDigest({
      date: localDate(),
      leads: scoredLeads,
      rejectedCount: scoredLeads.filter((lead) => lead.score < 3).length,
      feedResults: [{ ok: true, url: "fixture:reddit-lead-scanner-quality", status: "fixture", posts: fixtures }],
      config,
      scanMode: scanConfig.scanMode,
      rejectionSummary: rejectionReasonSummary(
        scoredLeads.filter((lead) => lead.score < 3),
        0,
      ),
      partialCoverage: false,
    });
    await writeFile(outputPath, digest, "utf8");
    await writeStatus({
      ok: true,
      generatedAt: new Date().toISOString(),
      successfulFeeds: 1,
      totalFeeds: 1,
      ingestionMode: "fixture",
      scanMode: scanConfig.scanMode?.id ?? "legacy-config",
      fetchedPosts: fixtures.length,
      candidatesScored: scoredLeads.length,
      leadsIncluded: scoredLeads.filter((lead) => lead.score >= (config.minScore ?? 4)).length,
      outputPath,
      queryDiagnostics: [],
      message: "Fixture digest written for parser verification.",
      feedErrors: [],
    });
    console.log(`Wrote fixture digest: ${outputPath}`);
    console.log(`Wrote fixture status: ${STATUS_PATH}`);
  }
  console.log(`Fixture scoring passed: ${fixtures.length}/${fixtures.length}.`);
}

async function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};

  const raw = await readFile(filePath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = stripQuotes(match[2]);
  }
  return env;
}

async function writeStatus(status) {
  await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

function selectedScanConfig(config) {
  const requestedMode = process.env.REDDIT_SCAN_MODE || "";
  const scanModes = Array.isArray(config.scanModes) ? config.scanModes : [];
  const archetypePacks = normalizeArchetypePacks(config.archetypePacks ?? []);
  const scanMode = requestedMode
    ? scanModes.find((mode) => slug(mode.id || mode.label) === slug(requestedMode))
    : scanModes[0] ?? null;

  if (!scanMode) {
    return {
      ...config,
      scanMode: null,
      channels: config.channels ?? [],
      searchQueries: config.searchQueries ?? [],
      archetypePacks,
    };
  }

  const selectedArchetypes = archetypesForScanMode(scanMode, archetypePacks);
  const expandedChannels = dedupeChannels([
    ...(scanMode.channels ?? config.channels ?? []),
    ...selectedArchetypes.flatMap((pack) => pack.channels),
  ]);
  const expandedSearchQueries = dedupeStrings([
    ...(scanMode.searchQueries ?? config.searchQueries ?? []),
    ...selectedArchetypes.flatMap((pack) => pack.searchQueries),
  ]);

  return {
    ...config,
    ...scanMode,
    scanMode: {
      id: slug(scanMode.id || scanMode.label),
      label: scanMode.label || scanMode.id || "Selected scan mode",
      description: scanMode.description || "",
    },
    archetypePacks: selectedArchetypes,
    channels: expandedChannels,
    searchQueries: expandedSearchQueries,
    minSuccessfulFeeds: scanMode.minSuccessfulFeeds ?? config.minSuccessfulFeeds,
  };
}

function normalizeArchetypePacks(packs) {
  return packs
    .map((pack, index) => ({
      id: slug(pack.id || pack.label),
      label: pack.label || pack.id || "Archetype",
      vertical: slug(pack.vertical || "other").replace(/-/g, "_"),
      failureMode: slug(pack.failureMode || "other").replace(/-/g, "_"),
      defaultOutreachPosture: allowedOutreachPostures.has(pack.defaultOutreachPosture)
        ? pack.defaultOutreachPosture
        : "comment_first",
      channels: Array.isArray(pack.channels) ? pack.channels : [],
      searchQueries: Array.isArray(pack.searchQueries) ? pack.searchQueries : [],
      positiveSignals: normalizeSignalList(pack.positiveSignals),
      painSignals: normalizeSignalList(pack.painSignals),
      rejectSignals: normalizeSignalList(pack.rejectSignals),
      order: index,
    }))
    .filter((pack) => pack.id);
}

function normalizeSignalList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
    : [];
}

function archetypesForScanMode(scanMode, archetypePacks) {
  const requestedIds = Array.isArray(scanMode.archetypePackIds)
    ? scanMode.archetypePackIds.map((value) => slug(value))
    : [];
  if (!requestedIds.length) return [];
  const requested = new Set(requestedIds);
  return archetypePacks.filter((pack) => requested.has(pack.id));
}

function dedupeChannels(channels) {
  const seen = new Set();
  const deduped = [];
  for (const channel of channels) {
    const subreddit = channel.subreddit || subredditFromFeed(channel.feed || channel.url || "");
    const key = slug(channel.id || subreddit || channel.feed || channel.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(channel);
  }
  return deduped;
}

function dedupeStrings(values) {
  const seen = new Set();
  const deduped = [];
  for (const value of values) {
    const normalized = String(value || "").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function normalizeChannels(config) {
  if (Array.isArray(config.channels) && config.channels.length > 0) {
    return config.channels
      .map((channel) => ({
        id: slug(channel.id || channel.subreddit || channel.feed || channel.url),
        label: channel.label || `r/${channel.subreddit}`,
        subreddit: channel.subreddit || subredditFromFeed(channel.feed || channel.url || ""),
        feed: channel.feed || channel.url || "",
      }))
      .filter((channel) => channel.subreddit);
  }

  return (config.feeds ?? []).map((feed) => {
    const subreddit = subredditFromFeed(feed);
    return {
      id: slug(subreddit),
      label: `r/${subreddit}`,
      subreddit,
      feed,
    };
  });
}

function limitChannels(channels) {
  const match = process.env.REDDIT_CHANNEL_MATCH || process.env.REDDIT_FEED_MATCH;
  const matchedChannels = match
    ? channels.filter((channel) =>
        [channel.id, channel.label, channel.subreddit, channel.feed]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(match.toLowerCase())),
      )
    : channels;

  const rawLimit = process.env.REDDIT_FEED_LIMIT || process.env.REDDIT_CHANNEL_LIMIT;
  if (!rawLimit) return matchedChannels;

  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(limit) || limit <= 0) return matchedChannels;
  return matchedChannels.slice(0, limit);
}

function limitSearchQueries(queries) {
  const match = process.env.REDDIT_SEARCH_MATCH;
  const matchedQueries = match
    ? queries.filter((query) => String(query).toLowerCase().includes(match.toLowerCase()))
    : queries;

  const rawLimit = process.env.REDDIT_SEARCH_LIMIT;
  if (!rawLimit) return matchedQueries;

  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(limit) || limit <= 0) return matchedQueries;
  return matchedQueries.slice(0, limit);
}

async function fetchChannel(channel, options) {
  if (options.token) {
    return fetchRedditApiChannel(channel, options);
  }

  return fetchRssChannel(channel, options);
}

async function fetchSearchQuery(query, options) {
  if (!options.token) {
    return {
      ok: false,
      url: `reddit-search:${query}`,
      status: "missing_oauth_token",
      error: "Search discovery requires Reddit OAuth.",
      posts: [],
    };
  }

  const params = new URLSearchParams({
    q: query,
    sort: "new",
    t: "month",
    limit: String(options.limit),
    type: "link",
    restrict_sr: "false",
    raw_json: "1",
  });
  const url = `${REDDIT_OAUTH_HOST}/search?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        "User-Agent": options.userAgent,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) {
      return {
        ok: false,
        url: `reddit-search:${query}`,
        status: response.status,
        error: JSON.stringify(body).slice(0, 200),
        posts: [],
      };
    }

    return {
      ok: true,
      url: `reddit-search:${query}`,
      status: response.status,
      posts: parseRedditListing(body, {
        subreddit: "search",
        sourceMode: "search",
        sourceDetail: query,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      url: `reddit-search:${query}`,
      status: "network_error",
      error: error instanceof Error ? error.message : String(error),
      posts: [],
    };
  }
}

async function enrichCandidatesWithCommentContext(posts, options) {
  const limit = Math.max(0, Number.parseInt(String(options.candidateLimit ?? 0), 10) || 0);
  if (!limit) return posts;
  const enriched = [];
  let fetched = 0;
  for (const post of posts) {
    if (!post.redditId || fetched >= limit) {
      enriched.push(post);
      continue;
    }
    const commentContext = await fetchCommentContext(post, options);
    enriched.push(commentContext ? { ...post, commentContext } : post);
    fetched += 1;
    if (fetched < limit) {
      await sleep(options.requestDelayMs ?? 1500);
    }
  }
  return enriched;
}

async function fetchCommentContext(post, options) {
  const params = new URLSearchParams({
    limit: String(options.limit ?? 20),
    sort: options.sort || "top",
    raw_json: "1",
  });
  const url = `${REDDIT_OAUTH_HOST}/comments/${encodeURIComponent(post.redditId)}?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        "User-Agent": options.userAgent,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) return null;
    return summarizeCommentContext(body, post.author);
  } catch {
    return null;
  }
}

function summarizeCommentContext(body, postAuthor) {
  const listing = Array.isArray(body) ? body[1] : null;
  const comments = listing?.data?.children ?? [];
  const parsed = comments
    .map((child) => child.data ?? {})
    .filter((comment) => comment.body && comment.author !== "[deleted]")
    .slice(0, 20);
  const opReplies = parsed
    .filter((comment) => normalizeAuthor(comment.author) === normalizeAuthor(postAuthor))
    .map((comment) => cleanCommentBody(comment.body).slice(0, 220))
    .filter(Boolean)
    .slice(0, 3);
  const topAdviceThemes = parsed
    .filter((comment) => normalizeAuthor(comment.author) !== "AutoModerator")
    .map((comment) => cleanCommentBody(comment.body).slice(0, 180))
    .filter(Boolean)
    .slice(0, 5);
  const selfPromotionRisk = parsed.some((comment) => {
    const text = cleanCommentBody(comment.body).toLowerCase();
    return normalizeAuthor(comment.author) === "AutoModerator" &&
      /(self.?promotion|promotional|soliciting|dm|market research|survey)/i.test(text);
  })
    ? "high"
    : "normal";

  if (!opReplies.length && !topAdviceThemes.length && selfPromotionRisk === "normal") return null;
  return {
    opReplies,
    topAdviceThemes,
    selfPromotionRisk,
    unansweredAngle: topAdviceThemes.length
      ? "Add a practical process-design angle without repeating the existing tool suggestions."
      : "",
  };
}

function cleanCommentBody(value) {
  return stripHtml(String(value || ""))
    .replace(/\s+/g, " ")
    .trim();
}

async function getRedditOAuthToken(env, { required = false } = {}) {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;
  const userAgent = env.REDDIT_USER_AGENT || (required ? "" : DEFAULT_USER_AGENT);
  if (!clientId || !clientSecret || !userAgent) return "";

  const params = new URLSearchParams();
  if (env.REDDIT_REFRESH_TOKEN) {
    params.set("grant_type", "refresh_token");
    params.set("refresh_token", env.REDDIT_REFRESH_TOKEN);
  } else {
    params.set("grant_type", "client_credentials");
  }

  try {
    const response = await fetch(REDDIT_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: params,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) {
      console.warn(
        `Reddit OAuth unavailable; falling back to RSS (${response.status} ${body.error || "token_error"}).`,
      );
      return "";
    }
    return String(body.access_token);
  } catch (error) {
    console.warn(
      `Reddit OAuth unavailable; falling back to RSS (${
        error instanceof Error ? error.message : String(error)
      }).`,
    );
    return "";
  }
}

async function fetchRedditApiChannel(channel, options) {
  const url = `${REDDIT_OAUTH_HOST}/r/${encodeURIComponent(channel.subreddit)}/new?limit=${
    options.limit
  }&raw_json=1`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        "User-Agent": options.userAgent,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) {
      return {
        ok: false,
        url,
        status: response.status,
        error: JSON.stringify(body).slice(0, 200),
        posts: [],
      };
    }

    return {
      ok: true,
      url,
      status: response.status,
      posts: parseRedditListing(body, channel),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status: "network_error",
      error: error instanceof Error ? error.message : String(error),
      posts: [],
    };
  }
}

async function fetchRssChannel(channel, options) {
  const feedUrl = channel.feed || `https://www.reddit.com/r/${channel.subreddit}/new.rss`;
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": options.userAgent,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        url: feedUrl,
        status: response.status,
        error: body.slice(0, 200),
        posts: [],
      };
    }

    return {
      ok: true,
      url: feedUrl,
      status: response.status,
      posts: parseFeed(body, feedUrl),
    };
  } catch (error) {
    return {
      ok: false,
      url: feedUrl,
      status: "network_error",
      error: error instanceof Error ? error.message : String(error),
      posts: [],
    };
  }
}

function parseRedditListing(body, channel) {
  const children = body?.data?.children;
  if (!Array.isArray(children)) return [];

  return children.map((child) => {
    const post = child.data ?? {};
    const permalink = post.permalink
      ? `https://www.reddit.com${post.permalink}`
      : post.url || "";
    const created = post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "";

    return {
      redditId: String(post.id || ""),
      title: String(post.title || "").trim(),
      summary: String(post.selftext || post.selftext_html || "").trim(),
      author: normalizeAuthor(post.author || "unknown"),
      subreddit: String(post.subreddit || channel.subreddit),
      url: permalink,
      publishedAt: created,
      redditScore: Number.isFinite(post.score) ? post.score : 0,
      commentCount: Number.isFinite(post.num_comments) ? post.num_comments : 0,
      sourceMode: channel.sourceMode || "subreddit_new",
      sourceDetail: channel.sourceDetail || `r/${post.subreddit || channel.subreddit}`,
    };
  });
}

function parseFeed(xml, feedUrl) {
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(
    (match) => match[0],
  );
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(
    (match) => match[0],
  );
  const blocks = entryBlocks.length ? entryBlocks : itemBlocks;

  return blocks.map((block) => {
    const title = textFromTag(block, "title");
    const rawSummary =
      textFromTag(block, "content") ||
      textFromTag(block, "summary") ||
      textFromTag(block, "description");
    const permalink =
      attrFromTag(block, "link", "href") ||
      textFromTag(block, "link") ||
      textFromTag(block, "guid");
    const author =
      textFromNestedTag(block, "author", "name") ||
      textFromTag(block, "dc:creator") ||
      "unknown";
    const publishedAt =
      textFromTag(block, "published") ||
      textFromTag(block, "updated") ||
      textFromTag(block, "pubDate");
    const subreddit = subredditFromFeed(feedUrl);

    return {
      title: decodeXml(stripHtml(title)).trim(),
      summary: decodeXml(stripHtml(rawSummary)).trim(),
      author: normalizeAuthor(author),
      subreddit,
      url: permalink,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : "",
    };
  });
}

function matchPost(post, scanConfig = {}) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const matchedKeywords = termsInText(text, positiveTerms);
  const communityPainMatches = termsInText(text, communityPainTerms);
  const buyingIntentMatches = termsInText(text, buyingIntentTerms);
  const negativeMatches = termsInText(text, negativeTerms);
  const hardNegativeMatches = termsInText(text, hardNegativeTerms);
  const archetypeMatches = matchArchetypes(text, scanConfig.archetypePacks ?? []);
  const primaryArchetype = primaryArchetypeMatch(archetypeMatches);

  return {
    matchedKeywords,
    communityPainMatches,
    buyingIntentMatches,
    negativeMatches,
    hardNegativeMatches,
    archetypeMatches,
    matchedLeadTypes: archetypeMatches.map((match) => match.id),
    matchEvidence: archetypeMatches.flatMap((match) => match.evidence).slice(0, 8),
    leadType: primaryArchetype?.id ?? "",
    vertical: primaryArchetype?.vertical ?? "",
    failureMode: primaryArchetype?.failureMode ?? "",
    outreachPosture: primaryArchetype?.defaultOutreachPosture ?? "",
  };
}

function matchArchetypes(text, archetypePacks) {
  return archetypePacks
    .map((pack) => {
      const positive = termsInText(text, pack.positiveSignals);
      const pain = termsInText(text, pack.painSignals);
      const rejects = termsInText(text, pack.rejectSignals);
      const evidence = [...positive, ...pain];
      return {
        ...pack,
        positiveMatches: positive,
        painMatches: pain,
        rejectMatches: rejects,
        evidence,
        evidenceCount: evidence.length,
      };
    })
    .filter((match) => {
      if (match.rejectMatches.length > 0) return false;
      return match.painMatches.length > 0 || match.positiveMatches.length >= 2;
    });
}

function primaryArchetypeMatch(matches) {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => {
    const explicitDelta = Number(b.positiveMatches.some((term) => /paid|hire|project/.test(term))) -
      Number(a.positiveMatches.some((term) => /paid|hire|project/.test(term)));
    if (explicitDelta !== 0) return explicitDelta;
    return b.evidenceCount - a.evidenceCount || a.order - b.order;
  })[0];
}

function shouldKeepPost(post) {
  const hasDiscoverySignal =
    post.matchedKeywords.length > 0 ||
    post.communityPainMatches.length > 0 ||
    post.archetypeMatches.length > 0;
  if (!hasDiscoverySignal) return false;
  if (post.hardNegativeMatches.length > 0) return false;
  if (/\bfor hire\b/i.test(post.title)) return false;
  if (isRoleSeekerPost(post)) return false;
  if (isMarketResearchPost(post)) return false;
  if (post.negativeMatches.length > 0 && post.buyingIntentMatches.length === 0) {
    return false;
  }
  return hasRequestIntent(post) || isAdviceShapedOperationalPain(post) || hasExplicitPaidProject(post);
}

function candidatePriority(post) {
  let priority = 0;
  priority += Math.min(post.archetypeMatches.length, 4) * 7;
  priority += Math.min(post.matchEvidence.length, 8) * 3;
  priority += post.buyingIntentMatches.length * 8;
  priority += Math.min(post.matchedKeywords.length, 6) * 2;
  priority += Math.min(post.communityPainMatches.length, 5) * 4;
  if (hasExplicitPaidProject(post)) priority += 35;
  if (isAdviceShapedOperationalPain(post)) priority += 24;
  if (hasSpecificWorkflowPain(post)) priority += 20;
  if (hasBusinessContext(post)) priority += 10;
  if (post.sourceMode === "search") priority += 5;
  priority += Math.min(Number(post.commentCount || 0), 20) / 10;
  priority += Math.min(Number(post.redditScore || 0), 25) / 25;
  if (isGenericAdviceOnlyPost(post)) priority -= 18;
  if (isSellerOrBuilderPost(post)) priority -= 30;
  if (isEmploymentPost(post)) priority -= 28;
  if (isRoleSeekerPost(post)) priority -= 45;
  if (isMarketResearchPost(post)) priority -= 32;
  if (!hasConsultingBuyerIntent(post)) priority -= 12;
  if (post.negativeMatches.length > 0) priority -= 12;
  return priority;
}

function selectCandidatePortfolio(posts, scanConfig, config) {
  const maxCandidates = config.maxLlmCandidates ?? 25;
  const maxPerSource = config.maxCandidatesPerSource ?? maxCandidates;
  const maxPerLeadType = config.maxCandidatesPerLeadType ?? maxCandidates;
  const minCommentFirst = config.minCommentFirstCandidates ?? 0;
  const maxToolOutsideToolMode = config.maxToolSpecificCandidatesOutsideToolMode ?? maxCandidates;
  const isToolMode = scanConfig.scanMode?.id === "tool-specific-automation";
  const sorted = [...posts].sort((a, b) => candidatePriority(b) - candidatePriority(a));
  const selected = [];
  const seen = new Set();
  const sourceCounts = new Map();
  const leadTypeCounts = new Map();
  let toolSpecificCount = 0;

  function add(post, { ignoreCaps = false } = {}) {
    if (selected.length >= maxCandidates) return false;
    const key = candidateKey(post);
    if (seen.has(key)) return false;
    const sourceKey = candidateSourceKey(post);
    const leadType = post.leadType || "unclassified";
    const isToolSpecific = isToolSpecificCandidate(post);
    if (!ignoreCaps) {
      if ((sourceCounts.get(sourceKey) ?? 0) >= maxPerSource) return false;
      if ((leadTypeCounts.get(leadType) ?? 0) >= maxPerLeadType) return false;
      if (!isToolMode && isToolSpecific && toolSpecificCount >= maxToolOutsideToolMode) return false;
    }
    seen.add(key);
    selected.push(post);
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
    leadTypeCounts.set(leadType, (leadTypeCounts.get(leadType) ?? 0) + 1);
    if (isToolSpecific) toolSpecificCount += 1;
    return true;
  }

  const archetypes = scanConfig.archetypePacks ?? [];
  const reservePerArchetype = Math.max(1, Math.floor(maxCandidates / Math.max(archetypes.length * 2, 1)));
  for (const archetype of archetypes) {
    const matches = sorted.filter((post) => post.matchedLeadTypes?.includes(archetype.id));
    let added = 0;
    for (const post of matches) {
      if (added >= reservePerArchetype) break;
      if (add(post)) added += 1;
    }
  }

  const commentFirstCandidates = sorted.filter((post) => {
    const posture = normalizeOutreachPosture(defaultOutreachPosture(post, 4), post, 4);
    return posture === "comment_first" && isAdviceShapedOperationalPain(post);
  });
  for (const post of commentFirstCandidates) {
    const currentCommentFirst = selected.filter((candidate) => {
      const posture = normalizeOutreachPosture(defaultOutreachPosture(candidate, 4), candidate, 4);
      return posture === "comment_first";
    }).length;
    if (currentCommentFirst >= minCommentFirst) break;
    add(post);
  }

  for (const post of sorted) {
    add(post);
  }

  return selected;
}

function candidateKey(post) {
  return post.url || `${post.author}:${normalizeComparableTitle(post.title)}`;
}

function candidateSourceKey(post) {
  return String(post.sourceDetail || post.subreddit || "unknown").toLowerCase();
}

function isToolSpecificCandidate(post) {
  const subreddit = String(post.subreddit || "").toLowerCase();
  if (toolSpecificSubreddits.has(subreddit)) return true;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(zapier|make\.com|airtable|notion|hubspot|pipedrive|zoho|shopify|n8n)\b/.test(text);
}

function defaultOutreachPosture(post, score = 3) {
  if (isSellerOrBuilderPost(post) || isRoleSeekerPost(post) || isMarketResearchPost(post)) return "ignore";
  if (hasExplicitPaidProject(post)) return "dm_now";
  if (score <= 2) return "ignore";
  if (
    post.outreachPosture &&
    allowedOutreachPostures.has(post.outreachPosture) &&
    (score >= 4 || isAdviceShapedOperationalPain(post))
  ) {
    return post.outreachPosture;
  }
  if (score <= 3) return "watch";
  return "comment_first";
}

function normalizeOutreachPosture(value, post, score) {
  let posture = allowedOutreachPostures.has(value) ? value : defaultOutreachPosture(post, score);
  if (post.negativeMatches?.length || isSellerOrBuilderPost(post) || isRoleSeekerPost(post) || isMarketResearchPost(post)) {
    return score <= 2 ? "ignore" : "watch";
  }
  if (posture === "dm_now" && !hasExplicitPaidProject(post)) {
    posture = score >= 4 ? "dm_if_engaged" : "watch";
  }
  if (score <= 3 && ["dm_now", "dm_if_engaged"].includes(posture)) {
    posture = "watch";
  }
  if (score <= 3 && posture === "comment_first" && !isAdviceShapedOperationalPain(post)) {
    posture = "watch";
  }
  if (score >= 4 && posture === "watch") {
    posture = "comment_first";
  }
  return posture;
}

function actionForOutreachPosture(posture) {
  if (posture === "dm_now") return "dm";
  if (posture === "dm_if_engaged") return "dm_if_engaged";
  if (posture === "comment_first") return "comment";
  if (posture === "ignore") return "ignore";
  return "watch";
}

function freeToPursuePathFor(posture) {
  if (posture === "dm_now") {
    return "Explicit project or hiring ask; use a manual DM or platform reply after checking subreddit norms.";
  }
  if (posture === "dm_if_engaged") {
    return "Public helpful comment first; DM only if OP replies, asks for implementation help, or clearly invites private follow-up.";
  }
  if (posture === "comment_first") {
    return "Public helpful comment first with no link; DM only after OP engages or explicitly asks for help.";
  }
  if (posture === "ignore") return "Do not pursue.";
  return "Watch for OP clarification before engaging.";
}

function suggestedCommentFor(post, posture) {
  if (!["comment_first", "dm_if_engaged", "dm_now"].includes(posture)) return "";
  const leadType = post.leadType || "workflow";
  if (leadType === "service-project-profitability") {
    return "I would separate this into job-level budget, committed cost, billed-to-date, and remaining work. The important part is deciding who updates each field and when, before choosing a tool.";
  }
  if (leadType === "daily-team-tasking") {
    return "The first thing I would map is the recurring task template by department, then the proof-of-completion step. Once that is clear, the app choice gets much easier.";
  }
  if (leadType === "sop-client-onboarding") {
    return "Start with the onboarding steps that happen every time and the decisions that still require judgment. That usually gives you the first useful SOP without over-documenting everything.";
  }
  if (leadType === "recruiting-handoff-drift") {
    return "I would look at where the intake notes become search criteria, scorecard fields, and outreach copy. That handoff is usually where time leaks and candidate quality drift show up.";
  }
  if (leadType === "tax-document-intake") {
    return "I would separate collection, classification, missing-item checks, and preparer review. AI can help with the middle steps, but the review queue and exception handling matter most.";
  }
  if (leadType === "invoice-payment-reconciliation") {
    return "I would start by standardizing the matching rules and exceptions. The automation is much easier once partial payments, missing references, and duplicates are handled explicitly.";
  }
  if (leadType === "crm-source-of-truth") {
    return "Before picking a CRM, I would define the source-of-truth fields, required follow-up events, and who owns data cleanup. That prevents the new CRM from becoming another spreadsheet.";
  }
  if (leadType === "local-service-revenue-leak") {
    return "I would map the path from call or quote request to booked job, then mark where response time or ownership breaks. That usually shows what needs automation versus a clearer handoff.";
  }
  return "I would map the repeatable steps, the owner for each handoff, and the exception cases first. Tool choice is easier once the workflow failure is explicit.";
}

function suggestedDmFor(post) {
  return `Hi, I saw your Reddit post about ${post.title}. I can help scope the workflow, identify the manual handoffs, and build a small implementation plan if you are still looking for paid help.`;
}

function stripPublicReplyUrls(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function scorePosts(posts, config, apiKey) {
  const reviewFloor = Math.min(3, config.minScore ?? 4);
  if (!config.useLlm || !apiKey) {
    return posts.map(scoreDeterministically).filter((lead) => lead.score >= reviewFloor);
  }

  const scored = [];
  for (const post of posts) {
    const score = await scoreWithLlm(post, config, apiKey).catch((error) => ({
      ...scoreDeterministically(post),
      scoreReason: `LLM scoring failed; deterministic fallback used. ${
        error instanceof Error ? error.message : String(error)
      }`,
    }));
    scored.push(score);
  }

  return scored.filter((lead) => lead.score >= reviewFloor);
}

function scoreDeterministically(post) {
  const category = categorize(post);
  let score = 2;
  if (isSellerOrBuilderPost(post) || isRoleSeekerPost(post) || isMarketResearchPost(post)) {
    score = 2;
  } else if (hasExplicitPaidProject(post)) {
    score = 5;
  } else if (isAdviceShapedOperationalPain(post)) {
    score = 4;
  } else if (category !== "other" && hasSpecificWorkflowPain(post) && hasBusinessContext(post)) {
    score = 4;
  } else {
    if (post.matchedKeywords.length >= 2) score += 1;
    if (post.communityPainMatches.length > 0) score += 1;
    if (post.archetypeMatches.length > 0) score += 1;
    if (post.buyingIntentMatches.length > 0) score += 1;
  }
  if (post.negativeMatches.length > 0) score -= 1;
  if (isGenericAdviceOnlyPost(post)) score = Math.min(score, 3);
  score = Math.max(1, Math.min(5, score));
  const outreachPosture = normalizeOutreachPosture(defaultOutreachPosture(post, score), post, score);
  const recommendedAction = actionForOutreachPosture(outreachPosture);

  return {
    ...post,
    score,
    category,
    leadType: post.leadType || "",
    vertical: post.vertical || "",
    failureMode: post.failureMode || "",
    outreachPosture,
    recommendedAction,
    freeToPursuePath: freeToPursuePathFor(outreachPosture),
    scoreReason: `Matched ${[...post.matchedKeywords, ...post.communityPainMatches].join(", ")}${
      post.buyingIntentMatches.length
        ? ` with buying intent: ${post.buyingIntentMatches.join(", ")}`
        : ""
    }${post.matchEvidence.length ? `; archetype evidence: ${post.matchEvidence.join(", ")}` : ""}.`,
    suggestedComment: suggestedCommentFor(post, outreachPosture),
    suggestedDm: outreachPosture === "dm_now" ? suggestedDmFor(post) : "",
  };
}

async function scoreWithLlm(post, config, apiKey) {
  const schemaEnums = llmSchemaEnums(config, post);
  const input = {
    subreddit: post.subreddit,
    title: post.title,
    summary: post.summary.slice(0, 2000),
    publishedAt: post.publishedAt,
    url: post.url,
    leadType: post.leadType,
    matchedLeadTypes: post.matchedLeadTypes,
    vertical: post.vertical,
    failureMode: post.failureMode,
    outreachPosture: post.outreachPosture,
    matchEvidence: post.matchEvidence,
    adviceShapedOperationalPain: isAdviceShapedOperationalPain(post),
    genericAdviceOnly: isGenericAdviceOnlyPost(post),
    matchedKeywords: post.matchedKeywords,
    communityPainMatches: post.communityPainMatches,
    buyingIntentMatches: post.buyingIntentMatches,
    negativeMatches: post.negativeMatches,
    commentContext: post.commentContext ?? null,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.llmModel || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You score Reddit posts for a freelance AI automation consultant. Return strict JSON only. Do not use markdown. The consultant builds practical workflow automations, internal tools, CRM automations, reporting pipelines, document/PDF automation, lightweight intake systems, and recruiting or scheduling operations for small businesses. Use three lanes: direct paid/project lead, comment-first operational pain, and watch/ignore. Score 5 only when the post explicitly asks to hire/pay/scope/build/fix something or describes a very specific implementation project with clear business stakes. Score 4 for specific recurring business workflow pain with concrete business context and process breakdown, even if the first action should be a public helpful comment. Score 3 for generic advice/tool recommendations, workflow curiosity, or public-reply opportunities without enough operational specificity. Score 1-2 for broad discussion, market research, networking, sellers, builders asking for feedback, agencies, course promoters, job seekers, or vague AI curiosity. Do not score a post 4+ just because it mentions automation, AI, CRM, Zapier, Make, Airtable, Notion, or spreadsheets. outreachPosture must be dm_now only for explicit paid/project/hiring intent, dm_if_engaged only when private follow-up is appropriate after OP engagement, comment_first for operational pain where public help comes first, watch for weak signals, and ignore for rejects. Suggested public comments must be brief, practical, Reddit-native, no URLs, and non-duplicative of commentContext. Do not say 'I can help' unless the post clearly asks for paid help. suggestedDm must be blank for comment_first unless OP explicitly invited private help. Do not overclaim platform-specific expertise.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "reddit_lead_score",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: { type: "integer", minimum: 1, maximum: 5 },
              category: {
                type: "string",
                enum: [
                  "crm_lead_followup",
                  "reporting_automation",
                  "document_pdf_automation",
                  "spreadsheet_internal_tools",
                  "staffing_recruiting",
                  "operations_intake",
                  "other",
                ],
              },
              leadType: {
                type: "string",
                enum: schemaEnums.leadTypes,
              },
              vertical: {
                type: "string",
                enum: schemaEnums.verticals,
              },
              failureMode: {
                type: "string",
                enum: schemaEnums.failureModes,
              },
              outreachPosture: {
                type: "string",
                enum: ["ignore", "watch", "comment_first", "dm_if_engaged", "dm_now"],
              },
              recommendedAction: {
                type: "string",
                enum: ["ignore", "watch", "comment", "dm_if_engaged", "dm"],
              },
              freeToPursuePath: { type: "string" },
              scoreReason: { type: "string" },
              suggestedComment: { type: ["string", "null"] },
              suggestedDm: { type: ["string", "null"] },
            },
            required: [
              "score",
              "category",
              "leadType",
              "vertical",
              "failureMode",
              "outreachPosture",
              "recommendedAction",
              "freeToPursuePath",
              "scoreReason",
              "suggestedComment",
              "suggestedDm",
            ],
          },
        },
      },
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI HTTP ${response.status}`);
  }

  const outputText = extractResponseText(body);
  const parsed = JSON.parse(outputText);
  return normalizeLlmScore(post, parsed, config);
}

function extractResponseText(body) {
  if (typeof body.output_text === "string") return body.output_text;

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    ?.find((content) => content.type === "output_text")?.text;

  if (typeof text === "string") return text;
  throw new Error("OpenAI response did not include output text");
}

function normalizeLlmScore(post, parsed, config) {
  let score = Number.isInteger(parsed.score)
    ? Math.max(1, Math.min(5, parsed.score))
    : 1;
  const category = allowedCategories.has(parsed.category) ? parsed.category : "other";
  const schemaEnums = llmSchemaEnums(config, post);
  const leadType = schemaEnums.leadTypes.includes(parsed.leadType) ? parsed.leadType : (post.leadType || "other");
  const vertical = schemaEnums.verticals.includes(parsed.vertical) ? parsed.vertical : (post.vertical || "other");
  const failureMode = schemaEnums.failureModes.includes(parsed.failureMode)
    ? parsed.failureMode
    : (post.failureMode || "other");
  let outreachPosture = allowedOutreachPostures.has(parsed.outreachPosture)
    ? parsed.outreachPosture
    : defaultOutreachPosture(post, score);
  let recommendedAction = allowedActions.has(parsed.recommendedAction)
    ? parsed.recommendedAction
    : "watch";
  const scoreReason = String(parsed.scoreReason || "").trim();
  const isAdvicePain = isAdviceShapedOperationalPain(post);

  if (category === "other") score = Math.min(score, 3);
  if (category !== "other" && post.buyingIntentMatches.length > 0) {
    score = Math.max(score, 4);
  }
  if (category !== "other" && hasExplicitPaidProject(post)) {
    score = 5;
  }
  if (category !== "other" && hasSpecificWorkflowPain(post) && hasBusinessContext(post)) {
    score = Math.max(score, 4);
  }
  if (category !== "other" && isAdvicePain) {
    score = Math.max(score, 4);
  }
  if (!hasSpecificWorkflowPain(post) && !hasExplicitPaidProject(post) && !isAdvicePain) {
    score = Math.min(score, 3);
  }
  if (isBasicSpreadsheetHelp(post)) score = Math.min(score, 3);
  if (isGeneralHelpReason(scoreReason) && !isAdvicePain) score = Math.min(score, 3);
  if (isSellerOrBuilderPost(post)) score = Math.min(score, 2);
  if (isRoleSeekerPost(post)) score = Math.min(score, 2);
  if (isEmploymentPost(post) && !hasConsultingBuyerIntent(post)) score = Math.min(score, 3);
  if (isMarketResearchPost(post)) score = Math.min(score, 3);
  if (!hasBestLeadSignal(post) && !isAdvicePain) score = Math.min(score, 3);
  if (!hasConsultingBuyerIntent(post) && !hasExplicitPaidProject(post) && !isAdvicePain) score = Math.min(score, 3);
  if (post.negativeMatches.length > 0) score = Math.min(score, 3);
  if (post.buyingIntentMatches.length === 0) score = Math.min(score, 4);
  if (recommendedAction === "ignore") score = Math.min(score, 2);
  if (recommendedAction === "watch") score = Math.min(score, 3);
  if (recommendedAction === "comment") score = Math.min(score, 4);
  if (isGenericAdviceOnlyPost(post)) score = Math.min(score, 3);
  outreachPosture = normalizeOutreachPosture(outreachPosture, post, score);
  recommendedAction = actionForOutreachPosture(outreachPosture);
  if (score <= 3 && ["dm", "dm_if_engaged"].includes(recommendedAction)) {
    recommendedAction = "watch";
    outreachPosture = "watch";
  }
  const suggestedComment = stripPublicReplyUrls(
    parsed.suggestedComment ? String(parsed.suggestedComment).trim() : "",
  );
  const suggestedDm = outreachPosture === "comment_first" && !hasExplicitPaidProject(post)
    ? ""
    : parsed.suggestedDm
      ? String(parsed.suggestedDm).trim()
      : "";

  return {
    ...post,
    score,
    category,
    leadType,
    vertical,
    failureMode,
    outreachPosture,
    recommendedAction,
    freeToPursuePath: parsed.freeToPursuePath
      ? String(parsed.freeToPursuePath).trim()
      : freeToPursuePathFor(outreachPosture),
    scoreReason,
    suggestedComment,
    suggestedDm,
  };
}

function llmSchemaEnums(config, post) {
  const archetypes = normalizeArchetypePacks(config.archetypePacks ?? []);
  const leadTypes = uniqueNonEmpty([...archetypes.map((pack) => pack.id), post.leadType, "other"]);
  const verticals = uniqueNonEmpty([...archetypes.map((pack) => pack.vertical), post.vertical, "other"]);
  const failureModes = uniqueNonEmpty([...archetypes.map((pack) => pack.failureMode), post.failureMode, "other"]);
  return { leadTypes, verticals, failureModes };
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildDigest({ date, leads, rejectedCount, feedResults, config, scanMode, rejectionSummary, partialCoverage }) {
  const sorted = [...leads].sort((a, b) => b.score - a.score);
  const best = sorted.filter((lead) => lead.score >= 4);
  const maybe = sorted.filter((lead) => lead.score === 3);
  const feedErrors = feedResults.filter((result) => !result.ok);
  const sourceMix = sourceMixSummary(sorted);
  const searchDiagnostics = queryDiagnostics(feedResults);

  return [
    `# Reddit Lead Digest - ${date}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Feeds checked: ${feedResults.length}`,
    `Scan mode: ${scanMode?.label ?? "Legacy config"}`,
    `Candidates included: ${best.length}`,
    `Review/watch candidates: ${maybe.length}`,
    `Filtered/rejected before digest: ${rejectedCount}`,
    `Minimum score: ${config.minScore}`,
    `Partial coverage: ${partialCoverage ? "yes" : "no"}`,
    "",
    "## Source Mix",
    "",
    [
      ...(sourceMix.length ? sourceMix : ["No scored leads."]),
      `- Rejected reasons: ${formatCounts(rejectionSummary ?? new Map())}`,
    ].join("\n"),
    "",
    "## Search Diagnostics",
    "",
    searchDiagnostics.length
      ? searchDiagnostics
          .map((item) => `- ${item.query}: ${item.status}, ${item.fetchedPosts} posts`)
          .join("\n")
      : "No global search queries were run.",
    "",
    "## Best Leads",
    "",
    best.length ? best.map(formatLead).join("\n\n") : "No 4+ leads found.",
    "",
    "## Maybe / Watch",
    "",
    maybe.length ? maybe.map(formatLead).join("\n\n") : "No 3/5 watch leads found.",
    "",
    "## Rejected",
    "",
    `${rejectedCount} posts were filtered out before scoring or digest inclusion.`,
    "",
    "## Feed Errors",
    "",
    feedErrors.length
      ? feedErrors
          .map(
            (error) =>
              `- ${error.url}: ${error.status}${error.error ? ` - ${error.error}` : ""}`,
          )
          .join("\n")
      : "No feed errors.",
    "",
  ].join("\n");
}

function formatLead(lead) {
  return [
    `### ${lead.score}/5 - r/${lead.subreddit} - ${lead.title}`,
    "",
    `- Posted date: ${dateOnly(lead.publishedAt) || "unknown"}`,
    `- URL: ${lead.url}`,
    `- Author: ${lead.author}`,
    `- Category: ${lead.category}`,
    `- Lead type: ${lead.leadType || "other"}`,
    `- Vertical: ${lead.vertical || "other"}`,
    `- Failure mode: ${lead.failureMode || "other"}`,
    `- Outreach posture: ${lead.outreachPosture || "watch"}`,
    `- Recommended action: ${lead.recommendedAction}`,
    `- Free-to-pursue path: ${lead.freeToPursuePath || freeToPursuePathFor(lead.outreachPosture || "watch")}`,
    lead.matchedLeadTypes?.length ? `- Matched lead types: ${lead.matchedLeadTypes.join(", ")}` : "",
    lead.matchEvidence?.length ? `- Match evidence: ${lead.matchEvidence.join(", ")}` : "",
    lead.commentContext ? `- Comment context: ${formatCommentContext(lead.commentContext)}` : "",
    `- Why it matched: ${lead.scoreReason || "No reason provided."}`,
    "",
    "Suggested comment:",
    "",
    lead.suggestedComment ? blockquote(lead.suggestedComment) : ">",
    "",
    "Suggested DM:",
    "",
    lead.suggestedDm ? blockquote(lead.suggestedDm) : ">",
    "",
    "Tracker row:",
    "",
    `| ${localDate()} | Reddit: r/${lead.subreddit} | u/${lead.author} | ${escapeTable(
      lead.title,
    )} | Not yet |  |  | New | ${escapeTable(lead.scoreReason || "")} |`,
  ].join("\n");
}

function sourceMixSummary(leads) {
  const byLeadType = countBy(leads, (lead) => lead.leadType || "other");
  const byPosture = countBy(leads, (lead) => lead.outreachPosture || "watch");
  const bySource = countBy(leads, (lead) => lead.subreddit || lead.sourceDetail || "unknown");
  return [
    `- By lead type: ${formatCounts(byLeadType)}`,
    `- By outreach posture: ${formatCounts(byPosture)}`,
    `- By subreddit/source: ${formatCounts(bySource)}`,
  ];
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
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

function queryDiagnostics(feedResults) {
  return feedResults
    .filter((result) => String(result.url || "").startsWith("reddit-search:"))
    .map((result) => ({
      query: result.url.replace(/^reddit-search:/, ""),
      status: result.ok ? "ok" : String(result.status || "error"),
      fetchedPosts: result.posts?.length ?? 0,
    }));
}

function rejectionReasonSummary(posts, portfolioRejectedCount = 0) {
  const counts = countBy(posts, rejectionReason);
  if (portfolioRejectedCount > 0) {
    counts.set("portfolio_caps", (counts.get("portfolio_caps") ?? 0) + portfolioRejectedCount);
  }
  return counts;
}

function rejectionReason(post) {
  const hasDiscoverySignal =
    post.matchedKeywords?.length > 0 ||
    post.communityPainMatches?.length > 0 ||
    post.archetypeMatches?.length > 0;
  if (!hasDiscoverySignal) return "no_discovery_signal";
  if (post.hardNegativeMatches?.length > 0) return "hard_negative";
  if (isSellerOrBuilderPost(post)) return "seller_or_builder";
  if (isRoleSeekerPost(post)) return "role_seeker";
  if (isEmploymentPost(post) && !hasConsultingBuyerIntent(post)) return "employment_only";
  if (isMarketResearchPost(post)) return "market_research";
  if ((post.negativeMatches?.length ?? 0) > 0 && (post.buyingIntentMatches?.length ?? 0) === 0) {
    return "negative_without_buying_intent";
  }
  if (isGenericAdviceOnlyPost(post)) return "generic_advice";
  return "not_request_or_operational_pain";
}

function formatCommentContext(commentContext) {
  const parts = [];
  if (commentContext.selfPromotionRisk) parts.push(`self-promotion risk ${commentContext.selfPromotionRisk}`);
  if (commentContext.opReplies?.length) parts.push(`OP replies: ${commentContext.opReplies.join(" / ")}`);
  if (commentContext.topAdviceThemes?.length) {
    parts.push(`existing advice: ${commentContext.topAdviceThemes.slice(0, 2).join(" / ")}`);
  }
  if (commentContext.unansweredAngle) parts.push(`angle: ${commentContext.unansweredAngle}`);
  return parts.join("; ");
}

function dateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function categorize(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (/(recruit|recruiting|applicant|candidate|job boards?|staffing|hire|hiring|nurses?|contractors?|screening applicants|busy season)/i.test(text)) {
    return "staffing_recruiting";
  }
  if (/(intake|scheduling|appointments?|missed calls?|customer messages?|quote requests?|dispatch|can't keep track|cant keep track|buried in emails)/i.test(text)) {
    return "operations_intake";
  }
  if (/(crm|lead|drip|sms|email sequence|follow[- ]up|gohighlevel|rei reply|hubspot|zoho)/i.test(text)) {
    return "crm_lead_followup";
  }
  if (/(report|reporting|dashboard|board|investor|kpi|accounting|profitability|budget|job costing|cost to complete)/i.test(text)) {
    return "reporting_automation";
  }
  if (/(pdf|document|invoice|receipt|ocr|scan|redact|k-1|pbc|client docs?|client documents?)/i.test(text)) {
    return "document_pdf_automation";
  }
  if (/(spreadsheet|excel|google sheets|airtable|internal tool|whiteboard|checklist|sop)/i.test(text)) {
    return "spreadsheet_internal_tools";
  }
  return "other";
}

function hasRequestIntent(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /looking for|need help|recommend|recommendations|which .* use|anyone .* use|how do i|how do you|what system|what tools?|when did you|is there a better way|where do i start|seeking|paid help|paid opportunity|hire|consultant|freelancer|developer|build this|need someone|help setting up|open to paid help/.test(
    text,
  );
}

function hasExplicitPaidProject(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (isRoleSeekerPost(post) || isEmploymentPost(post)) return false;
  const explicitHire = /\b(hire someone to|need to hire someone to|need someone to|looking for someone to|paid help|open to paid help|willing to pay|take my money|consultant|developer|freelancer)\b/.test(
    text,
  );
  const projectWork = /build|develop|software|automation|automate|workflow|crm|pdf|report|spreadsheet|excel|internal tool|recruiting|staffing|scheduling|intake|applicants?|follow up|follow-up/.test(
    text,
  );
  return explicitHire && projectWork;
}

function hasSpecificWorkflowPain(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /manual|copy.?paste|spreadsheet|google sheets|excel|crm|follow[- ]?up|invoice|receipt|pdf|report|dashboard|bookkeeping|reconciliation|onboarding|offboarding|intake|form submissions?|lead routing|pipeline|inventory|orders?|fulfillment|client portal|data cleanup|api|zapier|make|n8n|airtable|notion|hubspot|pipedrive|zoho|quickbooks|xero|power bi|looker|data entry|every day|every week|every month|takes forever|too slow|mess|chaotic|stuck|can't figure|cant figure|desperate|job boards?|not bringing in anyone|need help finding|can't find|cant find|recruiting|staffing|applicants?|candidates?|screening|scheduling|busy season|missed calls?|customer messages?|quote requests?|buried in emails|can't keep track|cant keep track|whiteboard|checklist|sop|standard operating|project profitability|job costing|budget|cost to complete|k-1|pbc|client documents?|client docs?|brief drift|scorecard|handoff|bank transactions?|matching invoices?/.test(
    text,
  );
}

function hasBusinessContext(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /business|company|agency|client|customer|lead|sales|team|department|contractor|freelancer|employee|shopify|store|ecommerce|bookkeeping|accounting|tax|firm|practice|real estate|realtor|msp|service business|consultancy|consulting|startup|founder|ops|operations|revenue|orders?|invoices?|prospects?|pipeline|warehouse|inventory|tickets?|staff|staffing|recruit|recruiting|applicants?|candidates?|nurses?|drivers?|dispatch|appointments?/.test(
    text,
  );
}

function isSellerOrBuilderPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(i built|i made|i launched|i created|my app|my product|my tool|looking for feedback|feedback on my|showcase|case study|available for|for hire|hire me|looking for clients)\b/.test(
    text,
  );
}

function isEmploymentPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const hiringTitle = /^\s*(\[hiring\]|\(hiring\)|hiring\b|job:|remote job\b)/i.test(
    post.title,
  );
  const roleTerms =
    /\b(full[- ]?time|part[- ]?time|salary|hourly|per hour|\/hr|usd\/hr|remote role|job posting|job description|assistant|virtual assistant|sales rep|sales guy|appointment setter|closer|internship)\b/.test(
      text,
    );
  const lowWage = /\$ ?\d{1,2}\s*[-–]\s*\$ ?\d{1,2}\s*\/?(hr|hour)?|\b\d{1,2}\s*usd\/hr\b/.test(
    text,
  );
  return hiringTitle || (roleTerms && lowWage);
}

function isRoleSeekerPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const explicitSeeker =
    /\b(looking for a role|looking for work|looking for a job|open to work|seeking a role|seeking work|seeking a job|job search|my resume|resume review|portfolio review|hire me|for hire|available for freelance|available for contract)\b/.test(
      text,
    );
  const titleSeeker = /^\s*(looking for|seeking)\b.+\b(job|role|position|opportunity|work)\b/i.test(
    post.title,
  );
  return explicitSeeker || titleSeeker;
}

function isMarketResearchPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(market research|potential collab|collab opportunity|how'?s the general market|market for .*smb|do you actually need|would you pay for|validate this idea|validating an idea|bad idea|feedback on my idea)\b/.test(
    text,
  );
}

function hasConsultingBuyerIntent(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (isRoleSeekerPost(post) || isMarketResearchPost(post)) return false;
  if (isEmploymentPost(post)) {
    return /\b(consultant|contractor|freelancer|agency|implementation|setup|build this|automate this|project|one[- ]?off|fixed price|scope)\b/.test(
      text,
    );
  }
  const asksForPaidHelp =
    /\b(hire someone|need to hire someone|paid help|open to paid help|willing to pay|take my money|consultant|freelancer|contractor|developer|expert|build this for me|need someone to|looking for someone to|help setting up)\b/.test(
      text,
    );
  const implementationPain =
    hasSpecificWorkflowPain(post) &&
    hasBusinessContext(post) &&
    /\b(need|looking for|help|stuck|can't figure|cant figure|desperate|mess|manual|takes forever|too slow|broken|chaotic|moving off|switching from|migrate|setup|set up|integrate|automate)\b/.test(
      text,
    );
  return asksForPaidHelp || implementationPain;
}

function hasBestLeadSignal(post) {
  if (hasExplicitPaidProject(post)) return true;
  if (isRoleSeekerPost(post) || isEmploymentPost(post) || isMarketResearchPost(post)) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const strongPain =
    /\b(struggling|struggle|problem|pain|painful|mess|messy|manual|copy.?paste|takes forever|too slow|stuck|can't figure|cant figure|desperate|chaotic|broken|overwhelmed|moving off|switching from|migrate|migration|setup|set up|integrate|integration|reconciliation|manual reporting|difficult reporting|reporting issue|reporting problem|job boards? not|not bringing in anyone|can't find|cant find|need help finding|busy season|missed calls?|too many messages|buried in emails|can't keep track|cant keep track|screening applicants|scheduling mess)\b/.test(
      text,
    );
  const genericAdviceTitle =
    /^\s*(how do|how are|what are|what is|what'?s|what .*best|what .*tools?|what .*software|which|best|recommend|any recommendations|is it worth)\b/i.test(
      post.title,
    );
  const asksForImplementationHelp =
    /\b(need help|looking for help|help setting up|need a solution|need someone to|looking for someone to|can someone help|where do i start)\b/.test(
      text,
    );
  if (genericAdviceTitle && !strongPain && !asksForImplementationHelp) return false;
  return hasSpecificWorkflowPain(post) && hasBusinessContext(post) && (strongPain || asksForImplementationHelp);
}

function isBasicSpreadsheetHelp(post) {
  if (post.buyingIntentMatches.length > 0) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(line graph|chart|formula|vlookup|xlookup|pivot table|conditional formatting)\b/.test(
    text,
  );
}

function isGeneralHelpReason(scoreReason) {
  return /general help|general request|request for advice|seeking recommendations|seeking advice|does not show specific workflow pain|does not show explicit buying intent|does not express immediate buying intent|does not indicate specific workflow|does not indicate specific business workflow|does not request paid help|does not indicate clear buying intent|does not indicate immediate buying intent|does not ask for hiring|does not ask .*project|does not ask to hire|does not ask .*implement|does not explicitly ask|doesn't explicitly ask|does not explicitly request|doesn't explicitly request|without a clear direct buying intent|without clear direct buying intent|without explicit buying|without .*buying or hiring intent|without .*buying or hiring request|without .*specific workflow problem|without .*specific pain|lacks explicit buying intent|lacks clear buyer intent|no clear buyer intent|no clear buying intent|no clear indication of buying intent|no explicit buying or hiring request|no explicit intent to hire|no explicit .*intent .*implement|no specific implementation project|no specific workflow pain|beyond general curiosity/.test(
    scoreReason.toLowerCase(),
  );
}

function isGenericAdviceOnlyPost(post) {
  if (hasExplicitPaidProject(post)) return false;
  if (isAdviceShapedOperationalPain(post)) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const asksForAdvice =
    /\b(how do|how are you|what do you|what are you|any recommendations|recommend a|recommendations for|best way to|what software|which software|which tool|what tool)\b/.test(
      text,
    );
  const projectLanguage = /\b(hire|paid help|open to paid help|need someone|need to hire|build this for me|consultant|freelancer|developer)\b/.test(
    text,
  );
  return asksForAdvice && !projectLanguage;
}

function isAdviceShapedOperationalPain(post) {
  if (hasExplicitPaidProject(post)) return false;
  if (isSellerOrBuilderPost(post) || isRoleSeekerPost(post) || isMarketResearchPost(post)) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const asksForAdvice =
    /\b(how do|how are you|what do you|what are you|what system|what software|which software|which tool|what tool|tools are actually working|when did you|is there a better way|best way to|any recommendations|recommendations for|what .* doing)\b/.test(
      text,
    );
  if (!asksForAdvice) return false;
  const hasCurrentSystem =
    /\b(spreadsheet|spreadsheets|excel|google sheets|email|emails|inbox|whiteboard|texts?|photos?|manual|crm|accounting software|ats|pdf|portal|quickbooks|xero|paper|checklist)\b/.test(text);
  const hasRecurrence =
    /\b(daily|weekly|monthly|every project|every day|every time|many clients|multiple clients|hundreds|busy season|multiple departments|20 employees|team|as we'?ve grown|taken on more work)\b/.test(text);
  const hasConsequence =
    /\b(missed follow[- ]?up|late k-?1s?|amended returns?|slow quotes?|lost leads?|hard to see|harder to get a quick view|takes forever|buried|not scalable|outgrown|outgrowing|reinventing the wheel|can't keep track|cant keep track|messy|chaotic|breaks|held up)\b/.test(text);
  const evidenceCount = [
    hasBusinessContext(post),
    hasCurrentSystem,
    hasRecurrence,
    hasConsequence,
    asksForAdvice,
  ].filter(Boolean).length;
  return evidenceCount >= 3 &&
    (hasRecurrence || hasConsequence) &&
    (hasSpecificWorkflowPain(post) || (post.archetypeMatches?.length ?? 0) > 0);
}

function dedupePosts(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    const keys = [
      post.url,
      `${post.author}:${normalizeComparableTitle(post.title)}`,
      normalizeComparableTitle(post.title),
    ].filter(Boolean);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

function normalizeComparableTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function termsInText(text, terms) {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

function textFromTag(block, tag) {
  const match = block.match(new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i"));
  return match ? match[1] : "";
}

function textFromNestedTag(block, parentTag, childTag) {
  const parent = textFromTag(block, parentTag);
  return parent ? textFromTag(parent, childTag) : "";
}

function attrFromTag(block, tag, attr) {
  const match = block.match(new RegExp(`<${escapeRegExp(tag)}\\b([^>]*)>`, "i"));
  if (!match) return "";
  const attrMatch = match[1].match(new RegExp(`${escapeRegExp(attr)}=["']([^"']+)["']`, "i"));
  return attrMatch ? decodeXml(attrMatch[1]) : "";
}

function subredditFromFeed(feedUrl) {
  const match = feedUrl.match(/\/r\/([^/]+)/i);
  return match ? match[1] : "unknown";
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeAuthor(author) {
  return decodeXml(stripHtml(author))
    .replace(/^\/?u\//i, "")
    .trim();
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

function stripQuotes(value) {
  const trimmed = String(value || "").trim();
  return trimmed.replace(/^["']|["']$/g, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeTable(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function blockquote(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
