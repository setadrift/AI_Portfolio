import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { createActivity } from "@/lib/portal/admin/acquisition-db";
import type { ConsultingActivityRecord } from "@/lib/portal/admin/acquisition";

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request
    .json()
    .catch(() => null)) as Partial<ConsultingActivityRecord> | null;
  if (!body)
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  const result = await createActivity(body);
  return NextResponse.json(
    result.ok ? { ok: true, activity: result.data } : { error: result.error },
    { status: result.ok ? 201 : (result.status ?? 500) },
  );
}
