import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { promoteLead } from "@/lib/portal/admin/acquisition-db";
import type { OpportunityType } from "@/lib/portal/admin/acquisition";

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    sourceId?: string;
    leadKey?: string;
    opportunityType?: OpportunityType;
    nextAction?: string;
    nextActionDueAt?: string;
    primaryOfferId?: string | null;
  } | null;
  if (
    !body?.sourceId ||
    !body.leadKey ||
    !body.opportunityType ||
    !body.nextAction ||
    !body.nextActionDueAt
  ) {
    return NextResponse.json(
      {
        error:
          "Source, lead, opportunity type, next action, and due date are required.",
      },
      { status: 400 },
    );
  }
  const result = await promoteLead({
    sourceId: body.sourceId,
    leadKey: body.leadKey,
    opportunityType: body.opportunityType,
    nextAction: body.nextAction,
    nextActionDueAt: body.nextActionDueAt,
    primaryOfferId: body.primaryOfferId,
  });
  return NextResponse.json(
    result.ok
      ? { ok: true, opportunity: result.data }
      : { error: result.error },
    { status: result.ok ? 201 : (result.status ?? 500) },
  );
}
