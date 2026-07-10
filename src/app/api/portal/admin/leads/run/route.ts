import { spawn } from "node:child_process";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  publishLatestLeadDigest,
  readLeadScanModes,
} from "@/lib/portal/admin/leads";
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

  const body = (await req.json().catch(() => null)) as { mode?: string } | null;
  const scanModes = await readLeadScanModes();
  const mode = body?.mode ?? scanModes[0]?.id ?? "";
  const selectedMode = mode ? scanModes.find((item) => item.id === mode) : null;

  if (mode && !selectedMode) {
    return NextResponse.json({ error: "Unknown scan mode" }, { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      void runLeadMonitor({
        onEvent: (event) => {
          controller.enqueue(encodeScanEvent(event));
        },
      }).catch((error) => {
        controller.enqueue(
          encodeScanEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Failed to run Reddit scan.",
            stdout: "",
            stderr: error instanceof Error ? error.stack ?? error.message : String(error),
          }),
        );
      }).finally(() => {
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

type ScanEvent =
  | { type: "log"; message: string }
  | { type: "done"; ok: boolean; stdout: string; stderr: string }
  | { type: "error"; message: string; stdout: string; stderr: string };

async function runLeadMonitor({
  onEvent,
}: {
  onEvent: (event: ScanEvent) => void;
}) {
  const outputDir = process.env.VERCEL ? "/tmp/reddit-leads" : "outputs/reddit-leads";
  const shouldPublish = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);

  onEvent({ type: "log", message: "Starting Reddit scan..." });
  const scanResult = await runScript("reddit-lead-scanner.mjs", {
    REDDIT_LEAD_OUTPUT_DIR: outputDir,
    REDDIT_SCANNER_STATE_PATH: path.join(outputDir, "state.json"),
  }, onEvent);

  if (scanResult.code !== 0) {
    onEvent({ type: "error", message: "Reddit scan failed.", stdout: scanResult.stdout, stderr: scanResult.stderr });
    return;
  }
  if (!shouldPublish) {
    onEvent({ type: "done", ok: true, stdout: scanResult.stdout, stderr: scanResult.stderr });
    return;
  }

  try {
    onEvent({ type: "log", message: "Publishing scan results..." });
    const publishMessage = await publishLatestLeadDigest(outputDir);
    onEvent({
      type: "done",
      ok: true,
      stdout: [scanResult.stdout, publishMessage].filter(Boolean).join("\n"),
      stderr: scanResult.stderr,
    });
  } catch (error) {
    onEvent({
      type: "error",
      message: error instanceof Error ? error.message : "Failed to publish lead digest",
      stdout: scanResult.stdout,
      stderr: [scanResult.stderr, error instanceof Error ? error.message : "Failed to publish lead digest"]
        .filter(Boolean)
        .join("\n"),
    });
  }
}

function runScript(
  scriptName: string,
  env: Record<string, string>,
  onEvent: (event: ScanEvent) => void,
) {
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
    let settled = false;
    const finish = (result: { code: number | null; stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      for (const line of scanOutputLines(text)) {
        onEvent({ type: "log", message: line });
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of scanOutputLines(text)) {
        onEvent({ type: "log", message: line });
      }
    });
    child.on("error", (error) => {
      stderr += error.message;
      onEvent({ type: "log", message: error.message });
      finish({ code: 1, stdout, stderr });
    });
    child.on("close", (code) => {
      finish({ code, stdout, stderr });
    });
  });
}

function encodeScanEvent(event: ScanEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function scanOutputLines(text: string) {
  return text.split(/\r?\n/).map((item: string) => item.trim()).filter(Boolean);
}
