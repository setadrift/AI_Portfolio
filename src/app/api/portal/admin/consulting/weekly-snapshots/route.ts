import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { saveWeeklySnapshot } from "@/lib/portal/admin/acquisition-db";

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    weekStart?: string;
    metrics?: Record<string, unknown>;
    lesson?: string;
  } | null;
  if (!body?.weekStart || !body.metrics)
    return NextResponse.json(
      { error: "Week start and metrics are required." },
      { status: 400 },
    );
  const result = await saveWeeklySnapshot({
    weekStart: body.weekStart,
    metrics: body.metrics,
    lesson: body.lesson || "",
  });
  return NextResponse.json(
    result.ok ? { ok: true, snapshot: result.data } : { error: result.error },
    { status: result.ok ? 200 : (result.status ?? 500) },
  );
}
