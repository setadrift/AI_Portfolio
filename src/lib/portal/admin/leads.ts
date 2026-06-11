import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DIGEST_DIR = path.join(process.cwd(), "outputs", "reddit-leads");

export interface RedditLead {
  score: string;
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

export async function readLatestLeadDigest(): Promise<LeadDigest | null> {
  try {
    const files = (await readdir(DIGEST_DIR))
      .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
      .sort()
      .reverse();

    const fileName = files[0];
    if (!fileName) return null;

    const markdown = await readFile(path.join(DIGEST_DIR, fileName), "utf8");
    return parseDigest(fileName, markdown);
  } catch {
    return null;
  }
}

function parseDigest(fileName: string, markdown: string): LeadDigest {
  return {
    fileName,
    generatedAt: metadataValue(markdown, "Generated"),
    feedsChecked: metadataValue(markdown, "Feeds checked"),
    candidatesIncluded: metadataValue(markdown, "Candidates included"),
    rejectedCount: metadataValue(markdown, "Filtered/rejected before digest"),
    feedErrors: parseFeedErrors(markdown),
    leads: parseLeads(markdown),
  };
}

function parseLeads(markdown: string): RedditLead[] {
  const blocks = markdown.split(/\n(?=### \d\/5 - r\/)/g);
  return blocks
    .filter((block) => block.startsWith("### "))
    .map((block) => {
      const heading = block.match(/^### ([1-5]\/5) - r\/([^ ]+) - (.+)$/m);

      return {
        score: heading?.[1] ?? "",
        subreddit: heading?.[2] ?? "",
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

function parseFeedErrors(markdown: string) {
  const section = markdown.split("## Feed Errors")[1] ?? "";
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
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
