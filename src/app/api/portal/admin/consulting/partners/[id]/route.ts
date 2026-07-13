import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/portal/admin/admin-auth";
import { updatePartner } from "@/lib/portal/admin/acquisition-db";
import type { ConsultingPartnerRecord } from "@/lib/portal/admin/acquisition";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await hasAdminSession()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request
    .json()
    .catch(() => null)) as Partial<ConsultingPartnerRecord> | null;
  if (!body)
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  const result = await updatePartner(id, body);
  return NextResponse.json(
    result.ok ? { ok: true, partner: result.data } : { error: result.error },
    { status: result.ok ? 200 : (result.status ?? 500) },
  );
}
