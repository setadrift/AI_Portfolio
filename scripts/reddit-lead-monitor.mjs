import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CONFIG_PATH = "config/reddit-lead-monitor.json";
const FEEDBACK_PATH = "config/reddit-lead-feedback.json";
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
  "i made",
  "case study",
  "looking for feedback",
  "feedback on my",
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
  "portfolio review",
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
  "portfolio review",
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

const defaultPatternFamilies = [
  {
    id: "direct_implementation_request",
    label: "Direct implementation request",
    defaultOutreachPosture: "dm_now",
    requires: ["requestEvidence", "workflowEvidence"],
  },
  {
    id: "stuck_builder_ceiling",
    label: "Stuck builder / ceiling hit",
    defaultOutreachPosture: "dm_now",
    requires: ["requestEvidence", "currentSystemEvidence", "painEvidence"],
  },
  {
    id: "operational_pain_advice",
    label: "Operational pain advice",
    defaultOutreachPosture: "comment_first",
    requires: ["currentSystemEvidence", "painEvidence", "businessEvidence"],
  },
  {
    id: "tool_shopping_with_implementation_pain",
    label: "Tool shopping with implementation pain",
    defaultOutreachPosture: "comment_first",
    requires: ["toolShoppingEvidence", "workflowEvidence", "painEvidence"],
  },
  {
    id: "vendor_platform_with_scope",
    label: "Vendor specialist with implementation scope",
    defaultOutreachPosture: "watch",
    requires: ["vendorEvidence", "workflowEvidence", "requestEvidence"],
  },
  {
    id: "partner_overflow_implementation",
    label: "Partner / overflow implementation demand",
    defaultOutreachPosture: "dm_if_engaged",
    requires: ["partnerEvidence", "workflowEvidence", "businessEvidence"],
  },
];

const requestEvidenceTerms = [
  "willing to pay",
  "paid help",
  "open to paid help",
  "paid opportunity",
  "paid implementation",
  "hire someone",
  "need to hire",
  "looking for someone",
  "looking for someone experienced",
  "can anyone create",
  "can someone create",
  "can anyone build",
  "can someone build",
  "need someone to build",
  "need someone to fix",
  "need someone to create",
  "help me finish",
  "take over parts",
  "review what i've built",
  "review what i have built",
  "freelancer",
  "consultant",
  "not tech-inclined",
  "not tech inclined",
  "can't get it to work",
  "cant get it to work",
  "can't figure out",
  "cant figure out",
  "help setting up",
];

const workflowEvidenceTerms = [
  "automator",
  "shortcut",
  "shortcuts",
  "script",
  "ffmpeg",
  "spreadsheet",
  "google sheets",
  "excel",
  "crm",
  "airtable",
  "zapier",
  "make",
  "n8n",
  "pdf",
  "mp4",
  "mov",
  "image",
  "audio",
  "invoice",
  "receipt",
  "report",
  "dashboard",
  "forms",
  "email",
  "calendar",
  "follow up",
  "follow-up",
  "ai workflow",
  "ai workflows",
  "business process automation",
  "custom system",
  "source of truth",
  "claude",
  "chatgpt",
  "data entry",
  "file",
  "files",
  "merge",
  "convert",
  "client onboarding",
  "onboarding",
  "sop",
  "task list",
  "checklist",
  "property management",
  "property manager",
  "rental",
  "tenant",
  "maintenance",
  "turnover",
  "data pipeline",
];

const currentSystemEvidenceTerms = [
  "spreadsheet",
  "spreadsheets",
  "google sheets",
  "excel",
  "whiteboard",
  "email",
  "emails",
  "inbox",
  "crm",
  "pdf",
  "paper",
  "manual",
  "custom system",
  "existing system",
  "one place",
  "single source of truth",
  "source of truth",
  "consolidate",
  "consolidating",
  "built with",
  "claude",
  "chatgpt",
  "forms",
  "texts",
  "photos",
  "canva",
  "imovie",
  "automator",
  "ffmpeg",
  "sop",
  "client onboarding",
  "onboarding",
  "process",
  "task list",
  "checklist",
];

const painEvidenceTerms = [
  "takes forever",
  "can't keep track",
  "cant keep track",
  "too many",
  "manual",
  "one by one",
  "missed",
  "forget",
  "forgets",
  "hard to know",
  "hard to track",
  "keeps forgetting",
  "stuck",
  "hit a ceiling",
  "hit the ceiling",
  "hitting a ceiling",
  "spending too much time",
  "working through it",
  "take over parts",
  "help me finish",
  "mess",
  "messy",
  "chaotic",
  "not scalable",
  "outgrown",
  "outgrowing",
  "hard to see",
  "buried",
  "can't seem to get it to work",
  "cant seem to get it to work",
  "didn't come out with a successful result",
  "didnt come out with a successful result",
  "would love to automate",
  "reinventing the wheel",
  "never wrote down",
  "recurring",
];

const businessEvidenceTerms = [
  "business",
  "company",
  "clients",
  "customers",
  "team",
  "employees",
  "orders",
  "invoices",
  "leads",
  "appointments",
  "projects",
  "clinic",
  "agency",
  "store",
  "practice",
  "workflow",
  "workflows",
  "customer",
  "client",
  "real estate",
  "property",
  "properties",
  "property management",
  "property manager",
  "rental",
  "rentals",
  "tenant",
  "tenants",
  "maintenance",
  "ecommerce",
  "retail",
  "nonprofit",
  "donor",
  "healthcare",
];

const toolShoppingEvidenceTerms = [
  "recommend",
  "recommendations",
  "alternative",
  "alternatives",
  "best tool",
  "best software",
  "what tool",
  "which tool",
  "what software",
  "which software",
  "what system",
  "any good",
  "anyone using",
  "who do you use",
];

const vendorEvidenceTerms = [
  "expert",
  "specialist",
  "consultant",
  "agency",
  "developer",
  "gohighlevel",
  "alteryx",
  "zoho",
  "hubspot",
  "salesforce",
  "make.com",
  "zapier",
  "airtable",
];

const partnerEvidenceTerms = [
  "overflow",
  "subcontract",
  "subcontractor",
  "white label implementation",
  "implementation partner",
  "client asked",
  "my client needs",
];

async function main() {
  const config = await loadConfig();
  const feedback = await loadFeedback();
  const runtimeConfig = { ...config, feedback };
  if (process.argv.includes("--score-fixtures")) {
    await runFixtureScoring(runtimeConfig);
    return;
  }

  const scanConfig = selectedScanConfig(runtimeConfig);
  const env = {
    ...(await loadDotEnv(".env.local")),
    ...process.env,
  };
  const outputDate = localDate();
  const maxAgeMs = (runtimeConfig.maxAgeHours ?? 48) * 60 * 60 * 1000;
  const now = Date.now();

  const feedResults = [];
  const posts = [];

  const channels = limitChannels(normalizeChannels(scanConfig));
  const searchQueries = limitSearchQueries(scanConfig.searchQueries ?? []);
  const totalConfiguredFeeds = channels.length + searchQueries.length;
  progress(`Mode: ${scanConfig.scanMode?.label ?? "Legacy config"}. Checking ${channels.length} subreddits and ${searchQueries.length} searches.`);
  const requiresOauth = (config.ingestionMode ?? "oauth") === "oauth";
  progress("Authenticating with Reddit...");
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
        url: `reddit-search:${searchQueryId(query)}`,
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
  if (channels.length) progress("Fetching subreddit posts...");
  for (const [index, channel] of channels.entries()) {
    const result = await fetchChannel(channel, {
      token: redditToken,
      limit: runtimeConfig.limitPerChannel ?? 25,
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
    });
    feedResults.push(result);
    if (result.ok) posts.push(...result.posts);
    progress(`Subreddit ${index + 1}/${channels.length}: r/${channel.subreddit} ${result.ok ? `fetched ${result.posts.length}` : `failed (${result.status})`}.`);
    if (index < channels.length - 1) {
      await sleep(runtimeConfig.requestDelayMs ?? 1500);
    }
  }
  if (searchQueries.length) progress("Fetching Reddit search results...");
  for (const [index, query] of searchQueries.entries()) {
    const result = await fetchSearchQuery(query, {
      token: redditToken,
      limit: runtimeConfig.limitPerSearch ?? 25,
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
    });
    feedResults.push(result);
    if (result.ok) posts.push(...result.posts);
    progress(`Search ${index + 1}/${searchQueries.length}: ${result.ok ? `fetched ${result.posts.length}` : `failed (${result.status})`} for ${searchQueryLabel(query)}.`);
    if (index < searchQueries.length - 1) {
      await sleep(runtimeConfig.requestDelayMs ?? 1500);
    }
  }

  progress(`Fetched ${posts.length} raw posts. Filtering candidates...`);
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
  let filtered = selectCandidatePortfolio(eligiblePosts, scanConfig, runtimeConfig);
  const portfolioRejectedCount = Math.max(0, freshPosts.length - filtered.length - preScoringRejected.length);
  progress(`Selected ${filtered.length} candidates for scoring from ${freshPosts.length} fresh posts.`);

  if (useOauth && runtimeConfig.commentContextEnabled !== false) {
    progress("Loading comment context for top candidates...");
    filtered = await enrichCandidatesWithCommentContext(filtered, {
      token: redditToken,
      limit: runtimeConfig.commentLimitPerPost ?? 20,
      candidateLimit: runtimeConfig.commentContextCandidateLimit ?? 15,
      sort: runtimeConfig.commentSort || "top",
      userAgent: env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT,
      requestDelayMs: runtimeConfig.requestDelayMs ?? 1500,
    });
  }

  progress(`Scoring ${filtered.length} candidates...`);
  const scored = await scorePosts(filtered, runtimeConfig, env.OPENAI_API_KEY);
  const includedLeads = scored.filter((lead) => isReplyTodayLead(lead, runtimeConfig));
  progress(`Scoring complete: ${includedLeads.length} qualified leads, ${Math.max(0, scored.length - includedLeads.length)} watch/review candidates.`);
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
    scoredCount: filtered.length,
    rejectedCount: freshPosts.length - filtered.length,
    feedResults,
    config: runtimeConfig,
    scanMode: scanConfig.scanMode,
    rejectionSummary: rejectionReasonSummary(preScoringRejected, portfolioRejectedCount),
    sourcePerformance: sourcePerformanceSummary(feedResults, scored, runtimeConfig.feedback),
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
    queryDiagnostics: queryDiagnostics(feedResults, scored, runtimeConfig),
    sourcePerformance: sourcePerformanceSummary(feedResults, scored, runtimeConfig.feedback),
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

function progress(message) {
  console.log(`[scan] ${message}`);
}

async function loadConfig() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadFeedback() {
  if (!existsSync(FEEDBACK_PATH)) {
    return normalizeFeedback({});
  }
  const raw = await readFile(FEEDBACK_PATH, "utf8");
  return normalizeFeedback(JSON.parse(raw));
}

function normalizeFeedback(raw) {
  const negativePersonas = Array.isArray(raw.negativePersonas)
    ? raw.negativePersonas.map((persona) => ({
        id: slug(persona.id || persona.label),
        label: String(persona.label || persona.id || "Negative persona"),
        description: String(persona.description || ""),
        hardReject: Boolean(persona.hardReject),
        phrases: normalizeSignalList(persona.phrases),
      })).filter((persona) => persona.id)
    : [];
  const positiveExamples = Array.isArray(raw.positiveExamples) ? raw.positiveExamples : [];
  const rejectedExamples = Array.isArray(raw.rejectedExamples) ? raw.rejectedExamples : [];
  const sourcePerformance = raw.sourcePerformance && typeof raw.sourcePerformance === "object"
    ? raw.sourcePerformance
    : { subreddits: {}, queries: {} };
  return {
    version: Number.parseInt(String(raw.version || 1), 10) || 1,
    positiveExamples,
    negativePersonas,
    rejectedExamples,
    sourcePerformance: {
      subreddits: sourcePerformance.subreddits && typeof sourcePerformance.subreddits === "object"
        ? sourcePerformance.subreddits
        : {},
      queries: sourcePerformance.queries && typeof sourcePerformance.queries === "object"
        ? sourcePerformance.queries
        : {},
    },
  };
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
        ok: !("fitScore" in expected) || scored.fitScore === expected.fitScore,
        message: `fitScore ${scored.fitScore || "blank"} did not match ${expected.fitScore}`,
      },
      {
        ok: !("replyabilityScore" in expected) || scored.replyabilityScore === expected.replyabilityScore,
        message: `replyabilityScore ${scored.replyabilityScore || "blank"} did not match ${expected.replyabilityScore}`,
      },
      {
        ok: !expected.posture || scored.outreachPosture === expected.posture,
        message: `posture ${scored.outreachPosture || "blank"} did not match ${expected.posture}`,
      },
      {
        ok: !expected.pattern || scored.pattern === expected.pattern,
        message: `pattern ${scored.pattern || "blank"} did not match ${expected.pattern}`,
      },
      {
        ok: !("negativePersona" in expected) ||
          (expected.negativePersona
            ? scored.negativePersona === expected.negativePersona
            : !scored.negativePersona),
        message: `negative persona ${scored.negativePersona || "blank"} did not match ${expected.negativePersona || "blank"}`,
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
      fitScore: scored.fitScore,
      replyabilityScore: scored.replyabilityScore,
      posture: scored.outreachPosture,
      leadType: scored.leadType || "blank",
      pattern: scored.pattern || "blank",
      negativePersona: scored.negativePersona || "blank",
      status: failedChecks.length ? "FAIL" : "PASS",
    };
  });

  for (const row of rows) {
    console.log(`${row.status} ${row.id}: score=${row.score} fit=${row.fitScore} reply=${row.replyabilityScore} posture=${row.posture} leadType=${row.leadType} pattern=${row.pattern} negative=${row.negativePersona}`);
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
      sourcePerformance: sourcePerformanceSummary(
        [{ ok: true, url: "fixture:reddit-lead-scanner-quality", status: "fixture", posts: fixtures }],
        scoredLeads,
        config.feedback,
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
      sourcePerformance: sourcePerformanceSummary(
        [{ ok: true, url: "fixture:reddit-lead-scanner-quality", status: "fixture", posts: fixtures }],
        scoredLeads,
        config.feedback,
      ),
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
  const patternFamilies = normalizePatternFamilies(config.patternFamilies);
  const scanMode = requestedMode
    ? scanModes.find((mode) => scanModeMatches(mode, requestedMode))
    : scanModes[0] ?? null;

  if (!scanMode) {
    return {
      ...config,
      scanMode: null,
      channels: config.channels ?? [],
      searchQueries: config.searchQueries ?? [],
      archetypePacks,
      patternFamilies,
      feedback: config.feedback,
    };
  }

  const selectedArchetypes = archetypesForScanMode(scanMode, archetypePacks);
  const includeArchetypeChannels = scanMode.includeArchetypeChannels !== false;
  const expandedChannels = dedupeChannels([
    ...(scanMode.channels ?? config.channels ?? []),
    ...(includeArchetypeChannels ? selectedArchetypes.flatMap((pack) => pack.channels) : []),
  ]);
  const expandedSearchQueries = dedupeSearchQueries([
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
    patternFamilies,
    channels: expandedChannels,
    searchQueries: expandedSearchQueries,
    feedback: config.feedback,
    minSuccessfulFeeds: scanMode.minSuccessfulFeeds ?? config.minSuccessfulFeeds,
  };
}

function scanModeMatches(mode, requestedMode) {
  const requested = slug(requestedMode);
  const ids = [
    mode.id,
    mode.label,
    ...(Array.isArray(mode.aliases) ? mode.aliases : []),
  ].map((value) => slug(value));
  return ids.includes(requested);
}

function normalizePatternFamilies(families) {
  const source = Array.isArray(families) && families.length ? families : defaultPatternFamilies;
  return source
    .map((family) => ({
      id: slug(family.id || family.label).replace(/-/g, "_"),
      label: family.label || family.id || "Pattern family",
      defaultOutreachPosture: allowedOutreachPostures.has(family.defaultOutreachPosture)
        ? family.defaultOutreachPosture
        : "watch",
      requires: Array.isArray(family.requires)
        ? family.requires.map((field) => String(field || "").trim()).filter(Boolean)
        : [],
    }))
    .filter((family) => family.id && family.requires.length);
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

function dedupeSearchQueries(values) {
  const seen = new Set();
  const deduped = [];
  for (const value of values) {
    const normalized = normalizeSearchQuery(value);
    const key = normalized.query.toLowerCase();
    if (!normalized.query || seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function normalizeSearchQuery(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const query = String(value.query || value.q || "").trim();
    const id = slug(value.id || value.label || query);
    return {
      id,
      query,
      label: value.label || query,
      patternFamily: slug(value.patternFamily || value.pattern || "").replace(/-/g, "_"),
      vertical: slug(value.vertical || "any").replace(/-/g, "_"),
      failureMode: slug(value.failureMode || "").replace(/-/g, "_"),
      expectedSignal: String(value.expectedSignal || value.signal || "").trim(),
      fallbackQuery: String(value.fallbackQuery || "").trim(),
    };
  }
  const query = String(value || "").trim();
  return {
    id: slug(query).slice(0, 80),
    query,
    label: query,
    patternFamily: "",
    vertical: "any",
    failureMode: "",
    expectedSignal: "",
    fallbackQuery: "",
  };
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
    ? queries.filter((query) =>
        [query.id, query.label, query.query, query.patternFamily, query.vertical, query.failureMode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(match.toLowerCase())),
      )
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
  const querySpec = normalizeSearchQuery(query);
  if (!options.token) {
    return {
      ok: false,
      url: `reddit-search:${searchQueryId(querySpec)}`,
      query: querySpec,
      status: "missing_oauth_token",
      error: "Search discovery requires Reddit OAuth.",
      posts: [],
    };
  }

  const params = new URLSearchParams({
    q: querySpec.query,
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
        url: `reddit-search:${searchQueryId(querySpec)}`,
        query: querySpec,
        status: response.status,
        error: JSON.stringify(body).slice(0, 200),
        posts: [],
      };
    }

    return {
      ok: true,
      url: `reddit-search:${searchQueryId(querySpec)}`,
      query: querySpec,
      status: response.status,
      posts: parseRedditListing(body, {
        subreddit: "search",
        sourceMode: "search",
        sourceDetail: searchQueryId(querySpec),
        sourceQuery: querySpec.query,
        sourcePatternFamily: querySpec.patternFamily,
        sourceVertical: querySpec.vertical,
        sourceFailureMode: querySpec.failureMode,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      url: `reddit-search:${searchQueryId(querySpec)}`,
      query: querySpec,
      status: "network_error",
      error: error instanceof Error ? error.message : String(error),
      posts: [],
    };
  }
}

function searchQueryId(query) {
  const querySpec = normalizeSearchQuery(query);
  return querySpec.id || slug(querySpec.query).slice(0, 80) || querySpec.query;
}

function searchQueryLabel(query) {
  const querySpec = normalizeSearchQuery(query);
  return querySpec.label || querySpec.query || querySpec.id;
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
      sourceQuery: channel.sourceQuery || "",
      sourcePatternFamily: channel.sourcePatternFamily || "",
      sourceVertical: channel.sourceVertical || "",
      sourceFailureMode: channel.sourceFailureMode || "",
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
  const families = normalizePatternFamilies(scanConfig.patternFamilies);
  const structuredEvidence = collectStructuredEvidence(text);
  const patternMatches = matchPatternFamilies(structuredEvidence, families);
  const negativePersonas = matchNegativePersonas(text, scanConfig.feedback?.negativePersonas ?? [])
    .filter((persona) =>
      !isAllowedStuckBuilderPersonaMatch(persona, structuredEvidence) &&
      !isAllowedToolShoppingPersonaMatch(persona, structuredEvidence)
    );
  const hardNegativePersonas = negativePersonas.filter((persona) => persona.hardReject);
  const matchedKeywords = termsInText(text, positiveTerms);
  const communityPainMatches = termsInText(text, communityPainTerms);
  const buyingIntentMatches = termsInText(text, buyingIntentTerms);
  const negativeMatches = termsInText(text, negativeTerms);
  const hardNegativeMatches = termsInText(text, hardNegativeTerms);
  const archetypeMatches = matchArchetypes(text, scanConfig.archetypePacks ?? []);
  const primaryArchetype = primaryArchetypeMatch(archetypeMatches);

  return {
    matchedKeywords,
    feedback: scanConfig.feedback,
    communityPainMatches,
    buyingIntentMatches,
    negativeMatches,
    hardNegativeMatches,
    structuredEvidence,
    requestEvidence: structuredEvidence.requestEvidence,
    workflowEvidence: structuredEvidence.workflowEvidence,
    painEvidence: structuredEvidence.painEvidence,
    currentSystemEvidence: structuredEvidence.currentSystemEvidence,
    businessEvidence: structuredEvidence.businessEvidence,
    budgetEvidence: structuredEvidence.budgetEvidence,
    toolShoppingEvidence: structuredEvidence.toolShoppingEvidence,
    vendorEvidence: structuredEvidence.vendorEvidence,
    partnerEvidence: structuredEvidence.partnerEvidence,
    negativeEvidence: [...structuredEvidence.negativeEvidence, ...negativePersonas.flatMap((persona) => persona.evidence)],
    patternMatches,
    primaryPattern: primaryPatternMatch(patternMatches, families),
    patternFamilies: families,
    negativePersonas,
    negativePersona: primaryNegativePersona(negativePersonas)?.id ?? "",
    hardNegativePersonas,
    archetypeMatches,
    matchedLeadTypes: archetypeMatches.map((match) => match.id),
    matchEvidence: archetypeMatches.flatMap((match) => match.evidence).slice(0, 8),
    leadType: primaryArchetype?.id ?? "",
    vertical: primaryArchetype?.vertical ?? "",
    failureMode: primaryArchetype?.failureMode ?? "",
    outreachPosture: primaryArchetype?.defaultOutreachPosture ?? "",
  };
}

function collectStructuredEvidence(text) {
  const requestEvidence = termsInText(text, requestEvidenceTerms);
  const workflowEvidence = termsInText(text, workflowEvidenceTerms);
  const painEvidence = termsInText(text, painEvidenceTerms);
  const currentSystemEvidence = termsInText(text, currentSystemEvidenceTerms);
  const businessEvidence = termsInText(text, businessEvidenceTerms);
  const toolShoppingEvidence = termsInText(text, toolShoppingEvidenceTerms);
  const vendorEvidence = termsInText(text, vendorEvidenceTerms);
  const partnerEvidence = termsInText(text, partnerEvidenceTerms);
  const budgetEvidence = [
    ...termsInText(text, ["willing to pay", "paid help", "open to paid help", "paid opportunity", "paid implementation", "budget", "quote", "fee", "pay for"]),
    ...(/\$\s?\d+|\b\d+\s?(usd|cad|gbp|aud)\b/i.test(text) ? ["explicit money"] : []),
  ];
  const negativeEvidence = termsInText(text, negativeTerms);
  return {
    requestEvidence,
    workflowEvidence,
    painEvidence,
    currentSystemEvidence,
    businessEvidence,
    budgetEvidence,
    toolShoppingEvidence,
    vendorEvidence,
    partnerEvidence,
    negativeEvidence,
  };
}

function matchPatternFamilies(evidence, families = defaultPatternFamilies) {
  return families
    .map((family) => {
      const missing = family.requires.filter((field) => (evidence[field] ?? []).length === 0);
      const matchedEvidence = Object.fromEntries(
        family.requires.map((field) => [field, evidence[field] ?? []]),
      );
      return {
        ...family,
        matched: missing.length === 0,
        missing,
        evidence: matchedEvidence,
        evidenceCount: Object.values(matchedEvidence).reduce((count, values) => count + values.length, 0),
      };
    })
    .filter((family) => family.matched);
}

function primaryPatternMatch(matches, families = defaultPatternFamilies) {
  if (!matches.length) return "";
  const order = new Map(families.map((family, index) => [family.id, index]));
  return [...matches].sort((a, b) => {
    const score = patternPriority(b) - patternPriority(a);
    if (score !== 0) return score;
    return (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99);
  })[0].id;
}

function patternPriority(pattern) {
  if (pattern.id === "stuck_builder_ceiling") return 50 + pattern.evidenceCount;
  if (pattern.id === "direct_implementation_request") return 45 + pattern.evidenceCount;
  if (pattern.id === "vendor_platform_with_scope") return 44 + pattern.evidenceCount;
  if (pattern.id === "tool_shopping_with_implementation_pain") {
    const toolEvidence = pattern.evidence?.toolShoppingEvidence ?? [];
    const explicitToolShopping = toolEvidence.some((term) =>
      ["which tool", "what tool", "which software", "what software", "best tool", "best software"].includes(term)
    );
    return 20 + pattern.evidenceCount + (explicitToolShopping ? 25 : 0);
  }
  if (pattern.id === "partner_overflow_implementation") return 34 + pattern.evidenceCount;
  if (pattern.id === "operational_pain_advice") return 30 + pattern.evidenceCount;
  return pattern.evidenceCount;
}

function matchNegativePersonas(text, personas) {
  return personas
    .map((persona) => ({
      ...persona,
      evidence: termsInText(text, persona.phrases),
    }))
    .filter((persona) => persona.evidence.length > 0);
}

function primaryNegativePersona(personas) {
  if (!personas.length) return null;
  return [...personas].sort((a, b) => {
    if (a.hardReject !== b.hardReject) return a.hardReject ? -1 : 1;
    return b.evidence.length - a.evidence.length || a.id.localeCompare(b.id);
  })[0];
}

function isAllowedStuckBuilderPersonaMatch(persona, evidence) {
  if (persona.id !== "seller-shilling-own-tool") return false;
  const sellerEvidence = persona.evidence ?? [];
  const onlyBuiltPhrase = sellerEvidence.length > 0 &&
    sellerEvidence.every((term) => ["i built", "i made"].includes(term));
  if (!onlyBuiltPhrase) return false;
  return (evidence.requestEvidence?.length ?? 0) > 0 &&
    (evidence.currentSystemEvidence?.length ?? 0) > 0 &&
    (evidence.painEvidence?.length ?? 0) > 0;
}

function isAllowedToolShoppingPersonaMatch(persona, evidence) {
  if (persona.id !== "generic-best-tool-question") return false;
  return (evidence.toolShoppingEvidence?.length ?? 0) > 0 &&
    (evidence.workflowEvidence?.length ?? 0) > 0 &&
    (evidence.painEvidence?.length ?? 0) > 0;
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
    post.archetypeMatches.length > 0 ||
    post.patternMatches.length > 0;
  if (!hasDiscoverySignal) return false;
  if (post.hardNegativePersonas.length > 0) return false;
  if (post.hardNegativeMatches.length > 0) return false;
  if (/\bfor hire\b/i.test(post.title)) return false;
  if (isEmploymentPost(post)) return false;
  if (isRoleSeekerPost(post)) return false;
  if (isPartnerOrCofounderPost(post)) return false;
  if (isMarketResearchPost(post)) return false;
  if (isPromotionalOrEducationalPost(post)) return false;
  if (isPersonalCreativeContent(post)) return false;
  if (post.negativeMatches.length > 0 && post.buyingIntentMatches.length === 0) {
    return false;
  }
  return post.patternMatches.length > 0 ||
    hasRequestIntent(post) ||
    isAdviceShapedOperationalPain(post) ||
    hasExplicitPaidProject(post);
}

function candidatePriority(post) {
  let priority = 0;
  priority += patternPriorityForPost(post);
  priority += Math.min(post.requestEvidence.length, 5) * 9;
  priority += Math.min(post.workflowEvidence.length, 8) * 4;
  priority += Math.min(post.painEvidence.length, 6) * 5;
  priority += Math.min(post.businessEvidence.length, 5) * 3;
  priority += Math.min(post.budgetEvidence.length, 4) * 7;
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
  priority += sourceFeedbackPriority(post);
  priority += Math.min(Number(post.commentCount || 0), 20) / 10;
  priority += Math.min(Number(post.redditScore || 0), 25) / 25;
  if (isGenericAdviceOnlyPost(post)) priority -= 18;
  if (isSellerOrBuilderPost(post)) priority -= 30;
  if (isEmploymentPost(post)) priority -= 28;
  if (isRoleSeekerPost(post)) priority -= 45;
  if (isPartnerOrCofounderPost(post)) priority -= 45;
  if (isMarketResearchPost(post)) priority -= 32;
  if (isPromotionalOrEducationalPost(post)) priority -= 40;
  if (isVendorSeededPost(post)) priority -= 30;
  if (isPersonalCreativeContent(post)) priority -= 60;
  if (post.hardNegativePersonas.length > 0) priority -= 80;
  if (post.negativePersonas.length > 0) priority -= 20;
  if (!hasConsultingBuyerIntent(post)) priority -= 12;
  if (post.negativeMatches.length > 0) priority -= 12;
  return priority;
}

function sourceFeedbackPriority(post) {
  const performance = post.feedback?.sourcePerformance;
  if (!performance) return 0;
  const subredditStats = performance.subreddits?.[String(post.subreddit || "").toLowerCase()];
  const queryStats = post.sourceMode === "search"
    ? performance.queries?.[String(post.sourceDetail || "").toLowerCase()]
    : null;
  return sourceStatsPriority(subredditStats) + sourceStatsPriority(queryStats);
}

function sourceStatsPriority(stats) {
  if (!stats || typeof stats !== "object") return 0;
  const accepted = Number(stats.leadsAccepted ?? stats.replyableLeads ?? 0) || 0;
  const rejected = Number(stats.leadsRejected ?? 0) || 0;
  const scans = Number(stats.scans ?? 0) || 0;
  if (accepted >= 2 && accepted >= rejected) return 12;
  if (rejected >= 5 && rejected > accepted * 2) return -18;
  if (scans >= 5 && accepted === 0 && rejected > 0) return -10;
  return 0;
}

function patternPriorityForPost(post) {
  if (post.primaryPattern === "stuck_builder_ceiling") return 62;
  if (post.primaryPattern === "direct_implementation_request") return 58;
  if (post.primaryPattern === "vendor_platform_with_scope") return 44;
  if (post.primaryPattern === "tool_shopping_with_implementation_pain") return 42;
  if (post.primaryPattern === "partner_overflow_implementation") return 40;
  if (post.primaryPattern === "operational_pain_advice") return 38;
  return 0;
}

function selectCandidatePortfolio(posts, scanConfig, config) {
  const maxCandidates = config.maxLlmCandidates ?? 25;
  const maxPerSource = config.maxCandidatesPerSource ?? maxCandidates;
  const maxPerLeadType = config.maxCandidatesPerLeadType ?? maxCandidates;
  const maxPerPatternFamily = config.maxCandidatesPerPatternFamily ?? maxCandidates;
  const maxPerVertical = config.maxCandidatesPerVertical ?? maxCandidates;
  const minCommentFirst = config.minCommentFirstCandidates ?? 0;
  const minDirectRequest = config.minDirectRequestCandidates ?? 0;
  const maxEmploymentOrPartner = config.maxEmploymentOrPartnerCandidates ?? 0;
  const maxToolOutsideToolMode = config.maxToolSpecificCandidatesOutsideToolMode ?? maxCandidates;
  const isToolMode = scanConfig.scanMode?.id === "tool-specific-automation";
  const sorted = [...posts].sort((a, b) => candidatePriority(b) - candidatePriority(a));
  const selected = [];
  const seen = new Set();
  const sourceCounts = new Map();
  const leadTypeCounts = new Map();
  const patternCounts = new Map();
  const verticalCounts = new Map();
  let employmentOrPartnerCount = 0;
  let toolSpecificCount = 0;

  function add(post, { ignoreCaps = false } = {}) {
    if (selected.length >= maxCandidates) return false;
    const key = candidateKey(post);
    if (seen.has(key)) return false;
    const sourceKey = candidateSourceKey(post);
    const leadType = post.leadType || "unclassified";
    const pattern = post.primaryPattern || "unclassified";
    const vertical = post.vertical || "unclassified";
    const isToolSpecific = isToolSpecificCandidate(post);
    const isEmploymentOrPartner = isEmploymentPost(post) || isPartnerOrCofounderPost(post);
    if (!ignoreCaps) {
      if ((sourceCounts.get(sourceKey) ?? 0) >= maxPerSource) return false;
      if ((leadTypeCounts.get(leadType) ?? 0) >= maxPerLeadType) return false;
      if ((patternCounts.get(pattern) ?? 0) >= maxPerPatternFamily) return false;
      if ((verticalCounts.get(vertical) ?? 0) >= maxPerVertical) return false;
      if (isEmploymentOrPartner && employmentOrPartnerCount >= maxEmploymentOrPartner) return false;
      if (!isToolMode && isToolSpecific && toolSpecificCount >= maxToolOutsideToolMode) return false;
    }
    seen.add(key);
    selected.push(post);
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
    leadTypeCounts.set(leadType, (leadTypeCounts.get(leadType) ?? 0) + 1);
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
    verticalCounts.set(vertical, (verticalCounts.get(vertical) ?? 0) + 1);
    if (isEmploymentOrPartner) employmentOrPartnerCount += 1;
    if (isToolSpecific) toolSpecificCount += 1;
    return true;
  }

  const directRequestCandidates = sorted.filter((post) => isDirectRequestPattern(post));
  for (const post of directRequestCandidates) {
    const currentDirect = selected.filter((candidate) => isDirectRequestPattern(candidate)).length;
    if (currentDirect >= minDirectRequest) break;
    add(post);
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

function isDirectRequestPattern(post) {
  return ["direct_implementation_request", "stuck_builder_ceiling"].includes(post.primaryPattern) ||
    hasExplicitPaidProject(post);
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
  if (
    post.hardNegativePersonas?.length ||
    isSellerOrBuilderPost(post) ||
    isEmploymentPost(post) ||
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post)
  ) return "ignore";
  if (isVendorSeededPost(post)) return "watch";
  if (hasExplicitPaidProject(post)) return "dm_now";
  if (score <= 2) return "ignore";
  if (
    post.outreachPosture &&
    allowedOutreachPostures.has(post.outreachPosture) &&
    (score >= 4 || isAdviceShapedOperationalPain(post))
  ) {
    return post.outreachPosture;
  }
  if (post.primaryPattern) {
    const family = normalizePatternFamilies(post.patternFamilies).find((pattern) => pattern.id === post.primaryPattern);
    if (family?.defaultOutreachPosture) return family.defaultOutreachPosture;
  }
  if (score <= 3) return "watch";
  return "comment_first";
}

function normalizeOutreachPosture(value, post, score) {
  let posture = allowedOutreachPostures.has(value) ? value : defaultOutreachPosture(post, score);
  if (post.hardNegativePersonas?.length) return "ignore";
  if (
    post.negativeMatches?.length ||
    isSellerOrBuilderPost(post) ||
    isEmploymentPost(post) ||
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post)
  ) {
    return score <= 2 ? "ignore" : "watch";
  }
  if (isVendorSeededPost(post)) return "watch";
  if (posture === "dm_now" && !hasExplicitPaidProject(post) && !["direct_implementation_request", "stuck_builder_ceiling"].includes(post.primaryPattern)) {
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

async function scorePosts(posts, config, apiKey) {
  const reviewFloor = Math.min(3, config.minScore ?? 4);
  if (!config.useLlm || !apiKey) {
    return posts.map(scoreDeterministically).filter((lead) => lead.score >= reviewFloor);
  }

  const scored = [];
  for (const post of posts) {
    const score = await scoreWithLlmWithRetry(post, config, apiKey).catch((error) =>
      watchOnlyFallbackScore(post, error),
    );
    scored.push(score);
    if (scored.length === posts.length || scored.length % 10 === 0) {
      progress(`Scored ${scored.length}/${posts.length} candidates.`);
    }
  }

  return scored.filter((lead) => lead.score >= reviewFloor);
}

async function scoreWithLlmWithRetry(post, config, apiKey, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await scoreWithLlm(post, config, apiKey);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(500 * attempt);
      }
    }
  }
  throw lastError;
}

function watchOnlyFallbackScore(post, error) {
  const fallback = scoreDeterministically(post);
  const reason = error instanceof Error ? error.message : String(error);
  return {
    ...fallback,
    score: Math.min(fallback.score ?? 3, 3),
    fitScore: Math.min(fallback.fitScore ?? fallback.score ?? 3, 3),
    replyabilityScore: Math.min(fallback.replyabilityScore ?? 3, 3),
    outreachPosture: "watch",
    recommendedAction: "watch",
    freeToPursuePath: "",
    suggestedComment: "",
    suggestedDm: "",
    scoreReason: `LLM scoring failed after retries; kept as watch-only fallback. ${reason}`,
  };
}

function isReplyTodayLead(lead, config) {
  const minFit = config.minScore ?? 4;
  const scoreReason = String(lead.scoreReason || "").toLowerCase();
  const hasDomainFit = hasConsultingDomainFit(lead);
  const hasDirectRequest = hasDirectRequestShape(lead);
  const hasMainDigestSignal =
    (hasExplicitPaidProject(lead) && hasDomainFit) ||
    (hasDirectRequest && hasBestLeadSignal(lead) && hasConsultingBuyerIntent(lead) && hasDomainFit) ||
    (hasDirectRequest && isAdviceShapedOperationalPain(lead) && hasConsultingBuyerIntent(lead) && hasDomainFit);
  const hasManualResponsePath = Boolean(lead.url && lead.author && lead.author !== "unknown");
  return (lead.fitScore ?? lead.score ?? 0) >= minFit &&
    (lead.replyabilityScore ?? 0) >= 4 &&
    (lead.hardNegativePersonas?.length ?? 0) === 0 &&
    !lead.negativePersona &&
    !scoreReason.includes("llm scoring failed") &&
    !isSellerOrBuilderPost(lead) &&
    !isEmploymentPost(lead) &&
    !isRoleSeekerPost(lead) &&
    !isPartnerOrCofounderPost(lead) &&
    !isMarketResearchPost(lead) &&
    !isPromotionalOrEducationalPost(lead) &&
    !isPersonalCreativeContent(lead) &&
    !isVendorSeededPost(lead) &&
    !isDigestFalsePositive(lead) &&
    hasClassifiedFit(lead) &&
    hasManualResponsePath &&
    hasMainDigestSignal &&
    !["ignore", "watch"].includes(lead.outreachPosture || "") &&
    !["ignore", "watch"].includes(lead.recommendedAction || "");
}

function hasClassifiedFit(lead) {
  return Boolean(
    (lead.category && lead.category !== "other") ||
    (lead.leadType && lead.leadType !== "other") ||
    (lead.vertical && lead.vertical !== "other") ||
    isTrustedAutomationSource(lead),
  );
}

function scoreDeterministically(post) {
  const category = categorize(post);
  let fitScore = 2;
  let replyabilityScore = 2;
  if (
    post.hardNegativePersonas.length > 0 ||
    isSellerOrBuilderPost(post) ||
    isEmploymentPost(post) ||
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post)
  ) {
    fitScore = 2;
    replyabilityScore = 1;
  } else if (isVendorSeededPost(post)) {
    fitScore = 3;
    replyabilityScore = 3;
  } else if (hasExplicitPaidProject(post)) {
    fitScore = 5;
    replyabilityScore = 5;
  } else if (post.primaryPattern === "direct_implementation_request" || post.primaryPattern === "stuck_builder_ceiling") {
    fitScore = 5;
    replyabilityScore = 5;
  } else if (isAdviceShapedOperationalPain(post)) {
    fitScore = 4;
    replyabilityScore = 4;
  } else if (post.primaryPattern === "operational_pain_advice") {
    fitScore = 4;
    replyabilityScore = 4;
  } else if (post.primaryPattern === "tool_shopping_with_implementation_pain") {
    fitScore = 4;
    replyabilityScore = 4;
  } else if (post.primaryPattern === "vendor_platform_with_scope") {
    fitScore = 3;
    replyabilityScore = 3;
  } else if (post.primaryPattern === "partner_overflow_implementation") {
    fitScore = 3;
    replyabilityScore = 3;
  } else if (category !== "other" && hasSpecificWorkflowPain(post) && hasBusinessContext(post)) {
    fitScore = 4;
    replyabilityScore = hasRequestIntent(post) ? 4 : 3;
  } else {
    if (post.matchedKeywords.length >= 2) fitScore += 1;
    if (post.communityPainMatches.length > 0) fitScore += 1;
    if (post.archetypeMatches.length > 0) fitScore += 1;
    if (post.buyingIntentMatches.length > 0) {
      fitScore += 1;
      replyabilityScore += 1;
    }
    if (post.requestEvidence.length > 0 && post.workflowEvidence.length > 0) replyabilityScore += 2;
  }
  if (post.negativeMatches.length > 0 || post.negativePersonas.length > 0) {
    fitScore -= 1;
    replyabilityScore -= 1;
  }
  if (post.negativePersona === "low-budget-or-tiny") {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (isGenericAdviceOnlyPost(post)) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  fitScore = Math.max(1, Math.min(5, fitScore));
  replyabilityScore = Math.max(1, Math.min(5, replyabilityScore));
  const outreachPosture = normalizeOutreachPosture(defaultOutreachPosture(post, fitScore), post, fitScore);
  const finalOutreachPosture = replyabilityScore <= 3 && !["ignore"].includes(outreachPosture)
    ? "watch"
    : outreachPosture;
  const recommendedAction = actionForOutreachPosture(finalOutreachPosture);

  return {
    ...post,
    score: fitScore,
    fitScore,
    replyabilityScore,
    category,
    leadType: post.leadType || "",
    vertical: post.vertical || "",
    failureMode: post.failureMode || "",
    outreachPosture: finalOutreachPosture,
    recommendedAction,
    freeToPursuePath: "",
    pattern: post.primaryPattern || "unclassified",
    negativePersona: post.negativePersona || "",
    scoreReason: "",
    suggestedComment: "",
    suggestedDm: "",
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
    primaryPattern: post.primaryPattern,
    patternMatches: post.patternMatches?.map((pattern) => pattern.id) ?? [],
    requestEvidence: post.requestEvidence,
    workflowEvidence: post.workflowEvidence,
    painEvidence: post.painEvidence,
    currentSystemEvidence: post.currentSystemEvidence,
    businessEvidence: post.businessEvidence,
    budgetEvidence: post.budgetEvidence,
    toolShoppingEvidence: post.toolShoppingEvidence,
    vendorEvidence: post.vendorEvidence,
    partnerEvidence: post.partnerEvidence,
    negativeEvidence: post.negativeEvidence,
    sourceQuery: post.sourceQuery,
    sourcePatternFamily: post.sourcePatternFamily,
    sourceVertical: post.sourceVertical,
    commentContext: post.commentContext ?? null,
    negativePersonas: post.negativePersonas?.map((persona) => ({
      id: persona.id,
      label: persona.label,
      hardReject: persona.hardReject,
      evidence: persona.evidence,
    })) ?? [],
    matchEvidence: post.matchEvidence,
    adviceShapedOperationalPain: isAdviceShapedOperationalPain(post),
    genericAdviceOnly: isGenericAdviceOnlyPost(post),
    matchedKeywords: post.matchedKeywords,
    communityPainMatches: post.communityPainMatches,
    buyingIntentMatches: post.buyingIntentMatches,
    negativeMatches: post.negativeMatches,
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
            "Score and classify Reddit posts for a freelance AI automation consultant. Return strict JSON only. Do not use markdown. This is a Reddit-only lead scanner, not a broad job board or marketplace workflow. Score 5 only for an explicit paid/project/hiring request with a concrete business workflow and implementation ask. Score 4 for specific business workflow pain with clear buyer context. Score 3 or lower for generic tool-shopping, broad AI discussion, workflow curiosity, weak signal, or posts that are not realistic consulting opportunities. Score 1-2 for sellers, builders promoting their own thing, job seekers, market research, low-budget noise, or irrelevant chatter. Do not score 4+ just because a post mentions automation, AI, CRM, Zapier, Make, Airtable, Notion, spreadsheets, or operations. Use the provided structured evidence and pattern matches. If a negative persona fits, name it.",
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
              pattern: {
                type: "string",
                enum: normalizePatternFamilies(config.patternFamilies).map((family) => family.id).concat("unclassified"),
              },
              negativePersona: { type: "string" },
            },
            required: [
              "score",
              "category",
              "leadType",
              "vertical",
              "failureMode",
              "pattern",
              "negativePersona",
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
  let fitScore = Number.isInteger(parsed.score)
    ? Math.max(1, Math.min(5, parsed.score))
    : 1;
  let replyabilityScore = Math.min(
    fitScore,
    hasExplicitPaidProject(post) || ["direct_implementation_request", "stuck_builder_ceiling"].includes(post.primaryPattern)
      ? 5
      : hasRequestIntent(post) || isAdviceShapedOperationalPain(post)
        ? 4
        : 3,
  );
  const category = allowedCategories.has(parsed.category) ? parsed.category : "other";
  const schemaEnums = llmSchemaEnums(config, post);
  const leadType = schemaEnums.leadTypes.includes(parsed.leadType) ? parsed.leadType : (post.leadType || "other");
  const vertical = schemaEnums.verticals.includes(parsed.vertical) ? parsed.vertical : (post.vertical || "other");
  const failureMode = schemaEnums.failureModes.includes(parsed.failureMode)
    ? parsed.failureMode
    : (post.failureMode || "other");
  let outreachPosture = defaultOutreachPosture(post, fitScore);
  let recommendedAction = actionForOutreachPosture(outreachPosture);
  const isAdvicePain = isAdviceShapedOperationalPain(post);

  if (category === "other") fitScore = Math.min(fitScore, 3);
  if (category !== "other" && post.buyingIntentMatches.length > 0) {
    fitScore = Math.max(fitScore, 4);
  }
  if (category !== "other" && hasExplicitPaidProject(post)) {
    fitScore = 5;
    replyabilityScore = Math.max(replyabilityScore, 5);
  }
  if (post.primaryPattern === "direct_implementation_request" || post.primaryPattern === "stuck_builder_ceiling") {
    fitScore = Math.max(fitScore, 5);
    replyabilityScore = Math.max(replyabilityScore, 5);
  }
  if (post.primaryPattern === "operational_pain_advice" || post.primaryPattern === "tool_shopping_with_implementation_pain") {
    fitScore = Math.max(fitScore, 4);
    replyabilityScore = Math.max(replyabilityScore, 4);
  }
  if (category !== "other" && hasSpecificWorkflowPain(post) && hasBusinessContext(post)) {
    fitScore = Math.max(fitScore, 4);
  }
  if (category !== "other" && isAdvicePain) {
    fitScore = Math.max(fitScore, 4);
    replyabilityScore = Math.max(replyabilityScore, 4);
  }
  if (!hasSpecificWorkflowPain(post) && !hasExplicitPaidProject(post) && !isAdvicePain) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (isBasicSpreadsheetHelp(post)) fitScore = Math.min(fitScore, 3);
  if (isSellerOrBuilderPost(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isEmploymentPost(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isRoleSeekerPost(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isPartnerOrCofounderPost(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (post.hardNegativePersonas?.length) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isMarketResearchPost(post)) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 2);
  }
  if (isPromotionalOrEducationalPost(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isPersonalCreativeContent(post)) {
    fitScore = Math.min(fitScore, 2);
    replyabilityScore = Math.min(replyabilityScore, 1);
  }
  if (isVendorSeededPost(post)) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (!hasBestLeadSignal(post) && !isAdvicePain && !post.primaryPattern) fitScore = Math.min(fitScore, 3);
  if (!hasConsultingBuyerIntent(post) && !hasExplicitPaidProject(post) && !isAdvicePain && !post.primaryPattern) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (post.negativeMatches.length > 0 || post.negativePersonas.length > 0) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (post.negativePersona === "low-budget-or-tiny") {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  if (post.buyingIntentMatches.length === 0 && post.requestEvidence.length === 0) fitScore = Math.min(fitScore, 4);
  if (isGenericAdviceOnlyPost(post)) {
    fitScore = Math.min(fitScore, 3);
    replyabilityScore = Math.min(replyabilityScore, 3);
  }
  fitScore = Math.max(1, Math.min(5, fitScore));
  replyabilityScore = Math.max(1, Math.min(5, replyabilityScore));
  outreachPosture = normalizeOutreachPosture(outreachPosture, post, fitScore);
  recommendedAction = actionForOutreachPosture(outreachPosture);
  if (replyabilityScore <= 3 && ["dm", "dm_if_engaged"].includes(recommendedAction)) {
    recommendedAction = "watch";
    outreachPosture = "watch";
  }

  return {
    ...post,
    score: fitScore,
    fitScore,
    replyabilityScore,
    category,
    leadType,
    vertical,
    failureMode,
    outreachPosture,
    recommendedAction,
    pattern: normalizePatternFamilies(config.patternFamilies).some((family) => family.id === parsed.pattern)
      ? parsed.pattern
      : (post.primaryPattern || "unclassified"),
    negativePersona: normalizeNegativePersonaId(parsed.negativePersona, post.negativePersona),
    freeToPursuePath: "",
    scoreReason: "",
    suggestedComment: "",
    suggestedDm: "",
  };
}

function normalizeNegativePersonaId(value, fallback = "") {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.toLowerCase() === "none" || normalized.toLowerCase() === "n/a") {
    return fallback || "";
  }
  return normalized;
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

function buildDigest({ date, leads, scoredCount, rejectedCount, feedResults, config, scanMode, rejectionSummary, sourcePerformance, partialCoverage }) {
  const sorted = [...leads].sort(compareLeadsForDigest);
  const best = sorted.filter((lead) => isReplyTodayLead(lead, config));
  const maybe = sorted.filter((lead) =>
    !isReplyTodayLead(lead, config) &&
    !["ignore"].includes(lead.outreachPosture || "") &&
    !["ignore"].includes(lead.recommendedAction || "") &&
    (lead.score >= 3 || lead.replyabilityScore >= 3)
  );
  const feedErrors = feedResults.filter((result) => !result.ok);
  const sourceMix = sourceMixSummary(sorted);
  const searchDiagnostics = queryDiagnostics(feedResults, sorted, config);

  return [
    `# Reddit Lead Scanner Digest - ${date}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Feeds checked: ${feedResults.length}`,
    `Scan mode: ${scanMode?.label ?? "Legacy config"}`,
    "Reddit-only: yes",
    `Posts fetched: ${feedResults.reduce((count, result) => count + (result.posts?.length ?? 0), 0)}`,
    `Candidates scored: ${scoredCount ?? leads.length}`,
    `Candidates included: ${best.length}`,
    `Replyable leads: ${best.length}`,
    `Watch items: ${maybe.length}`,
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
          .map((item) => `- ${item.query}${item.patternFamily ? ` (${item.patternFamily})` : ""}: ${item.status}, ${item.fetchedPosts} posts, ${item.candidatesScored ?? 0} scored, ${item.replyable ?? 0} replyable, ${item.watch ?? 0} watch`)
          .join("\n")
      : "No global search queries were run.",
    "",
    "## Source Performance",
    "",
    formatSourcePerformance(sourcePerformance),
    "",
    "## Reply Today",
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

function compareLeadsForDigest(a, b) {
  return (b.replyabilityScore ?? 0) - (a.replyabilityScore ?? 0) ||
    (b.fitScore ?? b.score ?? 0) - (a.fitScore ?? a.score ?? 0) ||
    Number(hasExplicitPaidProject(b)) - Number(hasExplicitPaidProject(a)) ||
    String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")) ||
    String(a.title || "").localeCompare(String(b.title || ""));
}

function formatLead(lead) {
  return [
    `### ${lead.score}/5 - r/${lead.subreddit} - ${lead.title}`,
    "",
    `- Posted date: ${dateOnly(lead.publishedAt) || "unknown"}`,
    `- URL: ${lead.url}`,
    `- Author: ${lead.author}`,
    `- Category: ${lead.category}`,
    `- Fit score: ${lead.fitScore ?? lead.score}`,
    `- Replyability score: ${lead.replyabilityScore ?? "unknown"}`,
    `- Pattern: ${lead.pattern || lead.primaryPattern || "unclassified"}`,
    `- Negative persona: ${lead.negativePersona || "none"}`,
    `- Lead type: ${lead.leadType || "other"}`,
    `- Vertical: ${lead.vertical || "other"}`,
    `- Failure mode: ${lead.failureMode || "other"}`,
    `- Outreach posture: ${lead.outreachPosture || "unknown"}`,
    `- Recommended action: ${lead.recommendedAction || "unknown"}`,
    ...(lead.sourceQuery ? [`- Source query: ${lead.sourceQuery}`] : []),
    ...(lead.sourcePatternFamily ? [`- Source query pattern: ${lead.sourcePatternFamily}`] : []),
    ...(lead.sourceVertical ? [`- Source query vertical: ${lead.sourceVertical}`] : []),
  ].join("\n");
}

function sourceMixSummary(leads) {
  const byLeadType = countBy(leads, (lead) => lead.leadType || "other");
  const bySource = countBy(leads, (lead) => lead.subreddit || lead.sourceDetail || "unknown");
  return [
    `- By lead type: ${formatCounts(byLeadType)}`,
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

function queryDiagnostics(feedResults, scoredLeads = [], config = { minScore: 4 }) {
  const outcomesByQuery = countQueryOutcomes(scoredLeads, config);
  return feedResults
    .filter((result) => String(result.url || "").startsWith("reddit-search:"))
    .map((result) => {
      const id = result.query?.id || result.url.replace(/^reddit-search:/, "");
      const outcomes = outcomesByQuery.get(id) ?? {};
      return {
        query: result.query?.label || result.query?.query || id,
        id,
        patternFamily: result.query?.patternFamily || "",
        vertical: result.query?.vertical || "",
        status: result.ok ? "ok" : String(result.status || "error"),
        fetchedPosts: result.posts?.length ?? 0,
        candidatesScored: outcomes.candidatesScored ?? 0,
        replyable: outcomes.replyable ?? 0,
        watch: outcomes.watch ?? 0,
        rejected: outcomes.rejected ?? 0,
      };
    });
}

function countQueryOutcomes(scoredLeads, config) {
  const counts = new Map();
  for (const lead of scoredLeads) {
    if (lead.sourceMode !== "search") continue;
    const id = String(lead.sourceDetail || "unknown");
    const row = counts.get(id) ?? { candidatesScored: 0, replyable: 0, watch: 0, rejected: 0 };
    row.candidatesScored += 1;
    if (isReplyTodayLead(lead, config)) row.replyable += 1;
    if (lead.recommendedAction === "watch") row.watch += 1;
    if (lead.recommendedAction === "ignore") row.rejected += 1;
    counts.set(id, row);
  }
  return counts;
}

function sourcePerformanceSummary(feedResults, scoredLeads, feedback = {}) {
  const subredditRows = new Map();
  const queryRows = new Map();

  for (const result of feedResults) {
    const fetched = result.posts?.length ?? 0;
    if (String(result.url || "").startsWith("reddit-search:")) {
      const query = result.query?.id || result.url.replace(/^reddit-search:/, "");
      queryRows.set(query, {
        id: query,
        label: result.query?.label || result.query?.query || query,
        patternFamily: result.query?.patternFamily || "",
        vertical: result.query?.vertical || "",
        fetched,
        status: result.ok ? "ok" : String(result.status || "error"),
        historical: feedback?.sourcePerformance?.queries?.[query.toLowerCase()] ?? null,
      });
    } else {
      const subreddit = result.posts?.[0]?.subreddit || subredditFromFeed(result.url || "") || "unknown";
      const key = String(subreddit).toLowerCase();
      const existing = subredditRows.get(key) ?? {
        id: key,
        fetched: 0,
        status: result.ok ? "ok" : String(result.status || "error"),
        historical: feedback?.sourcePerformance?.subreddits?.[key] ?? null,
      };
      existing.fetched += fetched;
      subredditRows.set(key, existing);
    }
  }

  for (const lead of scoredLeads) {
    const key = String(lead.subreddit || "unknown").toLowerCase();
    const row = subredditRows.get(key) ?? {
      id: key,
      fetched: 0,
      status: "scored_only",
      historical: feedback?.sourcePerformance?.subreddits?.[key] ?? null,
    };
    row.scored = (row.scored ?? 0) + 1;
    if (isReplyTodayLead(lead, { minScore: 4 })) row.replyable = (row.replyable ?? 0) + 1;
    if (lead.recommendedAction === "watch") row.watch = (row.watch ?? 0) + 1;
    if (lead.recommendedAction === "ignore") row.rejected = (row.rejected ?? 0) + 1;
    subredditRows.set(key, row);

    if (lead.sourceMode === "search") {
      const query = String(lead.sourceDetail || "unknown");
      const queryKey = query.toLowerCase();
      const queryRow = queryRows.get(query) ?? {
        id: query,
        fetched: 0,
        status: "scored_only",
        historical: feedback?.sourcePerformance?.queries?.[queryKey] ?? null,
      };
      queryRow.scored = (queryRow.scored ?? 0) + 1;
      if (isReplyTodayLead(lead, { minScore: 4 })) queryRow.replyable = (queryRow.replyable ?? 0) + 1;
      if (lead.recommendedAction === "watch") queryRow.watch = (queryRow.watch ?? 0) + 1;
      if (lead.recommendedAction === "ignore") queryRow.rejected = (queryRow.rejected ?? 0) + 1;
      queryRows.set(query, queryRow);
    }
  }

  return {
    subreddits: [...subredditRows.values()].sort(compareSourcePerformanceRows),
    queries: [...queryRows.values()].sort(compareSourcePerformanceRows),
  };
}

function compareSourcePerformanceRows(a, b) {
  return (b.replyable ?? 0) - (a.replyable ?? 0) ||
    (b.scored ?? 0) - (a.scored ?? 0) ||
    (b.fetched ?? 0) - (a.fetched ?? 0) ||
    String(a.id).localeCompare(String(b.id));
}

function formatSourcePerformance(performance) {
  if (!performance) return "No source performance data.";
  const topSubreddits = (performance.subreddits ?? []).slice(0, 8);
  const topQueries = (performance.queries ?? []).slice(0, 8);
  const lines = [];
  lines.push("Top subreddits:");
  lines.push(...(topSubreddits.length ? topSubreddits.map(formatSourcePerformanceRow) : ["- none"]));
  lines.push("");
  lines.push("Top search queries:");
  lines.push(...(topQueries.length ? topQueries.map(formatSourcePerformanceRow) : ["- none"]));
  return lines.join("\n");
}

function formatSourcePerformanceRow(row) {
  const historical = row.historical
    ? `, historical accepted ${row.historical.leadsAccepted ?? row.historical.replyableLeads ?? 0}, rejected ${row.historical.leadsRejected ?? 0}`
    : "";
  return `- ${row.id}: fetched ${row.fetched ?? 0}, scored ${row.scored ?? 0}, replyable ${row.replyable ?? 0}, watch ${row.watch ?? 0}, rejected ${row.rejected ?? 0}${historical}`;
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
    post.archetypeMatches?.length > 0 ||
    post.patternMatches?.length > 0;
  if (!hasDiscoverySignal) return "no_discovery_signal";
  if (post.hardNegativeMatches?.length > 0) return "hard_negative";
  if (isSellerOrBuilderPost(post)) return "seller_or_builder";
  if (isEmploymentPost(post)) return "employment_only";
  if (isRoleSeekerPost(post)) return "role_seeker";
  if (isPartnerOrCofounderPost(post)) return "partner_or_cofounder";
  if (isMarketResearchPost(post)) return "market_research";
  if ((post.negativeMatches?.length ?? 0) > 0 && (post.buyingIntentMatches?.length ?? 0) === 0) {
    return "negative_without_buying_intent";
  }
  if (isGenericAdviceOnlyPost(post)) return "generic_advice";
  return "not_request_or_operational_pain";
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
  return /looking for|need help|recommend|recommendations|which .* use|anyone .* use|how do i|how do you|what system|what tools?|when did you|is there a better way|where do i start|seeking|paid help|paid opportunity|paid implementation|hire|consultant|freelancer|developer|build this|need someone|help setting up|open to paid help|help me finish|take over parts|review what i(?:'ve| have) built/.test(
    text,
  );
}

function hasExplicitPaidProject(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (isRoleSeekerPost(post) || isEmploymentPost(post)) return false;
  const explicitHire = /\b(hire someone to|need to hire someone to|need someone to|looking for someone to|looking for someone experienced|paid help|paid opportunity|paid implementation|open to paid help|willing to pay|take my money|consultant|developer|freelancer|help me finish|take over parts|review what i(?:'ve| have) built)\b/.test(
    text,
  );
  const projectWork = /build|develop|software|automation|automate|workflow|workflows|ai workflow|business process automation|custom system|claude|chatgpt|crm|pdf|report|spreadsheet|excel|internal tool|recruiting|staffing|scheduling|intake|applicants?|follow up|follow-up|property management|real estate|rental|tenant/.test(
    text,
  );
  return explicitHire && projectWork;
}

function hasSpecificWorkflowPain(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /manual|copy.?paste|spreadsheet|google sheets|excel|crm|follow[- ]?up|invoice|receipt|pdf|report|dashboard|bookkeeping|reconciliation|onboarding|offboarding|intake|form submissions?|lead routing|pipeline|inventory|orders?|fulfillment|client portal|data cleanup|api|zapier|make|n8n|airtable|notion|hubspot|pipedrive|zoho|quickbooks|xero|power bi|looker|data entry|every day|every week|every month|takes forever|too slow|spending too much time|mess|chaotic|stuck|hit(?:ting)? a ceiling|can't figure|cant figure|desperate|job boards?|not bringing in anyone|need help finding|can't find|cant find|recruiting|staffing|applicants?|candidates?|screening|scheduling|busy season|missed calls?|customer messages?|quote requests?|buried in emails|can't keep track|cant keep track|whiteboard|checklist|sop|standard operating|project profitability|job costing|budget|cost to complete|k-1|pbc|client documents?|client docs?|brief drift|scorecard|handoff|bank transactions?|matching invoices?|custom system|source of truth|business process automation|ai workflows?|claude|chatgpt|property management|real estate|rentals?|tenants?|maintenance|turnover/.test(
    text,
  );
}

function hasBusinessContext(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /business|company|agency|client|customer|lead|sales|team|department|contractor|freelancer|employee|shopify|store|ecommerce|retail|bookkeeping|accounting|tax|firm|practice|real estate|realtor|property|properties|property management|property manager|rentals?|tenants?|portfolio|msp|service business|consultancy|consulting|startup|founder|ops|operations|revenue|orders?|invoices?|prospects?|pipeline|warehouse|inventory|tickets?|staff|staffing|recruit|recruiting|applicants?|candidates?|nurses?|drivers?|dispatch|appointments?|nonprofit|donors?|clinic|healthcare/.test(
    text,
  );
}

function isSellerOrBuilderPost(post) {
  const text = `${post.title}\n${post.summary}\n${post.subreddit || ""}`.toLowerCase();
  if (
    /\b(paid opportunity|looking for someone experienced|help me finish|take over parts|review what i(?:'ve| have) built)\b/.test(text) &&
    /\b(hit(?:ting)? a ceiling|spending too much time|custom system|existing system|workflow)\b/.test(text)
  ) {
    return false;
  }
  return /\b(i built|i made|i launched|i created|my app|my product|my tool|my agency|our product|looking for feedback|honest feedback|feedback on my|showcase|case study|available for|for hire|hire me|looking for clients|bookpromotion|startups?_promotion|u_[a-z0-9_-]+|unpopular opinion|must-have features|best affordable|when .* stops scaling|what we learned after|how we built|what you can copy today|finally tackled|saving my sanity|ways to automate|explained in plain english)\b/.test(
    text,
  );
}

function isEmploymentPost(post) {
  const text = `${post.title}\n${post.summary}\n${post.subreddit || ""}`.toLowerCase();
  const jobSubreddit = /\b(virtualassistant4hire|jobph|forhire|hireawriter|freelance_forhire|slavelabour|remotejobs|jobopenings|jobs)\b/i.test(
    String(post.subreddit || ""),
  );
  const hiringTitle = /^\s*(\[hiring\]|\(hiring\)|hiring\b|job:|remote job\b)/i.test(
    post.title,
  );
  const roleTerms =
    /\b(full[- ]?time|part[- ]?time|salary|hourly|per hour|\/hr|usd\/hr|remote role|job posting|job description|assistant|virtual assistant|sales rep|sales guy|appointment setter|closer|internship|practice manager|operations manager|executive operations|for ph applicants only|applicants only)\b/.test(
      text,
    );
  const roleRequest = /\b(hiring|we are hiring|looking for an?|looking to hire an?|need an?)\b.+\b(manager|assistant|va|employee|staff member|rep|setter|closer|applicant)\b/.test(
    text,
  );
  const lowWage = /\$ ?\d{1,2}\s*[-–]\s*\$ ?\d{1,2}\s*\/?(hr|hour)?|\b\d{1,2}\s*usd\/hr\b/.test(
    text,
  );
  return jobSubreddit || hiringTitle || (roleTerms && lowWage) || roleRequest;
}

function isRoleSeekerPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const explicitSeeker =
    /\b(looking for a role|looking for work|looking for a job|looking for .* role|looking for .* position|looking for .* freelance projects|looking for .* projects|need a .* job|need .* job urgently|job hunt|job hunting|how can .* become|become an? .*engineer|visa somewhere|chase a visa|open to remote or on-site|open to work|seeking a role|seeking work|seeking a job|job search|my resume|resume review|portfolio review|hire me|for hire|available for freelance|available for contract|referral fee)\b/.test(
      text,
    );
  const titleSeeker = /^\s*(looking for|seeking)\b.+\b(job|role|position|opportunity|work)\b/i.test(
    post.title,
  );
  return explicitSeeker || titleSeeker;
}

function isPartnerOrCofounderPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(co[- ]?founder|technical co[- ]?founder|founding engineer|full[- ]?stack developer|sales\/outreach partner|outreach partner|business partner|equity only|rev share|revenue share|partner with me|join me to build|collaborator|collab partner|mentor .*bring it to life|bring it to life|help me bring .* to life)\b/.test(
    text,
  );
}

function isMarketResearchPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(market research|potential collab|collab opportunity|how'?s the general market|market for .*smb|do you actually need|would you pay for|would you be willing to pay|what would you pay|how much would you pay|how much would you be willing to pay|pay for it problem|would you actually use this|would this even fit|fit the vc model|vc model|validate this idea|validated .*pain point|validating an idea|bad idea|feedback on my idea|honest feedback|help me choose one ai business|which niche is still underserved|what ai product do you wish existed|what product do you wish existed|what repetitive task would you happily pay|spend the next 90 days building|pick one direction based on the discussion|document everything publicly)\b/.test(
    text,
  );
}

function isPromotionalOrEducationalPost(post) {
  const text = `${post.title}\n${post.summary}\n${post.subreddit || ""}`.toLowerCase();
  return /\b(here'?s how|here is how|guide to|ultimate guide|case study|roi comparison|honest breakdown|key highlights|market review|do not let .* trap you|warning:|speed to the lead|why .* win more|how to reduce|12 ways to|10 ways to|step[- ]by[- ]step|prompts to run|apis and webhooks are where|must-have|explained in plain english|inside the algorithm|became .* heroes|what you can copy today|using ai in unique ways|welcome to .* read first|introduce yourself|read first)\b/.test(
    text,
  );
}

function isVendorSeededPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(requesting a demo from|request a demo from|demo from|built specifically for this kind of|eliminate paper from the company|has anyone else made the transition .* without confusing)\b/.test(
    text,
  );
}

function isPersonalCreativeContent(post) {
  const text = `${post.title}\n${post.summary}\n${post.subreddit || ""}`.toLowerCase();
  if (/\bnot a business workflow\b/.test(text)) return true;
  const personalCreativeSignals =
    /\b(anime|manga|fandom|fanfic|fan fiction|character essay|an essay|literary analysis|poem|poetry|short story|scary stories?|dating|relationship advice|roleplay|cosplay|gameplay|gaming)\b/.test(
      text,
    );
  if (!personalCreativeSignals) return false;
  return !hasExplicitPaidProject(post);
}

function hasConsultingDomainFit(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const implementationTerms =
    /\b(automate|automation|automator|script|workflow|workflows|ai workflow|ai workflows|business process automation|custom system|source of truth|claude|chatgpt|zapier|make\.com|make com|n8n|airtable|notion|crm|hubspot|salesforce|pipedrive|zoho|spreadsheet|excel|google sheets|dashboard|reporting|report automation|pdf workflow|forms?|intake|lead routing|pipeline|onboarding|offboarding|reconciliation|invoice|bookkeeping|quickbooks|xero|api integration|internal tool|client portal|data cleanup|manual process|copy.?paste|scheduling|screening|applicants?|candidates?|staffing|recruiting|customer messages?|quote requests?)\b/.test(
      text,
    );
  if (!implementationTerms) return false;
  return hasBusinessContext(post) || isTrustedAutomationSource(post);
}

function isTrustedAutomationSource(post) {
  const subreddit = String(post.subreddit || "").toLowerCase();
  return /^(automator|shortcuts|applescript|zapier|integromat|make|n8n|airtable|googlesheets|excel)$/i.test(
    subreddit,
  );
}

function hasDirectRequestShape(post) {
  const title = String(post.title || "").toLowerCase();
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (/^\s*(welcome to|unpopular opinion|most .* do not|when .* stops scaling|the best |best affordable|10 must-have|must-have features)\b/.test(title)) {
    return false;
  }
  if (/\b(how can one become|how to become|what is an? .*engineer|introduce yourself|read first)\b/.test(text)) {
    return false;
  }
  const directAsk =
    /\b(how do i|how do you|how are you|what do you use|what are you using|what system|which crm|which tool|what tool|recommend|recommendations?|need help|looking for help|need someone|looking for someone|can someone help|where do i start|how do you keep track|how do you manage|crm for|tool for|software for)\b/.test(
      text,
    );
  return directAsk || hasExplicitPaidProject(post);
}

function isDigestFalsePositive(post) {
  const text = `${post.title}\n${post.summary}\n${post.subreddit || ""}`.toLowerCase();
  return /\b(welcome to .*read first|introduce yourself|lived in australia|moved home|chase a visa|forced line suspension|device promo loophole|my coworker|office appropriate attitude|must-have features|best affordable crms|unpopular opinion|most local businesses do not lose leads)\b/.test(
    text,
  );
}

function hasConsultingBuyerIntent(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post)
  ) return false;
  if (isEmploymentPost(post)) {
    return /\b(consultant|contractor|freelancer|agency|implementation|setup|build this|automate this|project|one[- ]?off|fixed price|scope)\b/.test(
      text,
    );
  }
  const asksForPaidHelp =
    /\b(hire someone|need to hire someone|paid help|paid opportunity|paid implementation|open to paid help|willing to pay|take my money|consultant|freelancer|contractor|developer|expert|build this for me|need someone to|looking for someone to|looking for someone experienced|help setting up|help me finish|take over parts|review what i(?:'ve| have) built)\b/.test(
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
  if (
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isEmploymentPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post) ||
    isVendorSeededPost(post)
  ) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const strongPain =
    /\b(struggling|struggle|problem|pain|painful|mess|messy|manual|copy.?paste|takes forever|too slow|spending too much time|stuck|hit(?:ting)? a ceiling|can't figure|cant figure|desperate|chaotic|broken|overwhelmed|moving off|switching from|migrate|migration|setup|set up|integrate|integration|reconciliation|manual reporting|difficult reporting|reporting issue|reporting problem|job boards? not|not bringing in anyone|can't find|cant find|need help finding|busy season|missed calls?|too many messages|buried in emails|can't keep track|cant keep track|screening applicants|scheduling mess)\b/.test(
      text,
    );
  const genericAdviceTitle =
    /^\s*(how do|how are|what are|what is|what'?s|what .*best|what .*tools?|what .*software|which|best|recommend|any recommendations|is it worth)\b/i.test(
      post.title,
    );
  const asksForImplementationHelp =
    /\b(need help|looking for help|help setting up|need a solution|need someone to|looking for someone to|looking for someone experienced|can someone help|where do i start|help me finish|take over parts|review what i(?:'ve| have) built)\b/.test(
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
  if (
    isSellerOrBuilderPost(post) ||
    isRoleSeekerPost(post) ||
    isPartnerOrCofounderPost(post) ||
    isMarketResearchPost(post) ||
    isPromotionalOrEducationalPost(post) ||
    isPersonalCreativeContent(post) ||
    isVendorSeededPost(post)
  ) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const asksForAdvice =
    /\b(how do|how are you|what do you|what are you|what system|what software|which software|which tool|what tool|tools are actually working|when did you|is there a better way|best way to|any recommendations|recommendations for|what .* doing)\b/.test(
      text,
    );
  if (!asksForAdvice) return false;
  const hasCurrentSystem =
    /\b(spreadsheet|spreadsheets|excel|google sheets|email|emails|inbox|whiteboard|texts?|photos?|manual|crm|accounting software|ats|pdf|portal|quickbooks|xero|paper|checklist|custom system|existing system|source of truth|one place|claude|chatgpt|airtable)\b/.test(text);
  const hasRecurrence =
    /\b(daily|weekly|monthly|every project|every day|every time|many clients|multiple clients|hundreds|busy season|multiple departments|20 employees|team|as we'?ve grown|taken on more work)\b/.test(text);
  const hasConsequence =
    /\b(missed follow[- ]?up|late k-?1s?|amended returns?|slow quotes?|lost leads?|hard to see|harder to get a quick view|takes forever|spending too much time|hit(?:ting)? a ceiling|buried|not scalable|outgrown|outgrowing|reinventing the wheel|can't keep track|cant keep track|messy|chaotic|breaks|held up)\b/.test(text);
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
