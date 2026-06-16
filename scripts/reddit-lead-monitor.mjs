import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const CONFIG_PATH = "config/reddit-lead-monitor.json";
const OUTPUT_DIR = "outputs/reddit-leads";
const STATUS_PATH = path.join(OUTPUT_DIR, "latest-status.json");
const USER_AGENT =
  "DuncanAndersonLeadMonitor/0.1 (manual lead review; https://duncananderson.ca)";

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
  "internal tool",
];

const buyingIntentTerms = [
  "hire",
  "hire someone",
  "need to hire",
  "need to hire someone",
  "paid help",
  "open to paid help",
  "consultant",
  "freelancer",
  "developer",
  "build this",
  "build this for me",
  "need someone",
  "need to automate",
  "automate it",
  "where do i start",
  "help setting up",
  "looking for help",
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
];

const allowedCategories = new Set([
  "crm_lead_followup",
  "reporting_automation",
  "document_pdf_automation",
  "spreadsheet_internal_tools",
  "other",
]);

const allowedActions = new Set(["ignore", "watch", "comment", "dm_if_engaged", "dm"]);

async function main() {
  const config = await loadConfig();
  const env = await loadDotEnv(".env.local");
  const outputDate = localDate();
  const maxAgeMs = (config.maxAgeHours ?? 48) * 60 * 60 * 1000;
  const now = Date.now();

  const feedResults = [];
  const posts = [];

  const feeds = limitFeeds(config.feeds ?? []);
  for (const [index, feed] of feeds.entries()) {
    const result = await fetchFeed(feed);
    feedResults.push(result);
    if (result.ok) posts.push(...parseFeed(result.body, feed));
    if (index < feeds.length - 1) {
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
    .slice(0, config.maxLlmCandidates ?? 25);

  const scored = await scorePosts(filtered, config, env.OPENAI_API_KEY);
  const successfulFeeds = feedResults.filter((result) => result.ok).length;
  const minSuccessfulFeeds = Math.min(
    config.minSuccessfulFeeds ?? Math.min(3, feeds.length),
    feeds.length,
  );
  const hasLeads = scored.length > 0;
  const hasEnoughCoverage = successfulFeeds >= minSuccessfulFeeds;
  const shouldWriteDigest = hasEnoughCoverage || hasLeads;
  const partialCoverage = shouldWriteDigest && !hasEnoughCoverage;
  const digest = buildDigest({
    date: outputDate,
    leads: scored,
    rejectedCount: freshPosts.length - filtered.length,
    feedResults,
    config,
    partialCoverage,
  });

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${outputDate}.md`);
  await writeStatus({
    ok: shouldWriteDigest,
    generatedAt: new Date().toISOString(),
    successfulFeeds,
    totalFeeds: feedResults.length,
    fetchedPosts: posts.length,
    candidatesScored: filtered.length,
    leadsIncluded: scored.length,
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

async function fetchFeed(feedUrl) {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
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
      };
    }

    return { ok: true, url: feedUrl, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      url: feedUrl,
      status: "network_error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function limitFeeds(feeds) {
  const match = process.env.REDDIT_FEED_MATCH;
  const matchedFeeds = match
    ? feeds.filter((feed) => feed.toLowerCase().includes(match.toLowerCase()))
    : feeds;

  const rawLimit = process.env.REDDIT_FEED_LIMIT;
  if (!rawLimit) return matchedFeeds;

  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(limit) || limit <= 0) return matchedFeeds;
  return matchedFeeds.slice(0, limit);
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
  const buyingIntentMatches = termsInText(text, buyingIntentTerms);
  const negativeMatches = termsInText(text, negativeTerms);
  const hardNegativeMatches = termsInText(text, hardNegativeTerms);

  return { matchedKeywords, buyingIntentMatches, negativeMatches, hardNegativeMatches };
}

function shouldKeepPost(post) {
  if (post.matchedKeywords.length === 0) return false;
  if (post.hardNegativeMatches.length > 0) return false;
  if (/\bfor hire\b/i.test(post.title)) return false;
  if (post.negativeMatches.length > 0 && post.buyingIntentMatches.length === 0) {
    return false;
  }
  return hasRequestIntent(post);
}

async function scorePosts(posts, config, apiKey) {
  if (!config.useLlm || !apiKey) {
    return posts.map(scoreDeterministically).filter((lead) => lead.score >= config.minScore);
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

  return scored.filter((lead) => lead.score >= config.minScore);
}

function scoreDeterministically(post) {
  let score = 2;
  if (post.matchedKeywords.length >= 2) score += 1;
  if (post.buyingIntentMatches.length > 0) score += 1;
  if (post.negativeMatches.length > 0) score -= 1;
  score = Math.max(1, Math.min(5, score));

  return {
    ...post,
    score,
    category: categorize(post),
    recommendedAction: score >= 5 ? "dm" : score >= 4 ? "comment" : "watch",
    scoreReason: `Matched ${post.matchedKeywords.join(", ")}${
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
            "You score Reddit posts for a freelance AI automation consultant. Return strict JSON only. Do not use markdown. The consultant builds practical workflow automations, internal tools, CRM automations, reporting pipelines, and document/PDF automation for small businesses. Be strict. Score 5 only when the post explicitly asks to hire/pay someone or describes a very specific implementation project. Score 4 for a specific recurring business workflow pain with likely buyer intent. Score 3 for advice/tool recommendation posts. Score 1-2 for broad discussion, market research, networking, sellers, agencies, course promoters, or vague AI curiosity. If recommendedAction is ignore, score must be 1 or 2. Suggested replies must be brief, practical, and Reddit-native. Do not say 'I can help' unless the post clearly asks for paid help. Do not include a website URL in public comments. Do not overclaim platform-specific expertise.",
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
  const recommendedAction = allowedActions.has(parsed.recommendedAction)
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
  if (isBasicSpreadsheetHelp(post)) score = Math.min(score, 3);
  if (isGeneralHelpReason(scoreReason)) score = Math.min(score, 3);
  if (post.negativeMatches.length > 0) score = Math.min(score, 3);
  if (post.buyingIntentMatches.length === 0) score = Math.min(score, 4);
  if (recommendedAction === "ignore") score = Math.min(score, 2);
  if (recommendedAction === "watch") score = Math.min(score, 3);

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

function buildDigest({ date, leads, rejectedCount, feedResults, config, partialCoverage }) {
  const sorted = [...leads].sort((a, b) => b.score - a.score);
  const best = sorted.filter((lead) => lead.score >= 4);
  const maybe = sorted.filter((lead) => lead.score === 3);
  const feedErrors = feedResults.filter((result) => !result.ok);

  return [
    `# Reddit Lead Digest - ${date}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Feeds checked: ${feedResults.length}`,
    `Candidates included: ${sorted.length}`,
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

function categorize(post) {
  const text = `${post.title}\n${post.summary}`.toLowerCase();
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
  const explicitHire = /hire|paid help|open to paid help|need someone|need to hire|developer|freelancer/.test(
    text,
  );
  const projectWork = /build|develop|software|automation|automate|workflow|crm|pdf|report|spreadsheet|excel|internal tool/.test(
    text,
  );
  return explicitHire && projectWork;
}

function isBasicSpreadsheetHelp(post) {
  if (post.buyingIntentMatches.length > 0) return false;
  const text = `${post.title}\n${post.summary}`.toLowerCase();
  return /\b(line graph|chart|formula|vlookup|xlookup|pivot table|conditional formatting)\b/.test(
    text,
  );
}

function isGeneralHelpReason(scoreReason) {
  return /general help|general request|does not show specific workflow pain|does not indicate specific workflow|does not indicate specific business workflow|does not request paid help|no clear buying intent|no clear indication of buying intent|no specific workflow pain/.test(
    scoreReason.toLowerCase(),
  );
}

function dedupePosts(posts) {
  const seen = new Set();
  return posts.filter((post) => {
    const key = post.url || `${post.subreddit}:${post.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
