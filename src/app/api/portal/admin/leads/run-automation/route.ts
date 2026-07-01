import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  publishLatestAutomationLeadDigest,
  reloadPublishedAutomationLeadSource,
} from "@/lib/portal/admin/leads";
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
    if (isMissingAutomationOutput(message)) {
      try {
        const reloadMessage = await reloadPublishedAutomationLeadSource();
        return NextResponse.json({
          ok: true,
          message: `${reloadMessage} Fresh Codex research must be started from /codex-automation-lead-scan because Vercel cannot access local worktree output files.`,
        });
      } catch (reloadError) {
        const reloadMessage =
          reloadError instanceof Error ? reloadError.message : "Failed to reload published Codex automation leads";
        return NextResponse.json(
          {
            ok: false,
            error: `${message}. ${reloadMessage} Run /codex-automation-lead-scan from Codex first, then retry this button.`,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

function isMissingAutomationOutput(message: string) {
  return (
    message.includes("No dated automation digest") ||
    (message.includes("ENOENT") && message.includes("outputs/ai-consulting-leads"))
  );
}
