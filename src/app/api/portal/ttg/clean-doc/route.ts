import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleDocAsHtml, extractDocId } from "@/lib/portal/ttg/google-doc";
import {
  cleanGoogleDocsHtml,
  htmlToPlainText,
  parseGoogleDoc,
} from "@/lib/portal/ttg/html-cleaner";
import { suggestFocusKeyword } from "@/lib/portal/ttg/seo-suggest";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url) {
    return NextResponse.json({ error: "Missing 'url'" }, { status: 400 });
  }
  const docId = extractDocId(body.url);
  if (!docId) {
    return NextResponse.json(
      { error: "Doesn't look like a Google Doc URL." },
      { status: 400 },
    );
  }

  let raw: string;
  try {
    raw = await fetchGoogleDocAsHtml(body.url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch doc" },
      { status: 502 },
    );
  }

  const cleaned = cleanGoogleDocsHtml(raw);
  const parsed = parseGoogleDoc(cleaned);

  // Suggest a Yoast focus keyphrase up-front so the user doesn't have to think
  // about it. Falls back to a title-based heuristic if the Gemini call fails.
  const focusKeyword = await suggestFocusKeyword({
    title: parsed.title,
    metaDescription: parsed.metaDescription || parsed.excerpt,
    bodyExcerpt: htmlToPlainText(parsed.contentHtml),
  });

  return NextResponse.json({
    docId,
    title: parsed.title,
    metaDescription: parsed.metaDescription,
    keywordLine: parsed.keywordLine,
    focusKeyword,
    contentHtml: parsed.contentHtml,
    intro: parsed.intro,
    sections: parsed.sections,
    excerpt: parsed.excerpt,
  });
}
