/**
 * SEO field suggestions via Gemini — used to pre-fill the Yoast focus
 * keyphrase when a Google Doc doesn't have one written in.
 */

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY is not set");
  return k;
}

/**
 * Suggest a Yoast focus keyphrase for a post. The output is a 2-4 word
 * lowercase phrase, never a sentence. Falls back to a simple heuristic if
 * the Gemini call fails so we never block publish on a network hiccup.
 */
export async function suggestFocusKeyword(input: {
  title: string;
  metaDescription: string;
  bodyExcerpt: string;
}): Promise<string> {
  const prompt = `You pick Yoast SEO focus keyphrases for trauma therapy blog posts.

Given the post below, return a single focus keyphrase — 2 to 4 lowercase words, no punctuation, no quotes, no trailing period. The keyphrase should be something a prospective client would plausibly type into Google to find this content.

Good examples: "trauma-based anxiety", "childhood trauma signs", "emdr therapy vancouver", "complex ptsd symptoms"
Bad examples: "Trauma" (too broad), "Anxiety is rooted in trauma and needs therapy" (too long), "the nervous system" (not a search term)

Output ONLY the keyphrase on a single line. No preamble, no explanation.

POST:
Title: ${input.title}
Meta description: ${input.metaDescription}
Excerpt: ${input.bodyExcerpt.slice(0, 800)}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const cleaned = raw
      .split(/\r?\n/)[0]
      .replace(/^[-*\s"']+|[\s"'.,]+$/g, "")
      .toLowerCase()
      .trim();
    if (cleaned && cleaned.split(/\s+/).length <= 6 && cleaned.length <= 60) {
      return cleaned;
    }
  } catch {
    // fall through to heuristic
  }
  // Heuristic fallback: first 2-4 words of the title minus common stopwords
  return fallbackKeyword(input.title);
}

function fallbackKeyword(title: string): string {
  const stop = new Set([
    "a", "an", "the", "is", "are", "and", "or", "of", "to", "for", "in",
    "on", "at", "it", "as", "but", "if", "be", "by", "your", "you", "my",
    "how", "what", "why", "when", "not", "this", "that", "its",
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w));
  return words.slice(0, 3).join(" ") || title.toLowerCase().slice(0, 40);
}
