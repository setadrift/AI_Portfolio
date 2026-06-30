import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

const REDDIT_DIGEST_DIR = outputDir("REDDIT_LEAD_OUTPUT_DIR", "outputs/reddit-leads");
const AUTOMATION_DIGEST_DIR = outputDir("AUTOMATION_LEAD_OUTPUT_DIR", "outputs/ai-consulting-leads");
const PUBLISHED_DIGEST_PATH = "admin/leads/latest.json";
const PUBLISHED_AUTOMATION_DIGEST_PATH = "admin/leads/automation/latest.json";
const AUTOMATION_LEAD_MAX_AGE_DAYS = 7;
const AUTOMATION_LEAD_MAX_AGE_MS = AUTOMATION_LEAD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export interface RedditLead {
  score: string;
  source: string;
  sourceLabel: string;
  sourceKind: LeadSourceId;
  sourceDate: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  category: string;
  recommendedAction: string;
  reason: string;
  suggestedComment: string;
  suggestedDm: string;
}

export interface LeadDigest {
  fileName: string;
  generatedAt: string;
  feedsChecked: string;
  candidatesIncluded: string;
  rejectedCount: string;
  feedErrors: string[];
  leads: RedditLead[];
}

export type LeadSourceId = "reddit" | "automation";

export interface LeadSourceDigest {
  id: LeadSourceId;
  label: string;
  description: string;
  digest: LeadDigest | null;
  status: LeadRunStatus | null;
}

export interface LeadRunStatus {
  ok: boolean;
  generatedAt: string;
  successfulFeeds: number;
  totalFeeds: number;
  ingestionMode?: "oauth" | "rss";
  scanMode?: string;
  fetchedPosts: number;
  candidatesScored: number;
  leadsIncluded: number;
  outputPath: string;
  message: string;
  feedErrors: Array<{
    url: string;
    status: string | number;
    error: string;
  }>;
}

export interface LeadDashboardData {
  digest: LeadDigest | null;
  status: LeadRunStatus | null;
  sources: LeadSourceDigest[];
  channels: LeadChannel[];
  scanModes: LeadScanMode[];
}

export interface LeadChannel {
  id: string;
  label: string;
  subreddit: string;
  feed?: string;
}

export interface LeadScanMode {
  id: string;
  label: string;
  description: string;
}

export async function readLeadDashboardData(): Promise<LeadDashboardData> {
  const [
    publishedSources,
    publishedAutomationSource,
    localRedditDigest,
    localAutomationDigest,
    localStatus,
    channels,
    scanModes,
  ] = await Promise.all([
    readPublishedLeadSources(),
    readPublishedAutomationSource(),
    readLatestLocalRedditDigest(),
    readLocalAutomationLeadDigest(),
    readLatestLocalRunStatus(),
    readLeadChannels(),
    readLeadScanModes(),
  ]);

  const redditSource = publishedSources.find((source) => source.id === "reddit") ?? {
    id: "reddit" as const,
    label: "Reddit monitor",
    description: "Leads from the configured Reddit scan.",
    digest: localRedditDigest,
    status: localStatus,
  };
  const automationSource = publishedAutomationSource ?? publishedSources.find((source) => source.id === "automation") ?? {
    id: "automation" as const,
    label: "Codex automation",
    description: "Broader public-web leads from the AI consulting research automation.",
    digest: localAutomationDigest,
    status: null,
  };
  const sources = [redditSource, automationSource];
  const digest = redditSource.digest ?? localRedditDigest;
  const status = redditSource.status ?? localStatus;

  return { digest, status, sources, channels, scanModes };
}

export async function readLeadChannels(): Promise<LeadChannel[]> {
  try {
    const configPath = path.join(process.cwd(), "config", "reddit-lead-monitor.json");
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw) as {
      channels?: Array<{ id?: string; label?: string; subreddit?: string; feed?: string; url?: string }>;
      feeds?: string[];
    };

    if (config.channels?.length) {
      return config.channels
        .map((channel) => {
          const feed = channel.feed ?? channel.url;
          const subreddit = channel.subreddit ?? feed?.match(/\/r\/([^/]+)/i)?.[1] ?? "";
          return {
            id: slug(channel.id ?? subreddit),
            label: channel.label ?? `r/${subreddit}`,
            subreddit,
            feed,
          };
        })
        .filter((channel) => channel.subreddit);
    }

    return (config.feeds ?? []).map((feed) => {
      const subreddit = feed.match(/\/r\/([^/]+)/i)?.[1] ?? feed;
      return {
        id: slug(subreddit),
        label: `r/${subreddit}`,
        subreddit,
        feed,
      };
    });
  } catch {
    return [];
  }
}

export async function readLeadScanModes(): Promise<LeadScanMode[]> {
  try {
    const configPath = path.join(process.cwd(), "config", "reddit-lead-monitor.json");
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw) as {
      scanModes?: Array<{ id?: string; label?: string; description?: string }>;
      channels?: Array<{ id?: string; label?: string; subreddit?: string }>;
    };

    if (config.scanModes?.length) {
      return config.scanModes
        .map((mode) => ({
          id: slug(mode.id ?? mode.label ?? ""),
          label: mode.label ?? mode.id ?? "Scan mode",
          description: mode.description ?? "",
        }))
        .filter((mode) => mode.id);
    }

    return [
      {
        id: "legacy-config",
        label: "Legacy configured scan",
        description: "Runs the channels and search queries defined at the top level of the Reddit lead monitor config.",
      },
    ];
  } catch {
    return [];
  }
}

interface PublishedLeadDigest {
  fileName: string;
  markdown: string;
  status: LeadRunStatus | null;
}

interface PublishedLeadSource {
  id: LeadSourceId;
  label: string;
  description: string;
  fileName: string;
  markdown: string;
  status: LeadRunStatus | null;
}

interface PublishedLeadBundle {
  sources?: PublishedLeadSource[];
  fileName?: string;
  markdown?: string;
  status?: LeadRunStatus | null;
}

export async function publishLeadDigest(payload: PublishedLeadDigest) {
  await put(PUBLISHED_DIGEST_PATH, JSON.stringify(payload, null, 2), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function publishLatestLeadDigest(outputDir = REDDIT_DIGEST_DIR) {
  const status = await readRunStatus(outputDir);
  const digestPath = await findLatestDigestPath(outputDir, status?.outputPath);
  const fileName = path.basename(digestPath);
  const markdown = await readFile(digestPath, "utf8");
  const existingAutomationSource = await readPublishedAutomationSource();

  await put(
    PUBLISHED_DIGEST_PATH,
    JSON.stringify(
      {
        sources: [
          {
            id: "reddit",
            label: "Reddit monitor",
            description: "Leads from the configured Reddit scan.",
            fileName,
            markdown,
            status,
          },
          {
            id: "automation",
            label: "Codex automation",
            description: "Broader public-web leads from the AI consulting research automation.",
            fileName: existingAutomationSource?.digest?.fileName ?? "codex-automation-leads.md",
            markdown: existingAutomationSource?.markdown ?? emptyAutomationMarkdown(),
            status: existingAutomationSource?.status ?? null,
          },
        ],
      },
      null,
      2,
    ),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    },
  );

  return `Published ${fileName} to Vercel Blob at ${PUBLISHED_DIGEST_PATH}`;
}

export async function publishLatestAutomationLeadDigest(outputDir = AUTOMATION_DIGEST_DIR) {
  const status = await readRunStatus(outputDir);
  const { fileName, markdown } = await buildAggregateAutomationMarkdown(outputDir);
  const payload: PublishedLeadSource = {
    id: "automation",
    label: "Codex automation",
    description: "Broader public-web leads from the AI consulting research automation.",
    fileName,
    markdown,
    status: aggregateAutomationStatus(status, markdown),
  };

  await put(PUBLISHED_AUTOMATION_DIGEST_PATH, JSON.stringify(payload, null, 2), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  return `Published ${fileName} to Vercel Blob at ${PUBLISHED_AUTOMATION_DIGEST_PATH}`;
}

async function readPublishedLeadSources(): Promise<LeadSourceDigest[]> {
  try {
    const result = await get(PUBLISHED_DIGEST_PATH, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return [];

    const raw = await streamToText(result.stream);
    const payload = JSON.parse(raw) as PublishedLeadBundle;
    const publishedSources = payload.sources?.length
      ? payload.sources
      : payload.fileName && payload.markdown
        ? [
            {
              id: "reddit" as const,
              label: "Reddit monitor",
              description: "Leads from the configured Reddit scan.",
              fileName: payload.fileName,
              markdown: payload.markdown,
              status: payload.status ?? null,
            },
          ]
        : [];

    return publishedSources
      .map((source) => ({
        id: source.id,
        label: source.label,
        description: source.description,
        digest: parseDigest(source.fileName, source.markdown, source.id),
        status: source.status ?? null,
      }))
      .filter((source) => isUsableDigest(source.digest));
  } catch {
    return [];
  }
}

async function readPublishedAutomationSource(): Promise<(LeadSourceDigest & { markdown: string }) | null> {
  const dedicatedSource = await readPublishedLeadSource(PUBLISHED_AUTOMATION_DIGEST_PATH);
  if (dedicatedSource) return dedicatedSource;

  try {
    const result = await get(PUBLISHED_DIGEST_PATH, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;

    const raw = await streamToText(result.stream);
    const payload = JSON.parse(raw) as PublishedLeadBundle;
    const source = payload.sources?.find((item) => item.id === "automation") ?? null;
    if (!source) return null;

    return {
      id: source.id,
      label: source.label,
      description: source.description,
      digest: parseDigest(source.fileName, source.markdown, source.id),
      markdown: source.markdown,
      status: source.status ?? null,
    };
  } catch {
    return null;
  }
}

export async function readLatestLeadDigest(): Promise<LeadDigest | null> {
  return (await readPublishedLeadSources()).find((source) => source.id === "reddit")?.digest ?? readLatestLocalRedditDigest();
}

async function readLatestLocalRedditDigest(): Promise<LeadDigest | null> {
  try {
    const status = await readLatestLocalRunStatus();
    if (status?.outputPath) {
      try {
        const fileName = path.basename(status.outputPath);
        const markdown = await readFile(status.outputPath, "utf8");
        const digest = parseDigest(fileName, markdown, "reddit");
        if (isUsableDigest(digest)) return digest;
      } catch {
        // Fall through to latest dated digest.
      }
    }

    const files = (await readdir(REDDIT_DIGEST_DIR))
      .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
      .sort()
      .reverse();

    for (const fileName of files) {
      const markdown = await readFile(path.join(REDDIT_DIGEST_DIR, fileName), "utf8");
      const digest = parseDigest(fileName, markdown, "reddit");
      if (isUsableDigest(digest)) return digest;
    }

    return null;
  } catch {
    return null;
  }
}

async function readLocalAutomationLeadDigest(): Promise<LeadDigest | null> {
  try {
    const { fileName, markdown } = await buildAggregateAutomationMarkdown(AUTOMATION_DIGEST_DIR);
    const digest = parseDigest(fileName, markdown, "automation");
    return isUsableDigest(digest) ? digest : null;
  } catch {
    return null;
  }
}

async function readLatestLocalRunStatus(): Promise<LeadRunStatus | null> {
  return readRunStatus(REDDIT_DIGEST_DIR);
}

async function readRunStatus(outputDir: string): Promise<LeadRunStatus | null> {
  try {
    const raw = await readFile(path.join(outputDir, "latest-status.json"), "utf8");
    return JSON.parse(raw) as LeadRunStatus;
  } catch {
    return null;
  }
}

async function findLatestDigestPath(outputDir: string, statusOutputPath?: string) {
  if (statusOutputPath) {
    try {
      await readFile(statusOutputPath, "utf8");
      return statusOutputPath;
    } catch {
      // Fall through to latest dated digest.
    }
  }

  const files = (await readdir(outputDir))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort()
    .reverse();

  if (!files[0]) {
    throw new Error(`No dated digest found in ${outputDir}`);
  }

  return path.join(outputDir, files[0]);
}

function emptyAutomationMarkdown() {
  return [
    "# Codex Automation Lead Digest",
    "",
    `Generated: ${new Date().toISOString()}`,
    "Feeds checked: 0",
    "Candidates included: 0",
    "Filtered/rejected before digest: 0",
    "Minimum score: 4",
    "Partial coverage: no",
    "",
    "## Best Leads",
    "",
    "No automation digest has been published yet.",
    "",
    "## Feed Errors",
    "",
    "No feed errors.",
    "",
  ].join("\n");
}

async function buildAggregateAutomationMarkdown(outputDir: string) {
  const files = (await readdir(outputDir))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort();

  if (!files.length) {
    throw new Error(`No dated automation digest found in ${outputDir}`);
  }

  const blocks: Array<{ block: string; dedupeKey: string; sourceDate: string }> = [];
  let generatedAt = "";
  let feedsChecked = 0;
  let rejectedCount = 0;
  const feedErrors: string[] = [];
  const newestAllowedDate = new Date();

  for (const file of [...files].reverse()) {
    const markdown = await readFile(path.join(outputDir, file), "utf8");
    generatedAt ||= metadataValue(markdown, "Generated");
    feedsChecked += numberValue(markdown, "Feeds checked");
    rejectedCount += numberValue(markdown, "Filtered/rejected before digest");
    feedErrors.push(...parseFeedErrorsWithSource(markdown, file));
    for (const block of leadBlocks(markdown)) {
      const explicitSourceDate = leadSourceDate(block);
      const displaySourceDate = explicitSourceDate || dateFromFileName(file);
      const normalized = withSourceDate(block.trim(), displaySourceDate);
      blocks.push({
        block: normalized,
        dedupeKey: leadDedupeKey(normalized),
        sourceDate: explicitSourceDate,
      });
    }
  }

  const filteredBlocks = dedupeLeadBlocks(
    blocks.filter((entry) => isRecentLeadDate(entry.sourceDate, newestAllowedDate)),
  );
  rejectedCount += blocks.length - filteredBlocks.length;

  return {
    fileName: "codex-automation-leads.md",
    markdown: [
      "# Codex Automation Lead Digest",
      "",
      `Generated: ${generatedAt || new Date().toISOString()}`,
      `Feeds checked: ${feedsChecked || files.length}`,
      `Candidates included: ${filteredBlocks.length}`,
      `Filtered/rejected before digest: ${rejectedCount}`,
      "Minimum score: 4",
      `Maximum lead age: ${AUTOMATION_LEAD_MAX_AGE_DAYS} days`,
      "Partial coverage: no",
      "",
      "## Best Leads",
      "",
      filteredBlocks.length ? filteredBlocks.map((entry) => entry.block).join("\n\n") : "No leads found.",
      "",
      "## Feed Errors",
      "",
      feedErrors.length ? feedErrors.join("\n") : "No feed errors.",
      "",
    ].join("\n"),
  };
}

function aggregateAutomationStatus(status: LeadRunStatus | null, markdown: string): LeadRunStatus | null {
  if (!status) return null;

  return {
    ...status,
    leadsIncluded: numberValue(markdown, "Candidates included"),
    outputPath: "codex-automation-leads.md",
    message: "Published aggregate Codex automation lead digest.",
  };
}

function leadBlocks(markdown: string) {
  return markdown
    .split(/\n(?=### [1-5]\/5 - )/g)
    .filter((block) => block.startsWith("### "))
    .map((block) => block.split(/\n(?=## )/)[0]?.trim() ?? "")
    .filter(Boolean);
}

function leadSourceDate(block: string) {
  return bulletValue(block, "Source date");
}

function withSourceDate(block: string, sourceDate: string) {
  if (/^- Source date: /m.test(block)) return block;
  const lines = block.split("\n");
  const insertAt = lines.findIndex((line, index) => index > 0 && line.startsWith("- "));
  if (insertAt === -1) {
    return `${lines[0]}\n- Source date: ${sourceDate}\n${lines.slice(1).join("\n")}`.trim();
  }
  lines.splice(insertAt, 0, `- Source date: ${sourceDate}`);
  return lines.join("\n");
}

function dedupeLeadBlocks(blocks: Array<{ block: string; dedupeKey: string; sourceDate: string }>) {
  const seen = new Set<string>();
  const deduped: Array<{ block: string; dedupeKey: string; sourceDate: string }> = [];
  for (const block of blocks) {
    if (seen.has(block.dedupeKey)) continue;
    seen.add(block.dedupeKey);
    deduped.push(block);
  }
  return deduped;
}

function leadDedupeKey(block: string) {
  const url = bulletValue(block, "URL");
  if (url) return `url:${normalizeLeadUrl(url)}`;

  const heading = block.match(/^### [1-5]\/5 - (.+?) - (.+)$/m);
  const source = heading?.[1] ?? "";
  const title = heading?.[2] ?? block.split("\n")[0] ?? "";
  return `title:${normalizeComparable(`${source} ${title}`)}`;
}

function normalizeLeadUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/g, "");
    return parsed.toString().toLowerCase();
  } catch {
    return normalizeComparable(url);
  }
}

function normalizeComparable(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isRecentLeadDate(sourceDate: string, now = new Date()) {
  const parsed = parseLeadDate(sourceDate);
  if (!parsed) return false;
  const ageMs = startOfUtcDay(now).getTime() - parsed.getTime();
  return ageMs >= 0 && ageMs <= AUTOMATION_LEAD_MAX_AGE_MS;
}

function parseLeadDate(value: string) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const parsed = new Date(`${match[0]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function numberValue(markdown: string, label: string) {
  const parsed = Number.parseInt(metadataValue(markdown, label) || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFeedErrorsWithSource(markdown: string, fileName: string) {
  return parseFeedErrors(markdown).map((error) => `- ${fileName}: ${error}`);
}

async function readPublishedLeadSource(pathname: string): Promise<(LeadSourceDigest & { markdown: string }) | null> {
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) return null;

    const raw = await streamToText(result.stream);
    const source = JSON.parse(raw) as PublishedLeadSource;
    return {
      id: source.id,
      label: source.label,
      description: source.description,
      digest: parseDigest(source.fileName, source.markdown, source.id),
      markdown: source.markdown,
      status: source.status ?? null,
    };
  } catch {
    return null;
  }
}

function parseDigest(fileName: string, markdown: string, sourceKind: LeadSourceId): LeadDigest {
  const leads = parseLeads(markdown, sourceKind, dateFromFileName(fileName));
  const normalizedLeads = sourceKind === "automation" ? normalizeAutomationLeads(leads) : leads;
  return {
    fileName,
    generatedAt: metadataValue(markdown, "Generated"),
    feedsChecked: metadataValue(markdown, "Feeds checked"),
    candidatesIncluded:
      sourceKind === "automation"
        ? normalizedLeads.length.toString()
        : metadataValue(markdown, "Candidates included"),
    rejectedCount: metadataValue(markdown, "Filtered/rejected before digest"),
    feedErrors: parseFeedErrors(markdown),
    leads: normalizedLeads,
  };
}

function parseLeads(markdown: string, sourceKind: LeadSourceId, sourceDate: string): RedditLead[] {
  const blocks = markdown.split(/\n(?=### [1-5]\/5 - )/g);
  return blocks
    .filter((block) => block.startsWith("### "))
    .map((block) => block.split(/\n(?=## )/)[0]?.trim() ?? "")
    .map((block) => {
      const heading = block.match(/^### ([1-5]\/5) - (.+?) - (.+)$/m);
      const sourceLabel = heading?.[2]?.trim() ?? "";
      const subreddit = sourceLabel.replace(/^r\//i, "");

      return {
        score: heading?.[1] ?? "",
        source: sourceLabel,
        sourceLabel,
        sourceKind,
        sourceDate: bulletValue(block, "Source date") || sourceDate,
        subreddit,
        title: heading?.[3] ?? "Untitled lead",
        url: bulletValue(block, "URL"),
        author: bulletValue(block, "Author"),
        category: bulletValue(block, "Category"),
        recommendedAction: bulletValue(block, "Recommended action"),
        reason: bulletValue(block, "Why it matched"),
        suggestedComment: sectionQuote(block, "Suggested comment"),
        suggestedDm: sectionQuote(block, "Suggested DM"),
      };
    });
}

function normalizeAutomationLeads(leads: RedditLead[]) {
  const seen = new Set<string>();
  const normalized: RedditLead[] = [];

  for (const lead of [...leads].sort((a, b) => b.sourceDate.localeCompare(a.sourceDate))) {
    if (!isRecentLeadDate(lead.sourceDate)) continue;
    const dedupeKey = parsedLeadDedupeKey(lead);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(lead);
  }

  return normalized;
}

function parsedLeadDedupeKey(lead: RedditLead) {
  if (lead.url) return `url:${normalizeLeadUrl(lead.url)}`;
  return `title:${normalizeComparable(`${lead.sourceLabel} ${lead.title}`)}`;
}

function parseFeedErrors(markdown: string) {
  const section = markdown.split("## Feed Errors")[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

function isUsableDigest(digest: LeadDigest) {
  const feedsChecked = Number.parseInt(digest.feedsChecked || "0", 10);
  const candidatesIncluded = Number.parseInt(digest.candidatesIncluded || "0", 10);
  const errorCount = digest.feedErrors.length;

  if (candidatesIncluded > 0) return true;
  if (feedsChecked === 0) return false;
  return errorCount < Math.ceil(feedsChecked / 2);
}

function dateFromFileName(fileName: string) {
  return fileName.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
}

function metadataValue(markdown: string, label: string) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(label)}: (.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function bulletValue(block: string, label: string) {
  const match = block.match(new RegExp(`^- ${escapeRegExp(label)}: (.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function sectionQuote(block: string, label: string) {
  const section = block.split(`${label}:\n\n`)[1]?.split("\n\n")[0] ?? "";
  return section
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function outputDir(envName: string, fallback: string) {
  const value = process.env[envName] || fallback;
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
