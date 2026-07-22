import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { publishRefresh } from "@/lib/portal/ttg/google-sheets-refresh";
import { verifyRefreshStage } from "@/lib/portal/ttg/refresh-stage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as { token?: string; acknowledgeWarnings?: boolean };
    if (!body.token) return NextResponse.json({ error: "Review the files again before publishing." }, { status: 400 });
    const stage = await verifyRefreshStage(body.token);
    if (stage.preparedBy !== auth.session.sub) return NextResponse.json({ error: "This preview belongs to another portal session. Review the files again." }, { status: 403 });
    if (stage.payload.issues.some((issue) => issue.status === "FAIL") || stage.payload.checks.some((check) => check.status === "FAIL")) return NextResponse.json({ error: "Publishing is blocked until every failed check is fixed." }, { status: 409 });
    if (stage.payload.issues.some((issue) => issue.status === "WARNING") && !body.acknowledgeWarnings) return NextResponse.json({ error: "Acknowledge the review items before publishing." }, { status: 409 });
    const result = await publishRefresh(stage.payload, auth.session.sub, stage.workbookFingerprint);
    revalidateTag("ttg-dashboard", "max");
    revalidatePath("/portal/ttg/dashboard");
    return NextResponse.json(result);
  } catch (error) {
    console.error("TTG dashboard refresh publish failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish this refresh." }, { status: 400 });
  }
}
