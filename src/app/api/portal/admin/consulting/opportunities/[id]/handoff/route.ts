import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { handoffWonOpportunity } from "@/lib/portal/admin/acquisition-db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    projectName?: string;
    nextAction?: string;
    targetDate?: string | null;
  } | null;
  if (!body?.projectName || !body.nextAction)
    return NextResponse.json(
      { error: "Project name and next action are required." },
      { status: 400 },
    );
  const { id } = await params;
  const result = await handoffWonOpportunity(id, {
    projectName: body.projectName,
    nextAction: body.nextAction,
    targetDate: body.targetDate,
  });
  return NextResponse.json(
    result.ok ? { ok: true, project: result.data } : { error: result.error },
    { status: result.ok ? 201 : (result.status ?? 500) },
  );
}
