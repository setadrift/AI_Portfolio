import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { publishLatestAutomationLeadDigest } from "@/lib/portal/admin/leads";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || session.client !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scanEnabled =
    process.env.NODE_ENV !== "production" || process.env.LEAD_SCAN_ENABLED === "true";
  if (!scanEnabled) {
    return NextResponse.json(
      { error: "Lead scans are disabled in this environment." },
      { status: 403 },
    );
  }

  try {
    const message = await publishLatestAutomationLeadDigest();
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish Codex automation leads";
    return NextResponse.json(
      {
        ok: false,
        error:
          message.includes("No dated automation digest")
            ? `${message}. Run /codex-automation-lead-scan from Codex first, then retry this button.`
            : message,
      },
      { status: 500 },
    );
  }
}
