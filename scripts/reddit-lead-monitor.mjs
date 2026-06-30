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

async function main() {
  const config = await loadConfig();
  const env = {
    ...process.env,
    ...(await loadDotEnv(".env.local")),
  };
  const outputDate = localDate();
  const maxAgeMs = (config.maxAgeHours ?? 48) * 60 * 60 * 1000;
  const now = Date.now();

  const feedResults = [];
  const posts = [];

  const scanConfig = selectedScanConfig(config);
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

  const filtered = freshPosts
    .map((post) => ({ ...post, ...matchPost(post) }))
    .filter((post) => shouldKeepPost(post))
    .sort((a, b) => candidatePriority(b) - candidatePriority(a))
    .slice(0, config.maxLlmCandidates ?? 25);

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
  const scanMode = requestedMode
    ? scanModes.find((mode) => slug(mode.id || mode.label) === slug(requestedMode))
    : scanModes[0] ?? null;

  if (!scanMode) {
    return {
      ...config,
      scanMode: null,
      channels: config.channels ?? [],
      searchQueries: config.searchQueries ?? [],
    };
  }

  return {
    ...config,
    ...scanMode,
    scanMode: {
      id: slug(scanMode.id || scanMode.label),
      label: scanMode.label || scanMode.id || "Selected scan mode",
      description: scanMode.description || "",
    },
    channels: scanMode.channels ?? config.channels ?? [],
    searchQueries: scanMode.searchQueries ?? config.searchQueries ?? [],
    minSuccessfulFeeds: scanMode.minSuccessfulFeeds ?? config.minSuccessfulFeeds,
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

function matchPost(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  const matchedKeywords = termsInText(text, positiveTerms);
  const communityPainMatches = termsInText(text, communityPainTerms);
  const buyingIntentMatches = termsInText(text, buyingIntentTerms);
  const negativeMatches = termsInText(text, negativeTerms);
  const hardNegativeMatches = termsInText(text, hardNegativeTerms);

  return {
    matchedKeywords,
    communityPainMatches,
    buyingIntentMatches,
    negativeMatches,
    hardNegativeMatches,
  };
}

function shouldKeepPost(post) {
  if (post.matchedKeywords.length === 0 && post.communityPainMatches.length === 0) return false;
  if (post.hardNegativeMatches.length > 0) return false;
  if (/\bfor hire\b/i.test(post.title)) return false;
  if (isRoleSeekerPost(post)) return false;
  if (isMarketResearchPost(post)) return false;
  if (post.negativeMatches.length > 0 && post.buyingIntentMatches.length === 0) {
    return false;
  }
  return hasRequestIntent(post);
}

function candidatePriority(post) {
  let priority = 0;
  priority += post.buyingIntentMatches.length * 8;
  priority += Math.min(post.matchedKeywords.length, 6) * 2;
  priority += Math.min(post.communityPainMatches.length, 5) * 4;
  if (hasExplicitPaidProject(post)) priority += 35;
  if (hasSpecificWorkflowPain(post)) priority += 20;
  if (hasBusinessContext(post)) priority += 10;
  if (post.sourceMode === "search") priority += 5;
  priority += Math.min(Number(post.commentCount || 0), 20) / 10;
  priority += Math.min(Number(post.redditScore || 0), 25) / 25;
  if (isAdviceOnlyPost(post)) priority -= 18;
  if (isSellerOrBuilderPost(post)) priority -= 30;
  if (isEmploymentPost(post)) priority -= 28;
  if (isRoleSeekerPost(post)) priority -= 45;
  if (isMarketResearchPost(post)) priority -= 32;
  if (!hasConsultingBuyerIntent(post)) priority -= 12;
  if (post.negativeMatches.length > 0) priority -= 12;
  return priority;
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
  let score = 2;
  if (post.matchedKeywords.length >= 2) score += 1;
  if (post.communityPainMatches.length > 0) score += 1;
  if (post.buyingIntentMatches.length > 0) score += 1;
  if (post.negativeMatches.length > 0) score -= 1;
  score = Math.max(1, Math.min(5, score));

  return {
    ...post,
    score,
    category: categorize(post),
    recommendedAction: score >= 5 ? "dm" : score >= 4 ? "comment" : "watch",
    scoreReason: `Matched ${[...post.matchedKeywords, ...post.communityPainMatches].join(", ")}${
      post.buyingIntentMatches.length
        ? ` with buying intent: ${post.buyingIntentMatches.join(", ")}`
        : ""
    }.`,
    suggestedComment: "",
    suggestedDm: "",
  };
}

async function scoreWithLlm(post, config, apiKey) {
  const input = {
    subreddit: post.subreddit,
    title: post.title,
    summary: post.summary.slice(0, 2000),
    publishedAt: post.publishedAt,
    url: post.url,
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
            "You score Reddit posts for a freelance AI automation consultant. Return strict JSON only. Do not use markdown. The consultant builds practical workflow automations, internal tools, CRM automations, reporting pipelines, document/PDF automation, lightweight intake systems, and recruiting or scheduling operations for small businesses. Be strict. Score 5 only when the post explicitly asks to hire/pay someone or describes a very specific implementation project with clear business stakes. Score 4 only for a specific recurring business workflow pain with likely buyer intent, e.g. messy CRM follow-up, manual spreadsheet/reporting/bookkeeping, client onboarding, applicant/recruiting follow-up, staff scheduling, lead routing, order/inventory workflows, PDFs/documents, customer intake, or data cleanup. Score 3 for advice/tool recommendation posts, public-reply opportunities, or workflow curiosity without clear buying intent. Score 1-2 for broad discussion, market research, networking, sellers, builders asking for feedback, agencies, course promoters, or vague AI curiosity. Do not score a post 4+ just because it mentions automation, AI, CRM, Zapier, Make, Airtable, Notion, or spreadsheets. If recommendedAction is ignore, score must be 1 or 2. Suggested replies must be brief, practical, and Reddit-native. Do not say 'I can help' unless the post clearly asks for paid help. Do not include a website URL in public comments. Do not overclaim platform-specific expertise.",
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
              recommendedAction: {
                type: "string",
                enum: ["ignore", "watch", "comment", "dm_if_engaged", "dm"],
              },
              scoreReason: { type: "string" },
              suggestedComment: { type: ["string", "null"] },
              suggestedDm: { type: ["string", "null"] },
            },
            required: [
              "score",
              "category",
              "recommendedAction",
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
  return normalizeLlmScore(post, parsed);
}

function extractResponseText(body) {
  if (typeof body.output_text === "string") return body.output_text;

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    ?.find((content) => content.type === "output_text")?.text;

  if (typeof text === "string") return text;
  throw new Error("OpenAI response did not include output text");
}

function normalizeLlmScore(post, parsed) {
  let score = Number.isInteger(parsed.score)
    ? Math.max(1, Math.min(5, parsed.score))
    : 1;
  const category = allowedCategories.has(parsed.category) ? parsed.category : "other";
  let recommendedAction = allowedActions.has(parsed.recommendedAction)
    ? parsed.recommendedAction
    : "watch";
  const scoreReason = String(parsed.scoreReason || "").trim();

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
  if (!hasSpecificWorkflowPain(post) && !hasExplicitPaidProject(post)) {
    score = Math.min(score, 3);
  }
  if (isBasicSpreadsheetHelp(post)) score = Math.min(score, 3);
  if (isGeneralHelpReason(scoreReason)) score = Math.min(score, 3);
  if (isSellerOrBuilderPost(post)) score = Math.min(score, 2);
  if (isRoleSeekerPost(post)) score = Math.min(score, 2);
  if (isEmploymentPost(post) && !hasConsultingBuyerIntent(post)) score = Math.min(score, 3);
  if (isMarketResearchPost(post)) score = Math.min(score, 3);
  if (!hasBestLeadSignal(post)) score = Math.min(score, 3);
  if (!hasConsultingBuyerIntent(post) && !hasExplicitPaidProject(post)) score = Math.min(score, 3);
  if (post.negativeMatches.length > 0) score = Math.min(score, 3);
  if (post.buyingIntentMatches.length === 0) score = Math.min(score, 4);
  if (recommendedAction === "ignore") score = Math.min(score, 2);
  if (recommendedAction === "watch") score = Math.min(score, 3);
  if (recommendedAction === "comment") score = Math.min(score, 4);
  if (isAdviceOnlyPost(post)) score = Math.min(score, 3);
  if (score <= 3 && ["dm", "dm_if_engaged"].includes(recommendedAction)) {
    recommendedAction = "watch";
  }

  return {
    ...post,
    score,
    category,
    recommendedAction,
    scoreReason,
    suggestedComment: parsed.suggestedComment ? String(parsed.suggestedComment).trim() : "",
    suggestedDm: parsed.suggestedDm ? String(parsed.suggestedDm).trim() : "",
  };
}

function buildDigest({ date, leads, rejectedCount, feedResults, config, scanMode, partialCoverage }) {
  const sorted = [...leads].sort((a, b) => b.score - a.score);
  const best = sorted.filter((lead) => lead.score >= 4);
  const maybe = sorted.filter((lead) => lead.score === 3);
  const feedErrors = feedResults.filter((result) => !result.ok);

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
    `- Recommended action: ${lead.recommendedAction}`,
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
  if (/(report|reporting|dashboard|board|investor|kpi|accounting)/i.test(text)) {
    return "reporting_automation";
  }
  if (/(pdf|document|invoice|receipt|ocr|scan|redact)/i.test(text)) {
    return "document_pdf_automation";
  }
  if (/(spreadsheet|excel|google sheets|airtable|internal tool)/i.test(text)) {
    return "spreadsheet_internal_tools";
  }
  return "other";
}

function hasRequestIntent(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /looking for|need help|recommend|recommendations|which .* use|anyone .* use|how do i|how do you|where do i start|seeking|paid help|paid opportunity|hire|consultant|freelancer|developer|build this|need someone|help setting up|open to paid help/.test(
    text,
  );
}

function hasExplicitPaidProject(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  if (isRoleSeekerPost(post) || isEmploymentPost(post)) return false;
  const explicitHire = /hire|paid help|open to paid help|need someone|need to hire|developer|freelancer/.test(
    text,
  );
  const projectWork = /build|develop|software|automation|automate|workflow|crm|pdf|report|spreadsheet|excel|internal tool|recruiting|staffing|scheduling|intake|applicants?|follow up|follow-up/.test(
    text,
  );
  return explicitHire && projectWork;
}

function hasSpecificWorkflowPain(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /manual|copy.?paste|spreadsheet|google sheets|excel|crm|follow[- ]?up|invoice|receipt|pdf|report|dashboard|bookkeeping|reconciliation|onboarding|offboarding|intake|form submissions?|lead routing|pipeline|inventory|orders?|fulfillment|client portal|data cleanup|api|zapier|make|n8n|airtable|notion|hubspot|pipedrive|zoho|quickbooks|xero|power bi|looker|data entry|every day|every week|every month|takes forever|too slow|mess|chaotic|stuck|can't figure|cant figure|desperate|job boards?|not bringing in anyone|need help finding|can't find|cant find|recruiting|staffing|applicants?|candidates?|screening|scheduling|busy season|missed calls?|customer messages?|quote requests?|buried in emails|can't keep track|cant keep track/.test(
    text,
  );
}

function hasBusinessContext(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /business|company|agency|client|customer|lead|sales|team|contractor|freelancer|employee|shopify|store|ecommerce|bookkeeping|accounting|real estate|realtor|msp|service business|consultancy|consulting|startup|founder|ops|operations|revenue|orders?|invoices?|prospects?|pipeline|warehouse|inventory|tickets?|staff|staffing|recruit|recruiting|applicants?|candidates?|nurses?|drivers?|dispatch|appointments?/.test(
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

function isAdviceOnlyPost(post) {
  if (hasExplicitPaidProject(post)) return false;
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
