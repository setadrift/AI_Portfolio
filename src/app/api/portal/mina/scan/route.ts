import { NextRequest, NextResponse } from "next/server";
import { requireMinaPortalSession } from "@/lib/portal/mina/auth";
import { readMinaJobsData } from "@/lib/portal/mina/jobs";
import { runMinaJobScan } from "../../../../../../scripts/mina-job-scan.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let scanInFlight = false;

export async function POST(request: NextRequest) {
  const auth = await requireMinaPortalSession();
  if (!auth.ok) return auth.response;
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }
  if (scanInFlight) {
    return NextResponse.json(
      { error: "A scan is already running. Give it a moment, then try again." },
      { status: 409 },
    );
  }

  scanInFlight = true;
  try {
    const existingData = await readMinaJobsData();
    const latestBroadScan = existingData.sourceHealth.find(
      (source) => source.source === "broad:mina-discovery-v2",
    );
    const latestScanAge = latestBroadScan
      ? Date.now() - Date.parse(latestBroadScan.lastRunAt)
      : Number.POSITIVE_INFINITY;
    if (latestScanAge < 5 * 60_000) {
      const currentJobs = existingData.jobs.filter((job) => job.active).length;
      return NextResponse.json(
        {
          ok: true,
          data: existingData,
          summary: {
            checked: 0,
            matched: 0,
            currentJobs,
            successfulSources: 0,
            limited: false,
            completedAt: latestBroadScan?.lastRunAt,
          },
          message: `Already checked less than five minutes ago. ${currentJobs} verified jobs are on your board.`,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const summary = await runMinaJobScan();
    if (!summary.successfulSources) {
      throw new Error("No job sources completed successfully.");
    }
    const data = await readMinaJobsData();
    const currentJobs = data.jobs.filter((job) => job.active).length;
    const limited = summary.errors.length > 0;

    return NextResponse.json(
      {
        ok: true,
        data,
        summary: {
          checked: summary.fetched,
          matched: summary.matched,
          currentJobs,
          successfulSources: summary.successfulSources,
          limited,
          completedAt: new Date().toISOString(),
        },
        message: limited
          ? `Scan complete. ${summary.fetched.toLocaleString("en-CA")} listings checked; ${currentJobs} verified jobs are on your board. One or more sources were unavailable.`
          : `Scan complete. ${summary.fetched.toLocaleString("en-CA")} listings checked; ${currentJobs} verified jobs are on your board.`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Mina portal scan failed", error);
    return NextResponse.json(
      { error: "The scan could not finish. Please try again in a few minutes." },
      { status: 500 },
    );
  } finally {
    scanInFlight = false;
  }
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
