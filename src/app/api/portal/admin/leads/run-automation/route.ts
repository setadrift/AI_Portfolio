import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  publishLatestAutomationLeadDigest,
  reloadPublishedAutomationLeadSource,
} from "@/lib/portal/admin/leads";
import { automationRefreshMode } from "@/lib/portal/admin/lead-publish-policy";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.client !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const message =
      automationRefreshMode(process.env.NODE_ENV) === "published"
        ? await reloadPublishedAutomationLeadSource()
        : await publishLatestAutomationLeadDigest();
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to refresh Codex automation leads";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
