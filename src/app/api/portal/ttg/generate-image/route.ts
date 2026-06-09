import { NextRequest, NextResponse } from "next/server";
import {
  ImageGenerationRateLimitError,
  generateImagePromptVariants,
  generateImages,
} from "@/lib/portal/ttg/image-gen";
import { htmlToPlainText } from "@/lib/portal/ttg/html-cleaner";
import { processFeaturedImage } from "@/lib/portal/ttg/image-process";

export const runtime = "nodejs";
export const maxDuration = 60;

const VARIANT_COUNT = 4;

interface GenerateImageRequest {
  title?: string;
  metaDescription?: string;
  contentHtml?: string;
}

interface ImageVariant {
  prompt: string;
  imageBase64: string;
  mime: string;
  byteLength: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as GenerateImageRequest | null;
  if (!body?.title || !body?.contentHtml) {
    return NextResponse.json(
      { error: "Missing 'title' or 'contentHtml'" },
      { status: 400 },
    );
  }

  let prompts: string[];
  try {
    prompts = await generateImagePromptVariants({
      title: body.title,
      metaDescription: body.metaDescription ?? "",
      bodyExcerpt: htmlToPlainText(body.contentHtml),
      count: VARIANT_COUNT,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prompt generation failed" },
      { status: 502 },
    );
  }

  let rawImages: ArrayBuffer[];
  try {
    rawImages = await generateImages(prompts);
  } catch (err) {
    if (err instanceof ImageGenerationRateLimitError) {
      return NextResponse.json(
        {
          error:
            "Image generation is temporarily rate limited by Google. Please wait a few minutes and try again.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Image generation failed. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  // Compress each to WebP server-side so the response stays small (~60KB × 4
  // ≈ 240KB instead of ~4MB raw). The client gets selection-ready bytes that
  // we can pass straight through to WordPress later.
  const variants: ImageVariant[] = await Promise.all(
    rawImages.map(async (raw, i) => {
      const processed = await processFeaturedImage(raw, `variant-${i}`);
      return {
        prompt: prompts[i],
        imageBase64: bufferToBase64(processed.bytes),
        mime: processed.contentType,
        byteLength: processed.byteLength,
      };
    }),
  );

  return NextResponse.json({ variants });
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
