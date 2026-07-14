import { NextRequest, NextResponse } from "next/server";
import { requireMinaPortalSession } from "@/lib/portal/mina/auth";
import { readMinaJobsData } from "@/lib/portal/mina/jobs";
import { runMinaJobScan } from "../../../../../../scripts/mina-job-scan.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
      const limited = !latestBroadScan?.ok;
      return NextResponse.json(
        {
          ok: true,
          data: existingData,
          summary: {
            checked: 0,
            matched: 0,
            currentJobs,
            successfulSources: 0,
            limited,
            completedAt: latestBroadScan?.lastRunAt,
          },
          message: limited
            ? `Using the scan from less than five minutes ago. Market coverage was partial; ${currentJobs} verified jobs remain on your board.`
            : `Already checked less than five minutes ago. ${currentJobs} verified jobs are on your board.`,
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
    const limited = summary.partialCoverage;
    const coverage = `${summary.marketQueriesSucceeded.toLocaleString("en-CA")} market queries and ${summary.employerBoardsSucceeded.toLocaleString("en-CA")} employer boards`;
    const missingCoverage = [
      !summary.canadianMarketHealthy ? "the Canadian market search was incomplete" : "",
      !summary.publicWebHealthy ? "the wider public-web search was incomplete" : "",
      !summary.directAtsHealthy ? "employer-board coverage was incomplete" : "",
    ].filter(Boolean).join("; ");

    return NextResponse.json(
      {
        ok: true,
        data,
        summary: {
          checked: summary.candidatesChecked,
          matched: summary.canonicalVerified,
          currentJobs,
          successfulSources: summary.successfulSources,
          marketQueriesAttempted: summary.marketQueriesAttempted,
          marketQueriesSucceeded: summary.marketQueriesSucceeded,
          employerBoardsAttempted: summary.employerBoardsAttempted,
          employerBoardsSucceeded: summary.employerBoardsSucceeded,
          limited,
          completedAt: new Date().toISOString(),
        },
        message: limited
          ? `Partial scan: ${missingCoverage}. Checked ${summary.candidatesChecked.toLocaleString("en-CA")} possible matches; ${currentJobs} verified open jobs remain on your board.`
          : `Scan complete: searched ${coverage}. Checked ${summary.candidatesChecked.toLocaleString("en-CA")} possible matches; ${currentJobs} verified open jobs are on your board.`,
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
