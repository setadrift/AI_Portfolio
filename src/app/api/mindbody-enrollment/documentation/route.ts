import { NextResponse } from "next/server";
import {
  documentationChecklist,
  edgeCaseChecks,
  makeScenarioSteps,
  makeModuleBlueprint,
  prototypeValueMetrics,
  requirementCoverage,
  requiredSessions,
} from "@/lib/mindbody-enrollment/prototype-data";

export async function GET() {
  return NextResponse.json({
    name: "Mindbody enrollment automation documentation pack",
    buildMode: "Make.com only",
    connector: "StartIntegrate/MAXMEL Mindbody connector",
    systems: ["Mindbody", "Make.com", "HubSpot", "Google Sheets", "Appiant guardrail"],
    requirementCoverage,
    scenarioSteps: makeScenarioSteps,
    makeModuleBlueprint,
    requiredMindbodyObjects: {
      courseSessions: requiredSessions.map((session) => ({
        title: session.title,
        mindbodyClassId: session.mindbodyClassId,
      })),
      enrollmentCheck:
        "Search the client's current Mindbody class visits/enrollments before adding missing sessions.",
    },
    edgeCaseChecks,
    documentationChecklist,
    prototypeValueMetrics,
  });
}
