import { NextResponse } from "next/server";
import { buildScenarioResult } from "@/lib/mindbody-enrollment/prototype-data";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/mindbody-enrollment/scenarios/course-purchase",
    purpose:
      "Prototype Make.com scenario response for a Mindbody course purchase using the StartIntegrate/MAXMEL connector shape.",
    examplePayload: {
      event: "course_purchase",
      mindbodyClientId: "MB-839104",
      courseId: "exec_function_foundations_fall",
    },
  });
}

export async function POST() {
  return NextResponse.json(buildScenarioResult());
}
