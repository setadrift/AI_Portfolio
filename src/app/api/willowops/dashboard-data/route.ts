import { NextResponse } from "next/server";
import {
  automationLogs,
  clients,
  financeSnapshots,
  getDashboardSummary,
  mondayBoardBlueprint,
  procurementItems,
  projects,
  sourceOfTruthRows,
} from "@/lib/willowops/prototype-data";

export async function GET() {
  return NextResponse.json({
    summary: getDashboardSummary(),
    sourceOfTruthRows,
    mondayBoardBlueprint,
    clients,
    projects,
    procurementItems,
    financeSnapshots,
    automationLogs,
  });
}
