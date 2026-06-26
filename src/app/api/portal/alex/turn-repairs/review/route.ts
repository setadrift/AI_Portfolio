import { NextRequest } from "next/server";
import { GET as getReviewItems, PATCH as patchReviewItem } from "../review-items/route";

export const runtime = "nodejs";
export const maxDuration = 30;

export function GET() {
  return getReviewItems();
}

export function PATCH(req: NextRequest) {
  return patchReviewItem(req);
}
