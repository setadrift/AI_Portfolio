import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { linkProofAsset } from "@/lib/portal/admin/acquisition-db";

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    assetId?: string;
    opportunityId?: string;
    notes?: string;
  } | null;
  if (!body?.assetId || !body.opportunityId)
    return NextResponse.json(
      { error: "Asset and opportunity are required." },
      { status: 400 },
    );
  const result = await linkProofAsset({
    assetId: body.assetId,
    opportunityId: body.opportunityId,
    notes: body.notes,
  });
  return NextResponse.json(
    result.ok ? { ok: true, use: result.data } : { error: result.error },
    { status: result.ok ? 201 : (result.status ?? 500) },
  );
}
