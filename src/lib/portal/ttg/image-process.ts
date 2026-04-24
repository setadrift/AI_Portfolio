/**
 * Compress + resize a generated featured image so we don't ship a 1MB+ PNG to
 * the WordPress media library. Output is WebP, matching the format Gabby's
 * existing blog images use.
 */

import sharp from "sharp";

export interface ProcessedImage {
  bytes: ArrayBuffer;
  filename: string;
  contentType: string;
  width: number;
  height: number;
  byteLength: number;
}

const TARGET_WIDTH = 1200; // matches the size of existing featured images
const WEBP_QUALITY = 82;

export async function processFeaturedImage(
  inputBytes: ArrayBuffer,
  baseSlug: string,
): Promise<ProcessedImage> {
  const inputBuffer = Buffer.from(inputBytes);
  const pipeline = sharp(inputBuffer).resize({
    width: TARGET_WIDTH,
    withoutEnlargement: true,
    fit: "inside",
  });
  const outBuffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
  const meta = await sharp(outBuffer).metadata();

  const filename = `${baseSlug}.webp`;
  // Buffer extends Uint8Array; copy to a fresh ArrayBuffer with no offset
  const arr = new Uint8Array(outBuffer.byteLength);
  arr.set(outBuffer);
  return {
    bytes: arr.buffer,
    filename,
    contentType: "image/webp",
    width: meta.width ?? TARGET_WIDTH,
    height: meta.height ?? 0,
    byteLength: outBuffer.byteLength,
  };
}
