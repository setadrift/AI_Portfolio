import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import { signContractorShareScope } from "@/lib/portal/alex/contractor-share-access";
import {
  buildContractorSharePreview,
  listTurnRepairRecords,
} from "@/lib/portal/alex/turn-repairs";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const property = stringField(body.property);
    const contractor = stringField(body.contractor);
    const excludedIds = stringArray(body.excludedIds);
    const records = await listTurnRepairRecords();
    const preview = buildContractorSharePreview({
      records,
      property,
      contractor,
      excludedIds,
    });
    const shareToken = await signContractorShareScope({ property, contractor, excludedIds });
    const shareUrl = new URL("/alex-turn-repairs-share", req.nextUrl.origin);
    shareUrl.searchParams.set("shareToken", shareToken);

    return NextResponse.json({
      body: preview.body,
      records: preview.records,
      itemCount: preview.itemCount,
      shareUrl: shareUrl.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Contractor share preview could not be generated." },
      { status: 500 },
    );
  }
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
