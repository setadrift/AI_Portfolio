import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  publishLatestLeadDigest,
  readLeadChannels,
  readLeadScanModes,
} from "@/lib/portal/admin/leads";
import { PORTAL_COOKIE, verifySession } from "@/lib/portal/session";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const body = (await req.json().catch(() => null)) as { channel?: string; mode?: string } | null;
  const channels = await readLeadChannels();
  const scanModes = await readLeadScanModes();
  const mode = body?.mode ?? scanModes[0]?.id ?? "";
  const channel = body?.channel ?? "all";
  const selectedMode = mode ? scanModes.find((item) => item.id === mode) : null;
  const selected = channel === "all" ? null : channels.find((item) => item.id === channel);

  if (mode && !selectedMode) {
    return NextResponse.json({ error: "Unknown scan mode" }, { status: 400 });
  }

  if (channel !== "all" && !selected) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  }

  const result = await runLeadMonitor({
    mode: selectedMode?.id ?? null,
    channel: selected?.id ?? null,
  });
  return NextResponse.json({
    ok: result.code === 0,
    mode,
    channel,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

async function runLeadMonitor({ mode, channel }: { mode: string | null; channel: string | null }) {
  const outputDir = process.env.VERCEL ? "/tmp/reddit-leads" : "outputs/reddit-leads";
  const shouldPublish = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);

  const scanResult = await runScript("reddit-lead-monitor.mjs", {
    REDDIT_LEAD_OUTPUT_DIR: outputDir,
    ...(mode ? { REDDIT_SCAN_MODE: mode } : {}),
    ...(channel ? { REDDIT_FEED_MATCH: channel } : {}),
  });

  if (scanResult.code !== 0) return scanResult;
  const status = await readLeadRunStatus(outputDir);
  if (status && (!status.ok || !status.outputPath)) {
    return {
      code: 1,
      stdout: scanResult.stdout,
      stderr: [scanResult.stderr, status.message || "Lead scan did not produce a publishable digest."]
        .filter(Boolean)
        .join("\n"),
    };
  }
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

async function readLeadRunStatus(outputDir: string) {
  try {
    const raw = await readFile(path.join(outputDir, "latest-status.json"), "utf8");
    return JSON.parse(raw) as { ok?: boolean; outputPath?: string; message?: string };
  } catch {
    return null;
  }
}
