import { NextResponse } from "next/server";
import { handoffChecklist, sourceOfTruthRows, trainingModules } from "@/lib/willowops/prototype-data";

export async function GET() {
  return NextResponse.json({
    guideName: "WillowOps training and handoff plan",
    purpose:
      "Help a small luxury interiors team adopt automation safely, with clear owners, source-of-truth discipline, review queues, and leadership visibility.",
    trainingModules,
    handoffChecklist,
    sourceOfTruthRows,
    recommendedRollout: [
      "Start with leadership and operations alignment on source-of-truth ownership.",
      "Train operations on Monday.com status discipline before enabling live automations.",
      "Keep client-facing AI drafts in review mode until tone, facts, and approvals are consistently reliable.",
      "Introduce procurement and finance exception handling after the first enquiry workflow is stable.",
      "Run a weekly leadership report review for the first month after launch.",
    ],
  });
}
