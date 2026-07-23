import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireTtgPortalSession } from "@/lib/portal/ttg/auth";
import {
  addSupabaseCustomWidget,
  createSupabaseCustomDashboard,
  createSupabaseMarketingCampaign,
} from "@/lib/portal/ttg/ttg-reporting-db";

export const runtime = "nodejs";

const cleanText = (value: unknown, max = 120) => String(value ?? "").trim().slice(0, max);
const isoDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : "";

export async function POST(request: Request) {
  const auth = await requireTtgPortalSession();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "create-campaign") {
      const name = cleanText(body.name);
      const channel = cleanText(body.channel, 60);
      const startDate = isoDate(body.startDate);
      const endDate = isoDate(body.endDate);
      const spend = Number(body.spend);
      if (!name || !channel || !startDate || !endDate || endDate < startDate || !Number.isFinite(spend) || spend < 0) {
        return NextResponse.json({ error: "Enter a name, platform, valid date range, and non-negative spend." }, { status: 400 });
      }
      await createSupabaseMarketingCampaign({ name, channel, startDate, endDate, spend, createdBy: auth.session.sub });
    } else if (body.action === "create-dashboard") {
      const name = cleanText(body.name, 80);
      if (!name) return NextResponse.json({ error: "Enter a dashboard name." }, { status: 400 });
      await createSupabaseCustomDashboard({ name, description: cleanText(body.description, 500), createdBy: auth.session.sub });
    } else if (body.action === "add-widget") {
      const dashboardId = cleanText(body.dashboardId, 40);
      const widgetType = cleanText(body.widgetType, 20);
      const title = cleanText(body.title, 80);
      const metricKey = cleanText(body.metricKey, 60);
      if (!/^[0-9a-f-]{36}$/i.test(dashboardId) || !["kpi", "chart", "table"].includes(widgetType) || !title) {
        return NextResponse.json({ error: "Choose a valid dashboard and widget type." }, { status: 400 });
      }
      await addSupabaseCustomWidget({ dashboardId, widgetType, title, metricKey: metricKey || undefined, createdBy: auth.session.sub });
    } else {
      return NextResponse.json({ error: "Unsupported workspace action." }, { status: 400 });
    }
    revalidateTag("ttg-dashboard", "max");
    revalidatePath("/portal/ttg/dashboard");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("TTG workspace change failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save that change." }, { status: 400 });
  }
}
