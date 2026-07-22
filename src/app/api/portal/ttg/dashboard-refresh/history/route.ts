import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import { getTtgDashboardData } from "@/lib/portal/ttg/dashboard";
import { getRefreshHistory } from "@/lib/portal/ttg/google-sheets-refresh";
import { buildRefreshGuidance } from "@/lib/portal/ttg/refresh-guidance";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  const [historyResult, dashboardResult] = await Promise.allSettled([
    getRefreshHistory(),
    getTtgDashboardData(),
  ]);
  if (historyResult.status === "rejected") console.error("TTG refresh history failed", historyResult.reason instanceof Error ? historyResult.reason.message : historyResult.reason);
  if (dashboardResult.status === "rejected") console.error("TTG refresh guidance freshness failed", dashboardResult.reason instanceof Error ? dashboardResult.reason.message : dashboardResult.reason);
  return NextResponse.json({
    history: historyResult.status === "fulfilled" ? historyResult.value : [],
    guidance: buildRefreshGuidance(dashboardResult.status === "fulfilled" ? dashboardResult.value.source : undefined),
  });
}
