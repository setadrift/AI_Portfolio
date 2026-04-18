/**
 * Convert raw Google Docs HTML export into clean, minimal blog HTML.
 *
 * Google Docs exports almost everything as <p> tags — even when the writer uses
 * Heading styles. So we layer a heuristic pass on top to promote paragraphs that
 * look like headings into proper <h2>/<h3> tags.
 */

const ZWJ = "\u200B";

const META_PREFIX_RE = /^\s*(?:<[^>]+>\s*)*meta\s*description\s*:\s*/i;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C");
}

function unwrapGoogleRedirects(html: string): string {
  return html.replace(
    /href="https?:\/\/www\.google\.com\/url\?q=([^&"]+)[^"]*"/g,
    (_m, encoded) => {
      try {
        return `href="${decodeURIComponent(encoded)}"`;
      } catch {
        return `href="${encoded}"`;
      }
    },
  );
}

function stripStyleAttrs(html: string): string {
  return html
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+id="[^"]*"/g, "");
}

function stripGoogleSpans(html: string): string {
  let prev: string;
  let curr = html;
  do {
    prev = curr;
    curr = curr.replace(/<span\s*>([\s\S]*?)<\/span>/g, "$1");
  } while (curr !== prev);
  return curr;
}

function collapseEmptyParagraphs(html: string): string {
  return html
    .replace(/<p\s*>\s*<\/p>/g, "")
    .replace(/<p\s*>\s*<br\s*\/?>\s*<\/p>/g, "")
    .replace(/(\r?\n){3,}/g, "\n\n");
}

function trimContent(html: string): string {
  return html.trim().replace(/[\u200B\uFEFF]/g, ZWJ).replace(new RegExp(ZWJ, "g"), "");
}

/**
 * First pass: strip Google Docs cruft. Returns clean but un-structured HTML.
 */
export function cleanGoogleDocsHtml(rawHtml: string): string {
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let html = bodyMatch ? bodyMatch[1] : rawHtml;
  html = unwrapGoogleRedirects(html);
  html = stripStyleAttrs(html);
  html = stripGoogleSpans(html);
  html = collapseEmptyParagraphs(html);
  html = decodeHtmlEntities(html);
  html = trimContent(html);
  return html;
}

interface Block {
  /** Raw outer HTML, e.g. "<p>...</p>" */
  outer: string;
  /** Inner HTML content, e.g. "..." */
  inner: string;
  /** Plain-text version of inner */
  text: string;
  /** Tag name lowercased */
  tag: string;
}

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(p|h[1-6]|ol|ul|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const inner = m[2];
    const text = inner.replace(/<[^>]+>/g, "").trim();
    blocks.push({ outer: m[0], inner, text, tag });
  }
  return blocks;
}

function isHeadingLike(b: Block): "h3" | "h2" | null {
  if (b.tag !== "p") return null;
  const t = b.text;
  if (!t) return null;
  // Numbered sub-items like "1. Foo" or "10. Bar" → H3
  if (/^\d{1,2}\.\s+\S/.test(t) && t.length < 200) return "h3";
  // Questions (FAQ items) → H3
  if (t.endsWith("?") && t.length < 200) return "h3";
  // Short paragraphs without sentence-ending punctuation → H2 candidate
  if (
    t.length < 120 &&
    !/[.!,;:]$/.test(t) &&
    !/^https?:\/\//.test(t) &&
    !t.includes("|") // pipe-separated keyword lines aren't headings
  ) {
    return "h2";
  }
  return null;
}

const CROSS_POST_MARKERS = [
  /write[- ]?up\s+for\s+cross[- ]?post/i,
  /cross[- ]?post/i,
  /linkedin\s+and\s+facebook/i,
];

function isCrossPostStart(b: Block): boolean {
  return CROSS_POST_MARKERS.some((rx) => rx.test(b.text));
}

export interface ParsedDoc {
  title: string;
  metaDescription: string;
  keywordLine: string;
  /** HTML body with proper <h2>/<h3>/<p> structure, cross-post section removed. */
  contentHtml: string;
  /** HTML before the first <h2>. */
  intro: string;
  /** Each H2 section. */
  sections: { title: string; body: string }[];
  excerpt: string;
}

/**
 * Parse a cleaned Google Docs HTML body into the structured pieces a TTG blog
 * post needs. Handles the convention that:
 *   - The first paragraph is the title
 *   - "Meta description: ..." is on its own line
 *   - The keyword tag line uses pipe separators
 *   - "Write-up for Cross-post" marks the end of the blog body
 *   - Heading 2s appear as short standalone paragraphs without trailing punctuation
 *   - Numbered or question-mark paragraphs are H3 sub-items
 */
export function parseGoogleDoc(cleanedBodyHtml: string): ParsedDoc {
  const blocks = parseBlocks(cleanedBodyHtml);
  let title = "";
  let metaDescription = "";
  let keywordLine = "";
  const bodyBlocks: Block[] = [];

  let i = 0;
  // Title: first non-empty <p>
  while (i < blocks.length && !blocks[i].text) i++;
  if (i < blocks.length && blocks[i].tag === "p") {
    title = blocks[i].text;
    i++;
  }
  // Optional meta description and keyword line
  for (; i < blocks.length && (!metaDescription || !keywordLine); i++) {
    const b = blocks[i];
    if (!b.text) continue;
    if (!metaDescription && META_PREFIX_RE.test(b.inner)) {
      metaDescription = b.inner.replace(META_PREFIX_RE, "").replace(/<[^>]+>/g, "").trim();
      continue;
    }
    if (!keywordLine && b.tag === "p" && (b.text.match(/\|/g) || []).length >= 2 && b.text.length < 280) {
      keywordLine = b.text;
      continue;
    }
    // Anything else means we've already moved past the metadata block
    break;
  }
  // Now collect body blocks until we hit the cross-post section
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (isCrossPostStart(b)) break;
    bodyBlocks.push(b);
  }

  // Promote heading-like paragraphs
  const promoted: Block[] = bodyBlocks.map((b) => {
    const lvl = isHeadingLike(b);
    if (!lvl) return b;
    return {
      outer: `<${lvl}>${b.text}</${lvl}>`,
      inner: b.text,
      text: b.text,
      tag: lvl,
    };
  });

  const contentHtml = promoted.map((b) => b.outer).join("\n\n");

  // Split into intro + H2 sections
  const intro: string[] = [];
  const sections: { title: string; body: string }[] = [];
  let current: { title: string; bodyParts: string[] } | null = null;
  for (const b of promoted) {
    if (b.tag === "h2") {
      if (current) sections.push({ title: current.title, body: current.bodyParts.join("\n\n") });
      current = { title: b.text, bodyParts: [] };
      continue;
    }
    if (current) current.bodyParts.push(b.outer);
    else intro.push(b.outer);
  }
  if (current) sections.push({ title: current.title, body: current.bodyParts.join("\n\n") });

  const introHtml = intro.join("\n\n");
  const excerpt = (metaDescription || htmlToPlainText(introHtml)).slice(0, 280);

  return {
    title: title || "Untitled post",
    metaDescription,
    keywordLine,
    contentHtml,
    intro: introHtml,
    sections,
    excerpt,
  };
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Legacy helpers kept for backwards compat with anything still importing them.
export function extractTitle(html: string): { title: string | null; rest: string } {
  const parsed = parseGoogleDoc(html);
  return { title: parsed.title === "Untitled post" ? null : parsed.title, rest: parsed.contentHtml };
}

export function splitIntoSections(html: string): {
  intro: string;
  sections: { title: string; body: string }[];
} {
  // For already-structured HTML, just split on <h2>.
  const parts = html.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const intro = (parts[0] ?? "").trim();
  const sections: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].replace(/<[^>]+>/g, "").trim();
    const body = (parts[i + 1] ?? "").trim();
    sections.push({ title, body });
  }
  return { intro, sections };
}
