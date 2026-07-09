import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CONFIG_PATH = "config/reddit-scanner-v2.json";
const FIXTURE_PATH = "scripts/fixtures/reddit-scanner-v2.json";
const OUTPUT_DIR = process.env.REDDIT_LEAD_OUTPUT_DIR || "outputs/reddit-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const STRUCTURED_PATH = path.join(OUTPUT_DIR, "latest-structured.json");
const DEFAULT_USER_AGENT =
  "DuncanAndersonRedditLeadScanner/0.2 (manual lead review; https://duncananderson.ca)";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_OAUTH_HOST = "https://oauth.reddit.com";

const SPEAKERS = [
  "operator",
  "employee_responsible",
  "seller_or_promoter",
  "builder_showing_product",
  "content_marketer",
  "job_poster",
  "job_seeker",
  "consumer",
  "fiction_or_offtopic",
  "unclear",
];

const INTENTS = [
  "hiring_or_paid_help",
  "asking_how_to_solve_own_problem",
  "tool_shopping_with_own_pain",
  "sharing_content",
  "promoting",
  "venting_no_ask",
  "other",
];

const CONSULTING_FITS = ["yes", "adjacent", "no"];
const CONFIDENCES = ["high", "medium", "low"];

const LEGACY_QUEUE = {
  contact_today: "active_lead",
  comment_only: "warm_reply",
  watch: "market_intelligence",
  reject: "reject",
};

const SCORE_BY_QUEUE = {
  contact_today: "5/5",
  comment_only: "4/5",
  watch: "3/5",
};

const SPEAKER_REJECTION = {
  seller_or_promoter: "speaker_seller",
  builder_showing_product: "speaker_builder",
  content_marketer: "speaker_content_marketer",
  job_poster: "speaker_job",
  job_seeker: "speaker_job",
  consumer: "speaker_consumer",
  fiction_or_offtopic: "speaker_fiction_offtopic",
  unclear: "speaker_unclear",
};

const POSITIVE_SPEAKERS = new Set(["operator", "employee_responsible"]);
const REPLY_INTENTS = new Set([
  "asking_how_to_solve_own_problem",
  "tool_shopping_with_own_pain",
]);
const TITLE_ONLY_REPLY_MAX_QUEUE = "comment_only";

async function main() {
  if (process.argv.includes("--fixtures")) {
    await runFixtures({ liveLlm: process.argv.includes("--live-llm") });
    return;
  }

  const outputDir = OUTPUT_DIR;
  await mkdir(outputDir, { recursive: true });

  const config = await loadConfig();
  const env = {
    ...(await loadDotEnv(".env.local")),
    ...(await loadDotEnv(".env")),
    ...process.env,
  };
  const userAgent = env.REDDIT_USER_AGENT || DEFAULT_USER_AGENT;
  const token = await getRedditOAuthToken(env, { required: true, userAgent });

  if (!token) {
    const generatedAt = new Date().toISOString();
    const status = {
      ok: false,
      generatedAt,
      successfulFeeds: 0,
      totalFeeds: configuredFeedCount(config),
      ingestionMode: "oauth",
      scanMode: config.scanMode || "quote-grounded-v1",
      fetchedPosts: 0,
      prefilterRejected: {},
      classified: 0,
      candidatesScored: 0,
      classifierFailures: 0,
      leadsIncluded: 0,
      queueCounts: emptyQueueCounts(),
      rejectCounts: {},
      sourceHealth: [],
      quarantinedSources: [],
      outputPath: "",
      message: "Missing Reddit OAuth credentials or token request failed.",
      feedErrors: [
        {
          url: "reddit-oauth",
          status: "missing_oauth_token",
          error: "Reddit OAuth credentials are required for v2 scanner.",
        },
      ],
    };
    await writeStatus(status);
    throw new Error(status.message);
  }

  const state = await loadState(config, env);
  const fetched = await fetchDiscovery(config, { token, userAgent }, state);
  const posts = dedupePosts(fetched.results.flatMap((result) => result.posts));
  const freshPosts = posts.filter((post) => !isStale(post, config.postMaxAgeDays ?? 7));
  const staleRejects = posts
    .filter((post) => isStale(post, config.postMaxAgeDays ?? 7))
    .map((post) => rejectCandidate(post, "stale"));
  const prefiltered = prefilterPosts(freshPosts, config, state);
  const candidates = sortCandidatesForClassification(prefiltered.candidates)
    .slice(0, config.candidateLimit ?? 80);
  const overCapRejects = sortCandidatesForClassification(prefiltered.candidates)
    .slice(config.candidateLimit ?? 80)
    .map((post) => rejectCandidate(post, "low_confidence"));

  if (!env.OPENAI_API_KEY && candidates.length > 0 && process.env.REDDIT_ALLOW_MISSING_LLM !== "true") {
    const generatedAt = new Date().toISOString();
    const failureRejectCounts = {
      classifier_failed: candidates.length,
      ...countBy(prefiltered.rejected, "rejectionReason", {}),
      ...countBy(staleRejects, "rejectionReason", {}),
      ...countBy(overCapRejects, "rejectionReason", {}),
    };
    const failureRejectTotal = candidates.length +
      prefiltered.rejected.length +
      staleRejects.length +
      overCapRejects.length;
    const status = {
      ok: false,
      generatedAt,
      successfulFeeds: fetched.successfulFeeds,
      totalFeeds: fetched.totalFeeds,
      ingestionMode: "oauth",
      scanMode: config.scanMode || "quote-grounded-v1",
      fetchedPosts: posts.length,
      prefilterRejected: countBy(prefiltered.rejected, "rejectionReason", {}),
      classified: 0,
      candidatesScored: 0,
      classifierFailures: candidates.length,
      leadsIncluded: 0,
      queueCounts: { ...emptyQueueCounts(), reject: failureRejectTotal },
      rejectCounts: failureRejectCounts,
      sourceHealth: sourceHealthRows(state),
      quarantinedSources: [],
      outputPath: "",
      message: "OPENAI_API_KEY is required for the quote-grounded Reddit scanner.",
      feedErrors: fetched.feedErrors,
    };
    await writeStatus(status);
    throw new Error(status.message);
  }

  const classified = [];
  for (const [index, post] of candidates.entries()) {
    const classification = await classifyWithRetry(post, config, env.OPENAI_API_KEY);
    const candidate = finalizeCandidate(post, classification);
    classified.push(candidate);
    if ((index + 1) % 10 === 0 || index + 1 === candidates.length) {
      console.log(`Classified ${index + 1}/${candidates.length} Reddit candidates.`);
    }
  }

  const allCandidates = [
    ...classified,
    ...prefiltered.rejected,
    ...staleRejects,
    ...overCapRejects,
  ];
  const surfaced = selectSurfacedCandidates(allCandidates, config);
  const generatedAt = new Date().toISOString();
  const date = generatedAt.slice(0, 10);
  const outputPath = path.join(outputDir, `${date}.md`);
  const structured = structuredRunPayload({
    generatedAt,
    config,
    fetched,
    fetchedPosts: posts.length,
    candidates: allCandidates,
    surfaced,
    state,
  });
  const digest = formatDigest(structured);
  await writeFile(outputPath, digest, "utf8");
  await writeFile(STRUCTURED_PATH, `${JSON.stringify(structured, null, 2)}\n`, "utf8");
  await writeStatus({
    ...structured.status,
    outputPath,
    message: `Wrote Reddit quote-grounded scan with ${surfaced.contact_today.length} contact and ${surfaced.comment_only.length} comment leads.`,
  });
  await writeState(config, updateStateFromRun(state, allCandidates, surfaced));

  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${STATUS_PATH}`);
  console.log(`Wrote ${STRUCTURED_PATH}`);
}

async function runFixtures({ liveLlm = false } = {}) {
  const config = await loadConfig();
  const raw = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  const fixtures = Array.isArray(raw.fixtures) ? raw.fixtures : [];
  const env = {
    ...(await loadDotEnv(".env.local")),
    ...(await loadDotEnv(".env")),
    ...process.env,
  };
  let passed = 0;
  const failures = [];
  const candidates = [];

  for (const fixture of fixtures) {
    const post = fixturePost(fixture);
    const prefiltered = prefilterPosts([post], config, emptyState());
    const candidate = prefiltered.rejected[0] ??
      finalizeCandidate(
        post,
        liveLlm
          ? await classifyWithRetry(post, config, env.OPENAI_API_KEY)
          : normalizeClassification(fixture.classification),
      );
    candidates.push(candidate);
    const expected = fixture.expected ?? {};
    const errors = [];
    if (candidate.queue !== expected.queue) {
      errors.push(`queue expected ${expected.queue}, got ${candidate.queue}`);
    }
    if ((candidate.rejectionReason || "") !== (expected.rejectionReason || "")) {
      errors.push(
        `rejectionReason expected ${expected.rejectionReason || ""}, got ${candidate.rejectionReason || ""}`,
      );
    }
    if (expected.ownershipVerified !== undefined &&
      candidate.quoteVerification.ownershipVerified !== expected.ownershipVerified) {
      errors.push(
        `ownershipVerified expected ${expected.ownershipVerified}, got ${candidate.quoteVerification.ownershipVerified}`,
      );
    }
    if (errors.length) {
      failures.push({ id: fixture.id, errors, candidate });
    } else {
      passed += 1;
    }
  }

  const surfaced = selectSurfacedCandidates(candidates, config);
  const payload = structuredRunPayload({
    generatedAt: new Date().toISOString(),
    config,
    fetched: { successfulFeeds: config.minSuccessfulFeeds, totalFeeds: config.minSuccessfulFeeds, feedErrors: [] },
    fetchedPosts: candidates.length,
    candidates,
    surfaced,
    state: emptyState(),
  });
  const digest = formatDigest(payload);
  const visibleCount = surfaced.contact_today.length + surfaced.comment_only.length;
  const headingCount = (digest.match(/^### [1-5]\/5 - /gm) ?? []).length;
  if (payload.status.leadsIncluded !== visibleCount || headingCount !== visibleCount || digest.includes("## Watch")) {
    failures.push({
      id: "current-queue-digest-contract",
      errors: [
        `leadsIncluded=${payload.status.leadsIncluded}; visible=${visibleCount}; headings=${headingCount}`,
        "Published digest must not contain a Watch section.",
      ],
    });
  }
  const diagnostics = payload.status.queryDiagnostics ?? [];
  if (
    diagnostics.length !== (config.searchQueries ?? []).length ||
    diagnostics.some((diagnostic) =>
      ["fetchedPosts", "prefilterRejected", "candidatesScored", "surfaced", "rejected", "manuallyApproved"]
        .some((field) => typeof diagnostic[field] !== "number"),
    )
  ) {
    failures.push({
      id: "query-diagnostics-contract",
      errors: ["Every configured query must report the quality counters used for source review."],
    });
  }

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    throw new Error(`Reddit v2 fixtures failed: ${passed}/${fixtures.length} passed.`);
  }

  console.log(`Reddit v2 fixtures passed: ${passed}/${fixtures.length}.`);
}

async function loadConfig() {
  const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  return {
    scanMode: "quote-grounded-v1",
    ingestionMode: "oauth",
    llmModel: "gpt-4.1-mini",
    postMaxAgeDays: 7,
    subredditLimit: 25,
    searchLimit: 25,
    candidateLimit: 80,
    minSuccessfulFeeds: 3,
    allowlist: [],
    denylist: [],
    denylistPatterns: [],
    searchQueries: [],
    allowlistedSubredditQueries: [],
    caps: { contact_today: 3, comment_only: 5, watch: 5 },
    statePath: process.env.REDDIT_SCANNER_STATE_PATH || ".tmp/reddit-scanner-state.json",
    ...config,
  };
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

function stripQuotes(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

async function writeStatus(status) {
  await mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

async function loadState(config, env = process.env) {
  const statePath = config.statePath;
  const localState = await loadLocalState(statePath);
  const adminState = await loadAdminFeedbackState(env);
  return mergeStates(localState, adminState);
}

async function loadLocalState(statePath) {
  if (!statePath || !existsSync(statePath)) return emptyState();
  try {
    const parsed = JSON.parse(await readFile(statePath, "utf8"));
    return {
      ...emptyState(),
      ...parsed,
      verdicts: parsed.verdicts ?? {},
      authorLabels: parsed.authorLabels ?? {},
      sourceStats: parsed.sourceStats ?? {},
      reviewedExamples: Array.isArray(parsed.reviewedExamples) ? parsed.reviewedExamples : [],
    };
  } catch {
    return emptyState();
  }
}

async function loadAdminFeedbackState(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "";
  if (!supabaseUrl || !supabaseKey) return emptyState();

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { data, error } = await supabase
      .from("admin_lead_states")
      .select("lead_key,notes,updated_at")
      .eq("source_id", "reddit")
      .not("notes", "eq", "");
    if (error || !data?.length) return emptyState();

    const leadKeys = data.map((row) => row.lead_key).filter(Boolean);
    const payloads = new Map();
    if (leadKeys.length) {
      const { data: leads } = await supabase
        .from("admin_leads")
        .select("lead_key,author,payload")
        .eq("source_id", "reddit")
        .in("lead_key", leadKeys);
      for (const row of leads ?? []) {
        payloads.set(row.lead_key, row);
      }
    }

    const state = emptyState();
    for (const row of data) {
      const markers = feedbackMarkers(row.notes);
      if (!markers.length) continue;
      const leadRow = payloads.get(row.lead_key);
      const payload = leadRow?.payload ?? {};
      const source = sourceKey({
        sourceQuery: payload.sourceQuery || "",
        subreddit: payload.subreddit || "",
      });

      for (const marker of markers) {
        if (marker === "good_lead" || marker.startsWith("bad_lead:")) {
          state.verdicts[row.lead_key] = {
            verdict: marker === "good_lead" ? "good" : "bad",
            reason: marker.startsWith("bad_lead:") ? marker.split(":").slice(1).join(":") : "",
            at: row.updated_at || new Date().toISOString(),
          };
          if (source) {
            const stats = state.sourceStats[source] ?? { surfaced: 0, good: 0, lastTen: [] };
            stats.surfaced += 1;
            if (marker === "good_lead") stats.good += 1;
            stats.lastTen = [...(stats.lastTen ?? []), marker === "good_lead" ? "good" : "bad"].slice(-10);
            state.sourceStats[source] = stats;
          }
        }
        if (marker.startsWith("blocklist_author:")) {
          const author = normalizeAuthor(marker.split(":").slice(1).join(":") || leadRow?.author || payload.author);
          if (author && author !== "unknown") state.authorLabels[author] = "blocked";
        }
        if (marker.startsWith("quarantine_source:")) {
          const quarantinedSource = marker.split(":").slice(1).join(":").trim();
          if (quarantinedSource) {
            state.sourceStats[quarantinedSource] = {
              surfaced: 10,
              good: 0,
              lastTen: Array.from({ length: 10 }, () => "bad"),
            };
          }
        }
      }
    }
    return state;
  } catch (error) {
    console.warn(`Unable to load admin feedback state: ${errorMessage(error)}`);
    return emptyState();
  }
}

function feedbackMarkers(notes) {
  return String(notes || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^\[reddit-v2-feedback [^\]]+\]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function mergeStates(...states) {
  const merged = emptyState();
  for (const state of states) {
    Object.assign(merged.verdicts, state.verdicts ?? {});
    Object.assign(merged.authorLabels, state.authorLabels ?? {});
    merged.reviewedExamples.push(...(state.reviewedExamples ?? []));
    for (const [source, stats] of Object.entries(state.sourceStats ?? {})) {
      const current = merged.sourceStats[source] ?? { surfaced: 0, good: 0, lastTen: [] };
      current.surfaced += Number(stats.surfaced ?? 0);
      current.good += Number(stats.good ?? 0);
      current.lastTen = [...(current.lastTen ?? []), ...(stats.lastTen ?? [])].slice(-10);
      merged.sourceStats[source] = current;
    }
  }
  return merged;
}

async function writeState(config, state) {
  const statePath = config.statePath;
  if (!statePath) return;
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function emptyState() {
  return {
    verdicts: {},
    authorLabels: {},
    sourceStats: {},
    reviewedExamples: [],
  };
}

async function getRedditOAuthToken(env, { required = false, userAgent = DEFAULT_USER_AGENT } = {}) {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;
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
      if (!required) {
        console.warn(`Reddit OAuth unavailable (${response.status} ${body.error || "token_error"}).`);
      }
      return "";
    }
    return String(body.access_token);
  } catch (error) {
    if (!required) {
      console.warn(`Reddit OAuth unavailable (${error instanceof Error ? error.message : String(error)}).`);
    }
    return "";
  }
}

async function fetchDiscovery(config, options, state = emptyState()) {
  const allowlist = limitByEnv(
    normalizedList(config.allowlist),
    "REDDIT_CHANNEL_LIMIT",
  );
  const searchQueries = limitQuerySpecs(config.searchQueries ?? [], "REDDIT_SEARCH_LIMIT");
  const subredditQueries = config.allowlistedSubredditQueries ?? [];
  const results = [];

  for (const subreddit of allowlist) {
    if (isSourceQuarantined(state, `subreddit:${subreddit}`)) continue;
    results.push(await fetchSubreddit(subreddit, config, options));
    await sleep(250);
  }

  for (const query of searchQueries) {
    if (isSourceQuarantined(state, `query:${query.query}`)) continue;
    results.push(await fetchSearchQuery(query, config, options));
    await sleep(250);
  }

  for (const subreddit of allowlist) {
    for (const query of subredditQueries) {
      if (
        isSourceQuarantined(state, `subreddit:${subreddit}`) ||
        isSourceQuarantined(state, `query:subreddit:${subreddit} ${query.query}`)
      ) {
        continue;
      }
      results.push(await fetchSearchQuery({
        id: `${query.id}-${subreddit}`,
        query: `subreddit:${subreddit} ${query.query}`,
        sourceSubreddit: subreddit,
      }, config, options));
      await sleep(250);
    }
  }

  return {
    results,
    successfulFeeds: results.filter((result) => result.ok).length,
    totalFeeds: results.length,
    feedErrors: results
      .filter((result) => !result.ok)
      .map(({ url, status, error }) => ({ url, status, error })),
  };
}

async function fetchSubreddit(subreddit, config, options) {
  const params = new URLSearchParams({
    limit: String(config.subredditLimit ?? 25),
    raw_json: "1",
  });
  const url = `${REDDIT_OAUTH_HOST}/r/${encodeURIComponent(subreddit)}/new?${params.toString()}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.token}`,
        "User-Agent": options.userAgent,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body) {
      return { ok: false, url, status: response.status, error: JSON.stringify(body).slice(0, 200), posts: [] };
    }
    return {
      ok: true,
      url,
      status: response.status,
      posts: parseRedditListing(body, {
        fetchStage: "allowlist_subreddit",
        sourceQuery: "",
        sourceId: `r/${subreddit}`,
      }),
    };
  } catch (error) {
    return { ok: false, url, status: "network_error", error: errorMessage(error), posts: [] };
  }
}

async function fetchSearchQuery(querySpec, config, options) {
  const spec = normalizeQuerySpec(querySpec);
  const params = new URLSearchParams({
    q: spec.query,
    sort: "new",
    t: "month",
    limit: String(config.searchLimit ?? 25),
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
      return { ok: false, url: `reddit-search:${spec.id}`, status: response.status, error: JSON.stringify(body).slice(0, 200), posts: [] };
    }
    return {
      ok: true,
      url: `reddit-search:${spec.id}`,
      status: response.status,
      posts: parseRedditListing(body, {
        fetchStage: spec.sourceSubreddit ? "allowlist_query" : "open_search",
        sourceQuery: spec.query,
        sourceId: spec.id,
      }),
    };
  } catch (error) {
    return { ok: false, url: `reddit-search:${spec.id}`, status: "network_error", error: errorMessage(error), posts: [] };
  }
}

function parseRedditListing(body, source) {
  const children = body?.data?.children;
  if (!Array.isArray(children)) return [];
  return children.map((child) => {
    const post = child.data ?? {};
    const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : post.url || "";
    const created = post.created_utc ? new Date(post.created_utc * 1000).toISOString() : "";
    return {
      id: String(post.id || ""),
      redditId: String(post.id || ""),
      subreddit: String(post.subreddit || ""),
      title: String(post.title || "").trim(),
      body: String(post.selftext || post.selftext_html || "").trim(),
      author: normalizeAuthor(post.author || "unknown"),
      url: permalink,
      publishedAt: created,
      sourceQuery: source.sourceQuery || "",
      sourceId: source.sourceId || "",
      fetchStage: source.fetchStage || "open_search",
      commentCount: Number.isFinite(post.num_comments) ? post.num_comments : 0,
      redditScore: Number.isFinite(post.score) ? post.score : 0,
      isCrosspost: Boolean(post.crosspost_parent || post.crosspost_parent_list),
    };
  });
}

function prefilterPosts(posts, config, state) {
  const rejected = [];
  const candidates = [];
  const denylist = new Set(normalizedList(config.denylist).map((item) => item.toLowerCase()));

  for (const post of posts) {
    const reason = prefilterReason(post, config, state, denylist);
    if (reason) {
      rejected.push(rejectCandidate(post, reason));
    } else {
      candidates.push(post);
    }
  }

  return { candidates, rejected };
}

function prefilterReason(post, config, state, denylist) {
  if (post.isCrosspost) return "duplicate";
  if (state.authorLabels?.[normalizeAuthor(post.author)] === "blocked" ||
    state.authorLabels?.[normalizeAuthor(post.author)] === "seller") {
    return "prefilter_blocklisted_author";
  }
  const subreddit = String(post.subreddit || "").toLowerCase();
  if (denylist.has(subreddit) || matchesAnyPattern(post.subreddit, config.denylistPatterns ?? [])) {
    return "prefilter_denylisted_subreddit";
  }
  if (isLinkOnly(post)) return "prefilter_link_only";
  if (hasPromoMarker(post)) return "prefilter_promo_marker";
  if (hasJobPostingShape(post) || matchesAnyPattern(post.subreddit, ["*jobs*"])) {
    return "prefilter_job_posting";
  }
  return "";
}

function finalizeCandidate(post, rawClassification) {
  const classification = normalizeClassification(rawClassification);
  const quoteVerification = verifyQuotes(post, classification);
  const verifiedClassification = {
    ...classification,
    problem_ownership_quote: quoteVerification.ownershipVerified
      ? classification.problem_ownership_quote
      : null,
    ask_quote: quoteVerification.askVerified ? classification.ask_quote : null,
  };
  const assigned = assignQueue({
    ...post,
    classification: verifiedClassification,
    quoteVerification,
  });
  return {
    ...post,
    classification: verifiedClassification,
    quoteVerification,
    queue: assigned.queue,
    rejectionReason: assigned.rejectionReason,
    rankKey: rankKeyForCandidate(post, verifiedClassification, assigned.queue),
    classificationAttempted: true,
  };
}

function rejectCandidate(post, reason) {
  return {
    ...post,
    classification: nullClassification(),
    quoteVerification: { ownershipVerified: false, askVerified: false, failed: false },
    queue: "reject",
    rejectionReason: reason,
    rankKey: "",
    classificationAttempted: false,
  };
}

function assignQueue(candidate) {
  const classification = candidate.classification ?? nullClassification();
  const quoteVerification = candidate.quoteVerification ?? {};
  if (classification.classifierFailed) {
    return { queue: "reject", rejectionReason: "classifier_failed" };
  }
  if (!POSITIVE_SPEAKERS.has(classification.speaker)) {
    return {
      queue: "reject",
      rejectionReason: SPEAKER_REJECTION[classification.speaker] || "speaker_unclear",
    };
  }
  if (classification.consulting_fit === "no") {
    return { queue: "reject", rejectionReason: "consulting_fit_no" };
  }
  if (!quoteVerification.ownershipVerified) {
    return {
      queue: "reject",
      rejectionReason: quoteVerification.failed ? "quote_verification_failed" : "no_ownership_quote",
    };
  }
  if (!hasOwnedBusinessContext(candidate)) {
    return { queue: "reject", rejectionReason: "missing_owned_business_context" };
  }
  if (!hasOperationalWorkflowEvidence(candidate)) {
    return { queue: "reject", rejectionReason: "missing_operational_workflow" };
  }
  if (
    classification.intent === "hiring_or_paid_help" &&
    quoteVerification.askVerified &&
    classification.consulting_fit === "yes" &&
    classification.confidence === "high"
  ) {
    return { queue: titleOnlyCap(candidate, "contact_today"), rejectionReason: "" };
  }
  if (
    REPLY_INTENTS.has(classification.intent) &&
    classification.consulting_fit === "yes" &&
    ["high", "medium"].includes(classification.confidence)
  ) {
    return { queue: titleOnlyCap(candidate, "comment_only"), rejectionReason: "" };
  }
  if (
    classification.consulting_fit === "adjacent" ||
    classification.confidence === "low" ||
    !quoteVerification.askVerified ||
    ["venting_no_ask", "other"].includes(classification.intent)
  ) {
    return { queue: "watch", rejectionReason: "" };
  }
  return { queue: "reject", rejectionReason: "low_confidence" };
}

function titleOnlyCap(candidate, queue) {
  if (queue === "contact_today" && !String(candidate.body || "").trim()) {
    return TITLE_ONLY_REPLY_MAX_QUEUE;
  }
  return queue;
}

function hasOwnedBusinessContext(post) {
  const text = normalizeForQuote(combinedText(post));
  const hasFirstPersonOwnership = /\b(?:i|we|our)\b/.test(text);
  const hasBusinessContext = /\b(?:business|company|agency|practice|clinic|client|customer|contracting|shop|store|firm|operations?|bookkeeping|accounting|tax(?:\s+practice)?|preparer)\b/.test(text);
  return hasFirstPersonOwnership && hasBusinessContext;
}

function hasOperationalWorkflowEvidence(post) {
  return /\b(?:process|workflow|handoff|onboard(?:ing)?|intake|follow[ -]?up|quote|lead|appointment|schedule|dispatch|invoice|receipt|reconcil\w*|document|form|spreadsheet|crm|report(?:ing)?|client update|data entry|task)\b/i.test(combinedText(post));
}

function verifyQuotes(post, classification) {
  const text = normalizeForQuote(`${post.title || ""}\n${post.body || ""}`);
  const ownershipQuote = classification.problem_ownership_quote;
  const askQuote = classification.ask_quote;
  const ownershipVerified = ownershipQuote ? text.includes(normalizeForQuote(ownershipQuote)) : false;
  const askVerified = askQuote ? text.includes(normalizeForQuote(askQuote)) : false;
  return {
    ownershipVerified,
    askVerified,
    failed: Boolean((ownershipQuote && !ownershipVerified) || (askQuote && !askVerified)),
  };
}

async function classifyWithRetry(post, config, apiKey, attempts = 3) {
  if (!apiKey) return classifierFailure();
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await classifyWithLlm(post, config, apiKey);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  console.warn(`Classifier failed for ${post.id || post.url}: ${errorMessage(lastError)}`);
  return classifierFailure();
}

async function classifyWithLlm(post, config, apiKey) {
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
          content: classifierSystemPrompt(config),
        },
        {
          role: "user",
          content: JSON.stringify({
            subreddit: post.subreddit,
            title: post.title,
            body: String(post.body || "").slice(0, 6000),
            author: post.author,
            sourceQuery: post.sourceQuery,
            fetchStage: post.fetchStage,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "reddit_lead_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              speaker: { type: "string", enum: SPEAKERS },
              intent: { type: "string", enum: INTENTS },
              problem_ownership_quote: { type: ["string", "null"] },
              ask_quote: { type: ["string", "null"] },
              consulting_fit: { type: "string", enum: CONSULTING_FITS },
              reply_angle: { type: ["string", "null"] },
              confidence: { type: "string", enum: CONFIDENCES },
            },
            required: [
              "speaker",
              "intent",
              "problem_ownership_quote",
              "ask_quote",
              "consulting_fit",
              "reply_angle",
              "confidence",
            ],
          },
        },
      },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(`OpenAI classifier failed: ${response.status} ${JSON.stringify(body).slice(0, 300)}`);
  }

  const text = responseText(body);
  if (!text) throw new Error("OpenAI classifier returned no text.");
  return normalizeClassification(JSON.parse(text));
}

function classifierSystemPrompt(config) {
  const fewShots = (config.fewShotExamples ?? []).slice(0, 8);
  return [
    "You classify a single Reddit post for an independent AI/workflow consultant deciding whether to reply.",
    "You are a skeptic. Most posts are not leads.",
    "The target is a real business owner, operator, manager, or responsible employee who may hire an AI/workflow implementation expert.",
    "Return strict JSON only.",
    "",
    `Allowed speaker labels: ${SPEAKERS.join(", ")}`,
    `Allowed intent labels: ${INTENTS.join(", ")}`,
    "consulting_fit is yes only if a paid AI/workflow implementation engagement would plausibly solve the poster's own problem.",
    "",
    "problem_ownership_quote must be copied character-for-character from the title or body and must show that the poster owns, operates, manages, or is responsible for a business process.",
    "ask_quote must be copied character-for-character from the title or body and must show a request for help, hiring, paid work, or how-to advice.",
    "If no quote exists, return null. Never paraphrase.",
    "A title-only post can be useful advice, but do not infer paid hiring from title alone unless the title explicitly says pay, hire, paid, consultant, freelancer, or looking for someone.",
    "",
    "Hard rules:",
    "- Articles, guides, listicles, case studies, and third-person content about pain are content_marketer/sharing_content.",
    "- 'We are building', 'I built', 'we launched', product demos, or feedback requests are builder_showing_product or seller_or_promoter.",
    "- Narrative fiction and off-topic stories are fiction_or_offtopic.",
    "- Personal consumer vendor-selection is consumer with consulting_fit no.",
    "- Personal purchases, hobbies, music, gaming, and other individual projects are never consulting fit, even when the poster says they will pay.",
    "- Cash flow, pricing, payroll, hiring, sales, marketing, or growth advice is not consulting fit unless the post also describes a concrete operational workflow or handoff that needs implementation help.",
    "- Job posts and job seekers use the job labels.",
    "- Generic tool shopping without a concrete owned business process should not receive an ownership quote.",
    "",
    fewShots.length ? `Reviewed examples:\n${JSON.stringify(fewShots)}` : "",
  ].filter(Boolean).join("\n");
}

function normalizeClassification(value) {
  const classification = value && typeof value === "object" ? value : {};
  return {
    speaker: SPEAKERS.includes(classification.speaker) ? classification.speaker : "unclear",
    intent: INTENTS.includes(classification.intent) ? classification.intent : "other",
    problem_ownership_quote: nullableString(classification.problem_ownership_quote),
    ask_quote: nullableString(classification.ask_quote),
    consulting_fit: CONSULTING_FITS.includes(classification.consulting_fit)
      ? classification.consulting_fit
      : "no",
    reply_angle: nullableString(classification.reply_angle),
    confidence: CONFIDENCES.includes(classification.confidence) ? classification.confidence : "low",
    classifierFailed: Boolean(classification.classifierFailed),
  };
}

function nullClassification() {
  return {
    speaker: "unclear",
    intent: "other",
    problem_ownership_quote: null,
    ask_quote: null,
    consulting_fit: "no",
    reply_angle: null,
    confidence: "low",
  };
}

function classifierFailure() {
  return {
    speaker: "unclear",
    intent: "other",
    problem_ownership_quote: null,
    ask_quote: null,
    consulting_fit: "no",
    reply_angle: null,
    confidence: "low",
    classifierFailed: true,
  };
}

function selectSurfacedCandidates(candidates, config) {
  const sorted = [...candidates].sort(compareCandidates);
  const contactCandidates = sorted.filter((candidate) => candidate.queue === "contact_today");
  const contactToday = contactCandidates.slice(0, config.caps?.contact_today ?? 3);
  const contactOverflow = contactCandidates.slice(config.caps?.contact_today ?? 3);
  const contactIds = new Set(contactToday.map(candidateId));
  const commentCandidates = sorted.filter((candidate) =>
    candidate.queue === "comment_only" && !contactIds.has(candidateId(candidate)),
  );
  const commentOnly = commentCandidates.slice(0, config.caps?.comment_only ?? 5);
  const commentOverflow = commentCandidates.slice(config.caps?.comment_only ?? 5);
  const replyIds = new Set([...contactToday, ...commentOnly].map(candidateId));
  const overflowAsWatch = [...contactOverflow, ...commentOverflow].map((candidate) => ({
    ...candidate,
    queue: "watch",
  }));
  const watchCandidates = [
    ...overflowAsWatch,
    ...sorted.filter((candidate) => candidate.queue === "watch" && !replyIds.has(candidateId(candidate))),
  ];
  const watch = watchCandidates
    .slice(0, config.caps?.watch ?? 5);
  return {
    contact_today: contactToday,
    comment_only: commentOnly,
    watch,
  };
}

function structuredRunPayload({ generatedAt, config, fetched, fetchedPosts, candidates, surfaced, state }) {
  const queueCounts = countBy(candidates, "queue", emptyQueueCounts());
  const rejectCounts = countBy(
    candidates.filter((candidate) => candidate.queue === "reject"),
    "rejectionReason",
    {},
  );
  const prefilterRejected = countBy(
    candidates.filter((candidate) => String(candidate.rejectionReason || "").startsWith("prefilter_")),
    "rejectionReason",
    {},
  );
  const sourceHealth = sourceHealthRows(state);
  const queryDiagnostics = queryDiagnosticsForRun(config, fetched, candidates, state);
  const leadsIncluded = surfaced.contact_today.length + surfaced.comment_only.length;
  const classificationAttempts = candidates.filter((candidate) => candidate.classificationAttempted).length;
  return {
    generatedAt,
    status: {
      ok: fetched.successfulFeeds >= (config.minSuccessfulFeeds ?? 3),
      generatedAt,
      successfulFeeds: fetched.successfulFeeds,
      totalFeeds: fetched.totalFeeds,
      ingestionMode: "oauth",
      scanMode: config.scanMode || "quote-grounded-v1",
      fetchedPosts,
      prefilterRejected,
      classified: candidates.filter((candidate) => candidate.classification?.speaker !== "unclear").length,
      candidatesScored: classificationAttempts,
      classifierFailures: candidates.filter((candidate) => candidate.rejectionReason === "classifier_failed").length,
      leadsIncluded,
      queueCounts,
      rejectCounts,
      queryDiagnostics,
      sourceHealth,
      quarantinedSources: sourceHealth.filter((row) => row.quarantined).map((row) => row.source),
      feedErrors: fetched.feedErrors,
      outputPath: "",
      message: "",
    },
    leads: {
      contact_today: surfaced.contact_today,
      comment_only: surfaced.comment_only,
      watch: surfaced.watch,
    },
    rejectionExamples: rejectionExamples(candidates),
    sourceHealth,
    feedErrors: fetched.feedErrors,
  };
}

function queryDiagnosticsForRun(config, fetched, candidates, state) {
  return (config.searchQueries ?? []).map((querySpec) => {
    const spec = normalizeQuerySpec(querySpec);
    const fetchedResults = (fetched.results ?? []).filter(
      (result) => result.url === `reddit-search:${spec.id}`,
    );
    const queryCandidates = candidates.filter((candidate) => candidate.sourceQuery === spec.query);
    const sourceStats = state.sourceStats?.[`query:${spec.query}`] ?? {};
    return {
      id: spec.id,
      query: spec.query,
      status: fetchedResults.length === 0 ? "not_run" : fetchedResults.every((result) => result.ok) ? "ok" : "failed",
      fetchedPosts: fetchedResults.reduce((count, result) => count + result.posts.length, 0),
      prefilterRejected: queryCandidates.filter((candidate) =>
        String(candidate.rejectionReason || "").startsWith("prefilter_"),
      ).length,
      candidatesScored: queryCandidates.filter((candidate) => candidate.classificationAttempted).length,
      surfaced: queryCandidates.filter((candidate) =>
        ["contact_today", "comment_only"].includes(candidate.queue),
      ).length,
      watch: queryCandidates.filter((candidate) => candidate.queue === "watch").length,
      rejected: queryCandidates.filter((candidate) => candidate.queue === "reject").length,
      manuallyApproved: Number(sourceStats.good ?? 0),
    };
  });
}

function formatDigest(payload) {
  const status = payload.status;
  const lines = [
    `# Reddit leads - ${status.generatedAt.slice(0, 10)}`,
    "",
    `- Generated: ${status.generatedAt}`,
    `- Scan mode: ${status.scanMode}`,
    `- Feeds checked: ${status.successfulFeeds}/${status.totalFeeds}`,
    `- Candidates included: ${status.leadsIncluded}`,
    `- Filtered/rejected before digest: ${status.queueCounts.reject}`,
    "",
    "## Contact Today",
    "",
    ...formatLeadList(payload.leads.contact_today, "contact_today"),
    "## Comment Only",
    "",
    ...formatLeadList(payload.leads.comment_only, "comment_only"),
    "## Rejection Summary",
    "",
    ...formatRejectionSummary(payload.rejectionExamples, status.rejectCounts),
    "## Source Health",
    "",
    ...formatSourceHealth(payload.sourceHealth),
    "## Feed Errors",
    "",
    ...formatFeedErrors(payload.feedErrors),
  ];
  return `${lines.join("\n")}\n`;
}

function formatLeadList(leads, queue) {
  if (!leads.length) return [`_0 leads._`, ""];
  return leads.flatMap((lead) => formatLead(lead, queue));
}

function formatLead(lead, queue) {
  const classification = lead.classification ?? nullClassification();
  return [
    `### ${SCORE_BY_QUEUE[queue]} - r/${lead.subreddit || "reddit"} - ${lead.title || "Untitled Reddit post"}`,
    `- Posted date: ${dateOnly(lead.publishedAt) || "unknown"}`,
    `- URL: ${lead.url || ""}`,
    `- Author: ${lead.author || "unknown"}`,
    `- Queue: ${LEGACY_QUEUE[queue]}`,
    `- Source query: ${lead.sourceQuery || ""}`,
    `- Speaker: ${classification.speaker}`,
    `- Intent: ${classification.intent}`,
    `- Consulting fit: ${classification.consulting_fit}`,
    `- Confidence: ${classification.confidence}`,
    `- Ownership quote: ${classification.problem_ownership_quote || ""}`,
    ...(queue === "contact_today" ? [`- Ask quote: ${classification.ask_quote || ""}`] : []),
    `- Why now: ${whyNow(lead)}`,
    `- Reply angle: ${classification.reply_angle || ""}`,
    `- Rejection reason: ${lead.rejectionReason || ""}`,
    `- Source quote or snippet: ${sourceSnippet(lead)}`,
    "",
  ];
}

function formatRejectionSummary(examples, counts) {
  const reasons = Object.keys(counts).sort();
  if (!reasons.length) return ["_No rejects._", ""];
  return reasons.flatMap((reason) => [
    `- ${reason}: ${counts[reason]}${examples[reason]?.length ? ` (${examples[reason].join("; ")})` : ""}`,
  ]).concat("");
}

function formatSourceHealth(rows) {
  if (!rows.length) return ["_No reviewed source-health data yet._", ""];
  return [
    "| Source | Surfaced | Good | Precision | Quarantined |",
    "|---|---:|---:|---:|---|",
    ...rows.map((row) =>
      `| ${row.source} | ${row.surfaced} | ${row.markedGood} | ${row.precision.toFixed(2)} | ${row.quarantined ? "yes" : "no"} |`,
    ),
    "",
  ];
}

function formatFeedErrors(errors) {
  if (!errors.length) return ["_None._", ""];
  return errors.map((error) => `- ${error.url}: ${error.status} ${error.error}`).concat("");
}

function updateStateFromRun(state, candidates, surfaced) {
  const next = JSON.parse(JSON.stringify(state || emptyState()));
  for (const lead of [...surfaced.contact_today, ...surfaced.comment_only]) {
    const source = sourceKey(lead);
    const stats = next.sourceStats[source] ?? { surfaced: 0, good: 0, lastTen: [] };
    stats.surfaced += 1;
    stats.lastTen = [...(stats.lastTen ?? []), "surfaced"].slice(-10);
    next.sourceStats[source] = stats;
  }
  for (const candidate of candidates) {
    if (candidate.classification?.speaker === "seller_or_promoter") {
      const author = normalizeAuthor(candidate.author);
      if (author && author !== "unknown") {
        const existing = next.authorLabels[author];
        if (existing !== "blocked" && existing !== "good") next.authorLabels[author] = "seller";
      }
    }
  }
  return next;
}

function sourceHealthRows(state) {
  return Object.entries(state.sourceStats ?? {})
    .map(([source, stats]) => {
      const surfaced = Number(stats.surfaced ?? 0);
      const markedGood = Number(stats.good ?? 0);
      const precision = surfaced ? markedGood / surfaced : 0;
      return {
        source,
        surfaced,
        markedGood,
        precision,
        quarantined: surfaced >= 10 && precision < 0.2,
      };
    })
    .sort((a, b) => a.precision - b.precision);
}

function isSourceQuarantined(state, source) {
  const stats = state.sourceStats?.[source];
  if (!stats) return false;
  const surfaced = Number(stats.surfaced ?? 0);
  const markedGood = Number(stats.good ?? 0);
  const precision = surfaced ? markedGood / surfaced : 0;
  return surfaced >= 10 && precision < 0.2;
}

function rejectionExamples(candidates) {
  const examples = {};
  for (const candidate of candidates) {
    if (candidate.queue !== "reject" || !candidate.rejectionReason) continue;
    const list = examples[candidate.rejectionReason] ?? [];
    if (list.length < 3) list.push(candidate.title || candidate.url || candidate.id);
    examples[candidate.rejectionReason] = list;
  }
  return examples;
}

function compareCandidates(a, b) {
  const rankDiff = queueRank(b.queue) - queueRank(a.queue);
  if (rankDiff) return rankDiff;
  const aPaid = explicitPayLanguage(a.classification?.ask_quote) ? 1 : 0;
  const bPaid = explicitPayLanguage(b.classification?.ask_quote) ? 1 : 0;
  if (aPaid !== bPaid) return bPaid - aPaid;
  const aSpecific = specificityScore(a.classification?.problem_ownership_quote);
  const bSpecific = specificityScore(b.classification?.problem_ownership_quote);
  if (aSpecific !== bSpecific) return bSpecific - aSpecific;
  const aDate = new Date(a.publishedAt || 0).getTime() || 0;
  const bDate = new Date(b.publishedAt || 0).getTime() || 0;
  if (aDate !== bDate) return bDate - aDate;
  return (a.commentCount ?? 9999) - (b.commentCount ?? 9999);
}

function sortCandidatesForClassification(posts) {
  return [...posts].sort((a, b) => {
    const aDate = new Date(a.publishedAt || 0).getTime() || 0;
    const bDate = new Date(b.publishedAt || 0).getTime() || 0;
    if (a.fetchStage !== b.fetchStage) {
      return a.fetchStage === "allowlist_subreddit" ? -1 : 1;
    }
    return bDate - aDate;
  });
}

function rankKeyForCandidate(post, classification, queue) {
  return [
    queueRank(queue),
    explicitPayLanguage(classification.ask_quote) ? 1 : 0,
    specificityScore(classification.problem_ownership_quote),
    dateOnly(post.publishedAt),
  ].join(":");
}

function queueRank(queue) {
  return { contact_today: 4, comment_only: 3, watch: 2, reject: 1 }[queue] ?? 0;
}

function fixturePost(fixture) {
  return {
    id: fixture.id,
    redditId: fixture.id,
    subreddit: fixture.subreddit,
    title: fixture.title,
    body: fixture.body ?? fixture.summary ?? "",
    author: normalizeAuthor(fixture.author || "fixture"),
    url: fixture.url || `https://www.reddit.com/r/${fixture.subreddit}/comments/${fixture.id}`,
    publishedAt: fixture.publishedAt || new Date().toISOString(),
    sourceQuery: fixture.sourceQuery || "",
    sourceId: fixture.sourceId || `fixture:${fixture.id}`,
    fetchStage: fixture.fetchStage || "allowlist_subreddit",
    commentCount: fixture.commentCount ?? 0,
    redditScore: fixture.redditScore ?? 1,
    isCrosspost: Boolean(fixture.isCrosspost),
  };
}

function isStale(post, maxAgeDays) {
  if (!post.publishedAt) return false;
  const parsed = new Date(post.publishedAt).getTime();
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed > maxAgeDays * 24 * 60 * 60 * 1000;
}

function isLinkOnly(post) {
  const url = String(post.url || "");
  return !String(post.body || "").trim() &&
    /^https?:\/\//i.test(url) &&
    !/reddit\.com\/r\//i.test(url);
}

function hasPromoMarker(post) {
  return /\b(referral|affiliate|coupon code|promo code|use my code|discount code)\b/i.test(combinedText(post));
}

function hasJobPostingShape(post) {
  const text = combinedText(post);
  return /(?:📍|location:).{0,80}(?:salary|about company|full[- ]time|apply now)/i.test(text) ||
    /\b(?:salary range|about company|we are hiring|apply now)\b/i.test(text);
}

function matchesAnyPattern(value, patterns) {
  return patterns.some((pattern) => wildcardRegex(pattern).test(String(value || "")));
}

function wildcardRegex(pattern) {
  const escaped = String(pattern || "")
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function dedupePosts(posts) {
  const seen = new Set();
  const deduped = [];
  for (const post of posts) {
    const key = post.id || normalizeUrl(post.url) || `${post.subreddit}:${post.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(post);
  }
  return deduped;
}

function normalizeForQuote(value) {
  return String(value || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function combinedText(post) {
  return `${post.title || ""}\n${post.body || ""}`;
}

function sourceSnippet(lead) {
  return combinedText(lead).replace(/\s+/g, " ").trim().slice(0, 260);
}

function whyNow(lead) {
  const quote = lead.classification?.problem_ownership_quote || "";
  if (quote) return quote.replace(/\s+/g, " ").slice(0, 180);
  return "Operator-owned workflow pain is visible enough to review.";
}

function explicitPayLanguage(value) {
  return /\b(pay|paid|hire|hiring|consultant|freelancer|looking for someone|need someone|open to paid help)\b/i.test(String(value || ""));
}

function specificityScore(value) {
  const text = String(value || "");
  return [
    /\d/.test(text),
    /\b(client|customer|team|project|invoice|appointment|order|report|follow.?up|document|revenue)\b/i.test(text),
    text.length > 100,
  ].filter(Boolean).length;
}

function nullableString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function countBy(items, key, initial = {}) {
  const counts = { ...initial };
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item[key];
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function emptyQueueCounts() {
  return { contact_today: 0, comment_only: 0, watch: 0, reject: 0 };
}

function sourceKey(lead) {
  return lead.sourceQuery ? `query:${lead.sourceQuery}` : `subreddit:${lead.subreddit}`;
}

function candidateId(candidate) {
  return candidate.id || candidate.url || `${candidate.subreddit}:${candidate.title}`;
}

function configuredFeedCount(config) {
  return normalizedList(config.allowlist).length +
    (config.searchQueries ?? []).length +
    normalizedList(config.allowlist).length * (config.allowlistedSubredditQueries ?? []).length;
}

function normalizedList(values) {
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function limitByEnv(values, envName) {
  const limit = Number.parseInt(process.env[envName] || "", 10);
  if (!Number.isFinite(limit) || limit <= 0) return values;
  return values.slice(0, limit);
}

function limitQuerySpecs(values, envName) {
  return limitByEnv(values.map(normalizeQuerySpec), envName);
}

function normalizeQuerySpec(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const query = String(value.query || value.q || "").trim();
    return {
      id: slug(value.id || value.label || query),
      query,
      sourceSubreddit: value.sourceSubreddit || "",
    };
  }
  const query = String(value || "").trim();
  return { id: slug(query).slice(0, 80), query, sourceSubreddit: "" };
}

function normalizeAuthor(value) {
  return String(value || "unknown").replace(/^u\//i, "").trim() || "unknown";
}

function normalizeUrl(value) {
  return String(value || "").replace(/[?#].*$/, "").replace(/\/$/, "");
}

function dateOnly(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function responseText(body) {
  if (typeof body.output_text === "string") return body.output_text;
  const parts = [];
  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.type === "text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(async (error) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
