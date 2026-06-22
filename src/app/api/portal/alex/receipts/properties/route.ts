import { NextRequest, NextResponse } from "next/server";
import { requireAlexPortalSession } from "@/lib/portal/alex/auth";
import {
  findBestPropertyMatch,
  listSandboxProperties,
} from "@/lib/portal/alex/airtable-review-queue";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = await requireAlexPortalSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const propertyText = searchParams.get("property");
    const contextText = searchParams.get("context") ?? "";
    const properties = await listSandboxProperties();
    const suggestedProperty = findBestPropertyMatch(properties, propertyText, contextText);

    return NextResponse.json({
      properties,
      suggestedPropertyId: suggestedProperty?.id ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sandbox properties could not be loaded." },
      { status: 500 },
    );
  }
}
