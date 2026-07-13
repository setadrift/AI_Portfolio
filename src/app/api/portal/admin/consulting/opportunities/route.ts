import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import {
  createOpportunity,
  readAcquisitionData,
} from "@/lib/portal/admin/acquisition-db";
import type { ConsultingOpportunityRecord } from "@/lib/portal/admin/acquisition";

export const runtime = "nodejs";

export async function GET() {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await readAcquisitionData();
  return NextResponse.json({ opportunities: data.opportunities });
}

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request
    .json()
    .catch(() => null)) as Partial<ConsultingOpportunityRecord> | null;
  if (!body)
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  const result = await createOpportunity(body);
  return NextResponse.json(
    result.ok
      ? { ok: true, opportunity: result.data }
      : { error: result.error },
    { status: result.ok ? 201 : (result.status ?? 500) },
  );
}
