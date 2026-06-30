import { NextResponse } from "next/server";
import { getClient, getFinanceSnapshot, getProjectProcurement, projects } from "@/lib/willowops/prototype-data";

type MondayStatusChangePayload = {
  board?: string;
  itemId?: string;
  projectId?: string;
  projectName?: string;
  previousStatus?: string;
  newStatus?: string;
  changedAt?: string;
  changedBy?: string;
  raw?: unknown;
};

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/webhooks/monday/status-change",
    purpose: "Receive a Monday.com status-change event from Make, normalize it, and return AI-ready project context.",
    examplePayload: {
      board: "Client Enquiries",
      itemId: "monday_item_123",
      projectId: "project_reeves",
      projectName: "Reeves Residence",
      previousStatus: "New",
      newStatus: "Qualified",
      changedAt: "2026-06-30T14:00:00Z",
      changedBy: "Operations",
    },
  });
}

export async function POST(request: Request) {
  let payload: MondayStatusChangePayload;

  try {
    payload = (await request.json()) as MondayStatusChangePayload;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
        expectedShape: {
          projectId: "project_reeves",
          newStatus: "Qualified",
        },
      },
      { status: 400 },
    );
  }

  const project =
    projects.find((candidate) => candidate.id === payload.projectId) ??
    projects.find((candidate) => candidate.name === payload.projectName);

  if (!project) {
    return NextResponse.json(
      {
        error: "Project not found in prototype seed data.",
        receivedProjectId: payload.projectId,
        receivedProjectName: payload.projectName,
        knownProjects: projects.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
        })),
      },
      { status: 404 },
    );
  }

  const client = getClient(project.clientId);
  const procurement = getProjectProcurement(project.id);
  const finance = getFinanceSnapshot(project.id);
  const missingFields = [
    !client?.email ? "client.email" : null,
    !project.nextAction ? "project.nextAction" : null,
    !project.targetInstallDate ? "project.targetInstallDate" : null,
  ].filter(Boolean);

  const aiBriefInput = {
    task: "Prepare a discovery or project-status brief for a luxury interior design team.",
    rules: [
      "Do not invent dates, prices, suppliers, or client decisions.",
      "If information is missing, list it under missing_information.",
      "Keep client-facing language polished, concise, and warm.",
      "Return structured JSON with summary, risks, questions, next_actions, and email_draft.",
    ],
    client,
    project,
    finance,
    procurement,
    statusChange: {
      board: payload.board,
      previousStatus: payload.previousStatus,
      newStatus: payload.newStatus,
      changedAt: payload.changedAt,
      changedBy: payload.changedBy,
    },
  };

  return NextResponse.json({
    normalizedEvent: {
      sourceSystem: "Monday.com",
      eventType: "status_change",
      projectId: project.id,
      clientId: project.clientId,
      previousStatus: payload.previousStatus ?? null,
      newStatus: payload.newStatus ?? null,
      receivedAt: new Date().toISOString(),
      humanReviewRequired: true,
      missingFields,
    },
    recommendedAutomation: {
      makeScenario: "Qualified enquiry to discovery brief",
      nextSystemActions: [
        "Update the Monday project next action.",
        "Generate a discovery brief with AI.",
        "Create an Outlook draft for human review.",
        "Write an automation log row.",
      ],
    },
    aiBriefInput,
  });
}
