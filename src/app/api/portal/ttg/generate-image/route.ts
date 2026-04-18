import { NextRequest, NextResponse } from "next/server";
import { generateImagePrompt, generateImage } from "@/lib/portal/ttg/image-gen";
import { htmlToPlainText } from "@/lib/portal/ttg/html-cleaner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        title?: string;
        metaDescription?: string;
        contentHtml?: string;
        promptOverride?: string;
      }
    | null;
  if (!body?.title || !body?.contentHtml) {
    return NextResponse.json({ error: "Missing 'title' or 'contentHtml'" }, { status: 400 });
  }

  let prompt = body.promptOverride;
  try {
    if (!prompt) {
      prompt = await generateImagePrompt({
        title: body.title,
        metaDescription: body.metaDescription ?? "",
        bodyExcerpt: htmlToPlainText(body.contentHtml),
      });
    }
    const bytes = await generateImage(prompt);
    // Return base64 so the client can show preview & re-submit on confirm
    const b64 = bufferToBase64(bytes);
    return NextResponse.json({ prompt, imageBase64: b64, mime: "image/png" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 502 },
    );
  }
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
