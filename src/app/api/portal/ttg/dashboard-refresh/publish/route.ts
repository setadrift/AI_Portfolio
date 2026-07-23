import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { verifyRefreshStage } from "@/lib/portal/ttg/refresh-stage";
import { publishStagedRefresh } from "@/lib/portal/ttg/ttg-reporting-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { token?: string; acknowledgeWarnings?: boolean };
    if (!body.token) return NextResponse.json({ error: "Review the files again before publishing." }, { status: 400 });
    const stage = await verifyRefreshStage(body.token);
    if (stage.preparedBy !== auth.session.sub) return NextResponse.json({ error: "This preview belongs to another portal session. Review the files again." }, { status: 403 });
    const result = await publishStagedRefresh(stage, auth.session.sub, Boolean(body.acknowledgeWarnings));
    revalidateTag("ttg-dashboard", "max");
    revalidatePath("/portal/ttg/dashboard");
    return NextResponse.json(result);
  } catch (error) {
    console.error("TTG dashboard refresh publish failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish this refresh." }, { status: 400 });
  }
}
