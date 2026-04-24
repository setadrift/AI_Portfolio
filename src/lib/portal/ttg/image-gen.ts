/**
 * Generate a watercolor featured image via Google Gemini (Imagen 4) that matches
 * The Trauma Therapy Group's visual identity.
 */

const STYLE_LOCK =
  "Rendered as a delicate soft watercolor painting on cream paper with visible " +
  "watercolor texture, soft bleeding edges, and translucent layered washes. " +
  "The palette is muted and earthy throughout — only dusty rose, sage green, " +
  "soft cream, warm beige, terracotta, and gentle dusty blue, never saturated " +
  "or bright. Translucent overlapping organic shapes — circles, ovals, and " +
  "soft brush strokes — bleed into one another. Delicate ink-line botanical " +
  "accents are scattered throughout: thin leaves with visible veins, slender " +
  "stems, flowing tendrils. Any human form is rendered as a featureless " +
  "silhouette only — completely faceless with no eyes, no nose, no mouth, no " +
  "hair detail, no clothing detail; just an abstract solid-color shape " +
  "resembling a body. Semi-transparent, layered with botanical or geometric " +
  "elements behind and through them. The background is cream and off-white " +
  "with soft brush strokes radiating outward and generous negative space, " +
  "giving an ethereal and calm feeling. Wide horizontal composition with the " +
  "subject centered and surrounded by breathing room. The image is purely " +
  "visual — no text, no letters, no words, no labels, no captions, no " +
  "numbers, no writing of any kind anywhere on the canvas.";

function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY is not set");
  return k;
}

/**
 * Ask Gemini to write 4 distinct subject sentences for the post — different
 * compositions and symbolic angles, so the user has real variety to choose from
 * rather than four near-duplicates. The same locked style guide is appended to
 * each so they all feel like they belong on the same blog.
 */
export async function generateImagePromptVariants(input: {
  title: string;
  metaDescription: string;
  bodyExcerpt: string;
  count?: number;
}): Promise<string[]> {
  const count = input.count ?? 4;
  const instruction = `You write image prompts for a blog about trauma therapy. The blog has an established visual style: soft watercolor, muted earthy palette (dusty rose, sage green, cream, terracotta, dusty blue), translucent organic shapes, faceless human silhouettes, botanical accents.

For the post below, write ${count} DIFFERENT one-sentence subject descriptions. Each must depict a distinct symbolic composition — vary the focus (figure vs. botanical vs. abstract shapes), the pose, the framing, and the emotional angle so the four images give the reader real visual variety to choose from. Do not just rephrase the same idea four times.

Format your response as exactly ${count} lines, one sentence per line, separated by newlines. No numbering, no bullet points, no preamble, no markdown — just ${count} bare sentences ending in periods.

Example output for a post on healing through stillness:
A faceless silhouette curled inward with arms wrapped around the knees, surrounded by translucent overlapping circles in dusty rose and sage.
Two delicate ink-line botanical branches arching toward each other above empty cream space, with soft watercolor washes pooling beneath.
A semi-transparent faceless figure standing in profile with sage green tendrils trailing upward from the chest into open sky.
A loose grouping of overlapping translucent circles in terracotta and dusty blue floating across a wide cream field, with a single sketched leaf at the lower right.

Rules for every sentence:
- 20-35 words.
- Always describe figures as faceless silhouettes — never describe hair, eyes, mouth, clothing detail, or any specific facial or bodily feature.
- Do not include color codes, technical jargon, or section labels.
- End each sentence with a period; do not trail off with "and..." or a comma.
- Do not include any text or letters as part of the image.

POST:
Title: ${input.title}
Meta description: ${input.metaDescription}
Excerpt: ${input.bodyExcerpt.slice(0, 800)}`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.95, maxOutputTokens: 8000 },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini variant prompt generation failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!raw) throw new Error("Gemini returned empty variant prompts");
  const subjects = raw
    .split(/\r?\n+/)
    .map((s) => s.trim().replace(/^[-*\d.\s"']+/, "").replace(/["']$/, "").trim())
    .filter((s) => s.length > 10)
    .slice(0, count);
  if (subjects.length === 0) throw new Error("Could not parse any prompt variants");
  return subjects.map((s) => `${s} ${STYLE_LOCK}`);
}

/**
 * Ask Gemini to write a single-sentence subject description for the post.
 * The full Imagen prompt is that sentence plus the style guide.
 */
export async function generateImagePrompt(input: {
  title: string;
  metaDescription: string;
  bodyExcerpt: string;
}): Promise<string> {
  const instruction = `You write image prompts for a blog about trauma therapy. The blog has an established visual style: soft watercolor, muted earthy palette (dusty rose, sage green, cream, terracotta, dusty blue), translucent organic shapes, faceless human silhouettes, botanical accents.

For the post below, write ONE single COMPLETE sentence (20-30 words, ending in a period) describing a symbolic, abstract subject matter that fits the post's emotional theme.

Examples of correctly formed output:
- "A faceless silhouette curled inward with arms wrapped around the knees, surrounded by translucent overlapping circles in dusty rose and sage."
- "Two abstract semi-transparent figures with their forms gently overlapping at the chest, soft botanical tendrils weaving between them."
- "A semi-transparent faceless figure slowly dissolving into watercolor washes at the edges, surrounded by floating leaves."

Rules:
- Output ONLY the sentence. No preamble, no explanation, no quotes, no markdown.
- The sentence must end with a period — never trail off with "and..." or a comma.
- Always describe figures as faceless silhouettes — never describe hair, eyes, clothing, or any specific facial or bodily detail.
- Do not include color codes, technical jargon, or section labels.

POST:
Title: ${input.title}
Meta description: ${input.metaDescription}
Excerpt: ${input.bodyExcerpt.slice(0, 800)}`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini prompt generation failed: ${res.status} ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const subject: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!subject) {
    throw new Error("Gemini returned empty image prompt");
  }
  return `${subject} ${STYLE_LOCK}`;
}

/** Generate N images in parallel via Imagen 4. Order matches the input prompts. */
export async function generateImages(prompts: string[]): Promise<ArrayBuffer[]> {
  return Promise.all(prompts.map((p) => generateImage(p)));
}

/** Generate one image with Imagen 4. Returns raw PNG bytes. */
export async function generateImage(prompt: string): Promise<ArrayBuffer> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey(),
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          personGeneration: "allow_adult",
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen generation failed: ${res.status} ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const b64: string | undefined = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    throw new Error("Imagen returned no image bytes");
  }
  // Decode base64 → ArrayBuffer (Edge runtime: use atob)
  const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
