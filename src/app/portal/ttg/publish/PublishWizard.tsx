"use client";

import { useState } from "react";

type Stage = "input" | "review" | "image" | "publishing" | "done";

interface CleanedDoc {
  docId: string;
  title: string;
  metaDescription: string;
  keywordLine: string;
  contentHtml: string;
  intro: string;
  sections: { title: string; body: string }[];
  excerpt: string;
}

interface ImageVariant {
  prompt: string;
  imageBase64: string;
  mime: string;
  byteLength: number;
}

interface DraftResult {
  postId: number;
  mediaId: number;
  imageUrl: string;
  editUrl: string;
  previewUrl: string;
}

const DEFAULT_CTA_TEXT = "Book a Free Consultation";
const DEFAULT_CTA_URL = "https://traumatherapygroup.janeapp.com/#/free-consultation";

export default function PublishWizard() {
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState("");
  const [cleaned, setCleaned] = useState<CleanedDoc | null>(null);

  // Editable fields after cleaning
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [seoKeywordsLine, setSeoKeywordsLine] = useState("");
  const [ctaText, setCtaText] = useState(DEFAULT_CTA_TEXT);
  const [ctaUrl, setCtaUrl] = useState(DEFAULT_CTA_URL);

  const [variants, setVariants] = useState<ImageVariant[] | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [draft, setDraft] = useState<DraftResult | null>(null);

  const selectedVariant = variants && selectedVariantIdx !== null ? variants[selectedVariantIdx] : null;

  async function handleFetchDoc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("review");
    try {
      const res = await fetch("/api/portal/ttg/clean-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: docUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: CleanedDoc = await res.json();
      setCleaned(data);
      setTitle(data.title);
      setMetaDescription(data.metaDescription || data.excerpt);
      setSeoKeywordsLine(data.keywordLine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch doc");
      setStage("input");
    }
  }

  async function handleGenerateImage() {
    if (!cleaned) return;
    setError(null);
    setImageBusy(true);
    setVariants(null);
    setSelectedVariantIdx(null);
    setStage("image");
    try {
      const res = await fetch("/api/portal/ttg/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          metaDescription,
          contentHtml: cleaned.contentHtml,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: { variants: ImageVariant[] } = await res.json();
      setVariants(data.variants);
      // Auto-select the first variant so users can hit publish without an extra
      // click if they're happy with what came back.
      if (data.variants.length > 0) setSelectedVariantIdx(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setImageBusy(false);
    }
  }

  async function handlePublish() {
    if (!cleaned || !selectedVariant) return;
    setError(null);
    setStage("publishing");
    try {
      const res = await fetch("/api/portal/ttg/create-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentHtml: cleaned.contentHtml,
          excerpt: cleaned.excerpt,
          metaDescription,
          focusKeyword,
          seoKeywordsLine,
          ctaText,
          ctaUrl,
          imageBase64: selectedVariant.imageBase64,
          imageMime: selectedVariant.mime,
          imageAlt: `Watercolor illustration for: ${title}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: DraftResult = await res.json();
      setDraft(data);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft creation failed");
      setStage("image");
    }
  }

  function handleStartOver() {
    setStage("input");
    setError(null);
    setDocUrl("");
    setCleaned(null);
    setTitle("");
    setMetaDescription("");
    setFocusKeyword("");
    setSeoKeywordsLine("");
    setCtaText(DEFAULT_CTA_TEXT);
    setCtaUrl(DEFAULT_CTA_URL);
    setVariants(null);
    setSelectedVariantIdx(null);
    setDraft(null);
  }

  return (
    <div className="space-y-8">
      <Stepper stage={stage} />

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <strong>Something went wrong:</strong> {error}
        </div>
      )}

      {stage === "input" && (
        <form onSubmit={handleFetchDoc} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Google Doc link</span>
            <input
              type="url"
              required
              placeholder="https://docs.google.com/document/d/.../edit"
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <span className="text-xs text-cream-muted mt-1.5 block">
              The doc must be shared as &quot;Anyone with the link can view&quot;.
            </span>
          </label>
          <button
            type="submit"
            className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-colors"
          >
            Continue →
          </button>
        </form>
      )}

      {stage === "review" && !cleaned && (
        <div className="text-cream-muted">Reading your Google Doc…</div>
      )}

      {(stage === "review" || stage === "image" || stage === "publishing") && cleaned && (
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="font-display text-2xl">Review &amp; SEO</h2>

            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </Field>

            <Field
              label="Meta description"
              hint="What appears under your title in Google search and at the top of the post."
            >
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Focus keyword (Yoast)">
                <input
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="e.g. trauma-based anxiety"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </Field>
              <Field label="Keyword tag line (italic, below meta)">
                <input
                  value={seoKeywordsLine}
                  onChange={(e) => setSeoKeywordsLine(e.target.value)}
                  placeholder="Trauma therapy Vancouver | EMDR therapy | …"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="CTA button text">
                <input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </Field>
              <Field label="CTA button link">
                <input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </Field>
            </div>

            <details className="border border-border rounded-lg bg-surface-elevated">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
                Preview cleaned content ({cleaned.sections.length} sections)
              </summary>
              <div
                className="px-4 py-3 prose prose-sm max-w-none border-t border-border"
                dangerouslySetInnerHTML={{ __html: cleaned.contentHtml }}
              />
            </details>
          </section>

          <section className="space-y-4 pt-2 border-t border-border">
            <div>
              <h2 className="font-display text-2xl">Featured image</h2>
              {variants && (
                <p className="text-sm text-cream-muted mt-1">
                  Pick the one that fits the post — the highlighted image is the one we&apos;ll
                  use when you create the draft.
                </p>
              )}
            </div>
            {!variants && !imageBusy && (
              <button
                type="button"
                onClick={handleGenerateImage}
                className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-colors"
              >
                Generate 4 image options
              </button>
            )}
            {imageBusy && (
              <div className="flex items-center gap-3 text-cream-muted">
                <Spinner /> Generating 4 watercolor variations (this takes about 10–20 seconds)…
              </div>
            )}
            {variants && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variants.map((v, i) => {
                    const selected = i === selectedVariantIdx;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedVariantIdx(i)}
                        aria-pressed={selected}
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all bg-surface-elevated text-left ${
                          selected
                            ? "border-accent ring-2 ring-accent/30 shadow-md"
                            : "border-border hover:border-cream-muted"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:${v.mime};base64,${v.imageBase64}`}
                          alt={`Featured image option ${i + 1}`}
                          className="w-full h-auto block"
                        />
                        <div
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            selected
                              ? "bg-accent text-white"
                              : "bg-white/90 text-cream-muted group-hover:bg-white"
                          }`}
                        >
                          {selected ? "✓ Selected" : `Option ${i + 1}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={imageBusy}
                  className="text-sm text-cream-muted hover:text-foreground underline disabled:opacity-50"
                >
                  Generate 4 new options
                </button>
              </div>
            )}
          </section>

          {selectedVariant && stage !== "publishing" && (
            <section className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={handlePublish}
                className="w-full sm:w-auto bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors"
              >
                Create WordPress draft →
              </button>
              <p className="text-xs text-cream-muted mt-2">
                The post will be created as a <strong>draft</strong>, not published. You&apos;ll
                review and hit Publish in WordPress.
              </p>
            </section>
          )}

          {stage === "publishing" && (
            <div className="flex items-center gap-3 text-cream-muted pt-2 border-t border-border">
              <Spinner /> Uploading image and creating WordPress draft…
            </div>
          )}
        </div>
      )}

      {stage === "done" && draft && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h2 className="font-display text-2xl mb-2">Draft created.</h2>
            <p className="text-cream-muted mb-4">
              Your post is sitting in the WordPress drafts list. Open it, review, and hit Publish
              when you&apos;re ready.
            </p>
            <a
              href={draft.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-colors"
            >
              Open draft in WordPress →
            </a>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-3">
            <p>
              <strong>Two manual paste steps in the Yoast SEO panel.</strong> The keyword tag line
              is already in the post body — you don&apos;t need to do anything with it.
            </p>
            {focusKeyword && (
              <div>
                <div className="text-xs uppercase tracking-wide text-amber-900/70 mb-1">
                  1. Paste into Yoast → <em>Focus keyphrase</em>
                </div>
                <code className="block bg-white border border-amber-200 rounded px-2 py-1 text-xs">
                  {focusKeyword}
                </code>
              </div>
            )}
            {metaDescription && (
              <div>
                <div className="text-xs uppercase tracking-wide text-amber-900/70 mb-1">
                  2. Paste into Yoast → <em>Search appearance → Meta description</em>
                </div>
                <code className="block bg-white border border-amber-200 rounded px-2 py-1 text-xs whitespace-pre-wrap break-words">
                  {metaDescription}
                </code>
              </div>
            )}
            <p className="text-xs text-cream-muted pt-1">
              Both fields drive the Google search snippet preview and Yoast&apos;s SEO scoring.
              They aren&apos;t auto-saved because Yoast doesn&apos;t expose them to the WordPress
              REST API by default.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartOver}
            className="text-sm text-cream-muted hover:text-foreground underline"
          >
            ← Publish another post
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-xs text-cream-muted mt-1 block">{hint}</span>}
    </label>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Stepper({ stage }: { stage: Stage }) {
  const steps: { key: Stage; label: string }[] = [
    { key: "input", label: "Paste link" },
    { key: "review", label: "Review & SEO" },
    { key: "image", label: "Featured image" },
    { key: "publishing", label: "Publish" },
    { key: "done", label: "Done" },
  ];
  const order: Stage[] = ["input", "review", "image", "publishing", "done"];
  const currentIdx = order.indexOf(stage);
  return (
    <ol className="flex items-center gap-2 text-xs text-cream-muted">
      {steps.map((s, i) => {
        const reached = order.indexOf(s.key) <= currentIdx;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full border ${
                reached ? "bg-accent text-white border-accent" : "border-border"
              }`}
            >
              {i + 1}
            </span>
            <span className={reached ? "text-foreground" : ""}>{s.label}</span>
            {i < steps.length - 1 && <span className="mx-1">·</span>}
          </li>
        );
      })}
    </ol>
  );
}
