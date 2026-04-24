import { NextRequest, NextResponse } from "next/server";
import { loadWpConfig, uploadMedia, createDraftPost } from "@/lib/portal/ttg/wp-client";
import { buildElementorData } from "@/lib/portal/ttg/elementor-builder";
import { splitIntoSections } from "@/lib/portal/ttg/html-cleaner";
import { processFeaturedImage } from "@/lib/portal/ttg/image-process";

export const runtime = "nodejs";
export const maxDuration = 60;

const TTG_BLOG_CATEGORY_ID = 25;

export interface CreateDraftRequest {
  title: string;
  contentHtml: string;
  excerpt?: string;
  metaDescription?: string;
  focusKeyword?: string;
  seoTitle?: string;
  seoKeywordsLine?: string;
  ctaText?: string;
  ctaUrl?: string;
  /** Base64-encoded image bytes. May already be the compressed WebP returned
   *  from /generate-image, or raw PNG bytes from a hand-uploaded source. */
  imageBase64: string;
  /** MIME type of imageBase64 (e.g. "image/webp"). If "image/webp" we skip the
   *  resize+compress step since /generate-image already did that. */
  imageMime?: string;
  imageAlt?: string;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CreateDraftRequest | null;
  if (!body?.title || !body?.contentHtml || !body?.imageBase64) {
    return NextResponse.json(
      { error: "Missing required fields: title, contentHtml, imageBase64" },
      { status: 400 },
    );
  }

  let cfg;
  try {
    cfg = loadWpConfig();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "WP config error" },
      { status: 500 },
    );
  }

  const altText = body.imageAlt ?? `Watercolor illustration for: ${body.title}`;
  const baseSlug = `${Date.now()}-${slugify(body.title)}`;
  const inputBytes = base64ToArrayBuffer(body.imageBase64);

  // /generate-image already compresses to WebP at 1200px. Only re-process if
  // the caller hands us something else (raw PNG, JPEG upload, etc.).
  let uploadBytes: ArrayBuffer;
  let uploadFilename: string;
  let uploadContentType: string;
  if (body.imageMime === "image/webp") {
    uploadBytes = inputBytes;
    uploadFilename = `${baseSlug}.webp`;
    uploadContentType = "image/webp";
  } else {
    try {
      const processed = await processFeaturedImage(inputBytes, baseSlug);
      uploadBytes = processed.bytes;
      uploadFilename = processed.filename;
      uploadContentType = processed.contentType;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Image processing failed" },
        { status: 500 },
      );
    }
  }

  let media;
  try {
    media = await uploadMedia(
      cfg,
      uploadBytes,
      uploadFilename,
      altText,
      body.title,
      uploadContentType,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image upload failed" },
      { status: 502 },
    );
  }

  // Build Elementor structure
  const { intro, sections } = splitIntoSections(body.contentHtml);
  const meta = body.metaDescription ?? body.excerpt ?? "";
  let metaWidgetHtml = `<p><span style="font-weight: 400;">${meta}</span></p>`;
  if (body.seoKeywordsLine) {
    metaWidgetHtml += `<p><i><span style="font-weight: 400;">${body.seoKeywordsLine}</span></i></p>`;
  }
  const elementorData = buildElementorData({
    metaDescriptionHtml: metaWidgetHtml,
    introHtml: intro,
    sections,
    imageUrl: media.source_url,
    imageId: media.id,
    imageAlt: altText,
    ctaText: body.ctaText,
    ctaUrl: body.ctaUrl,
  });

  let draft;
  try {
    draft = await createDraftPost(cfg, {
      title: body.title,
      contentHtml: body.contentHtml,
      excerpt: body.excerpt ?? "",
      featuredMediaId: media.id,
      categories: [TTG_BLOG_CATEGORY_ID],
      yoastMetaDescription: meta,
      yoastFocusKeyword: body.focusKeyword,
      yoastSeoTitle: body.seoTitle,
      elementorData,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Draft creation failed", mediaId: media.id },
      { status: 502 },
    );
  }

  const editUrl = `${cfg.baseUrl}/wp-admin/post.php?post=${draft.id}&action=edit`;
  return NextResponse.json({
    postId: draft.id,
    mediaId: media.id,
    imageUrl: media.source_url,
    editUrl,
    previewUrl: draft.link,
  });
}
