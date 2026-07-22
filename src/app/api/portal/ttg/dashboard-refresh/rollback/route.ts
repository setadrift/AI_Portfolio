import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { rollbackRefresh } from "@/lib/portal/ttg/google-sheets-refresh";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { refreshId?: string; confirmation?: string };
    if (!body.refreshId || body.confirmation !== "RESTORE") return NextResponse.json({ error: "Confirm the restore before continuing." }, { status: 400 });
    const result = await rollbackRefresh(body.refreshId, auth.session.sub);
    revalidateTag("ttg-dashboard", "max");
    revalidatePath("/portal/ttg/dashboard");
    return NextResponse.json(result);
  } catch (error) {
    console.error("TTG dashboard rollback failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not restore that refresh." }, { status: 400 });
  }
}
