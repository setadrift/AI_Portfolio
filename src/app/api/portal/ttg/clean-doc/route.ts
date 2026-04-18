import { NextRequest, NextResponse } from "next/server";
import { fetchGoogleDocAsHtml, extractDocId } from "@/lib/portal/ttg/google-doc";
import { cleanGoogleDocsHtml, parseGoogleDoc } from "@/lib/portal/ttg/html-cleaner";

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

  return NextResponse.json({
    docId,
    title: parsed.title,
    metaDescription: parsed.metaDescription,
    keywordLine: parsed.keywordLine,
    contentHtml: parsed.contentHtml,
    intro: parsed.intro,
    sections: parsed.sections,
    excerpt: parsed.excerpt,
  });
}
