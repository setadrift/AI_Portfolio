import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { publishLatestLeadDigest, readLeadChannels } from "@/lib/portal/admin/leads";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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

  const body = (await req.json().catch(() => null)) as { channel?: string } | null;
  const channels = await readLeadChannels();
  const channel = body?.channel ?? "all";
  const selected = channel === "all" ? null : channels.find((item) => item.id === channel);

  if (channel !== "all" && !selected) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }

  const result = await runLeadMonitor(selected?.id ?? null);
  return NextResponse.json({
    ok: result.code === 0,
    channel,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

async function runLeadMonitor(channel: string | null) {
  const outputDir = process.env.VERCEL ? "/tmp/reddit-leads" : "outputs/reddit-leads";
  const shouldPublish = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);

  const scanResult = await runScript("reddit-lead-monitor.mjs", {
    REDDIT_LEAD_OUTPUT_DIR: outputDir,
    ...(channel ? { REDDIT_FEED_MATCH: channel } : {}),
  });

  if (scanResult.code !== 0) return scanResult;
  if (!shouldPublish) return scanResult;

  try {
    const publishMessage = await publishLatestLeadDigest(outputDir);
    return {
      code: 0,
      stdout: [scanResult.stdout, publishMessage].filter(Boolean).join("\n"),
      stderr: scanResult.stderr,
    };
  } catch (error) {
    return {
      code: 1,
      stdout: scanResult.stdout,
      stderr: [scanResult.stderr, error instanceof Error ? error.message : "Failed to publish lead digest"]
        .filter(Boolean)
        .join("\n"),
    };
  }
}

function runScript(scriptName: string, env: Record<string, string>) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", scriptName);
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}
