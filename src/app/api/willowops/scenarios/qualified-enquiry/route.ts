import { NextResponse } from "next/server";
import { generateWillowOpsBrief } from "@/lib/willowops/ai-brief";
import { getClient, getFinanceSnapshot, getProjectProcurement, projects } from "@/lib/willowops/prototype-data";

type QualifiedEnquiryPayload = {
  board?: string;
  changedAt?: string;
  changedBy?: string;
  itemId?: string;
  newStatus?: string;
  previousStatus?: string;
  projectId?: string;
  projectName?: string;
  raw?: unknown;
};

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/scenarios/qualified-enquiry",
    purpose:
      "One-call Make scenario endpoint for the Phase 1 prototype: normalize a Monday qualified-enquiry event and generate a review-first AI discovery brief.",
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
  let payload: QualifiedEnquiryPayload;

  try {
    payload = (await request.json()) as QualifiedEnquiryPayload;
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

  if (!client) {
    return NextResponse.json(
      {
        error: "Client not found for project.",
        projectId: project.id,
        clientId: project.clientId,
      },
      { status: 404 },
    );
  }

  const finance = getFinanceSnapshot(project.id);
  const procurement = getProjectProcurement(project.id);
  const statusChange = {
    board: payload.board,
    previousStatus: payload.previousStatus,
    newStatus: payload.newStatus,
    changedAt: payload.changedAt,
    changedBy: payload.changedBy,
  };
  const brief = await generateWillowOpsBrief({
    client,
    finance,
    procurement,
    project,
    statusChange,
  });

  const receivedAt = new Date().toISOString();

  return NextResponse.json({
    scenario: "qualified_enquiry_to_discovery_brief",
    receivedAt,
    normalizedEvent: {
      sourceSystem: "Monday.com",
      orchestrationSystem: "Make.com",
      eventType: "status_change",
      projectId: project.id,
      clientId: project.clientId,
      previousStatus: payload.previousStatus ?? null,
      newStatus: payload.newStatus ?? null,
      humanReviewRequired: true,
      missingFields: brief.missingInformation,
    },
    mondayUpdates: {
      projectName: project.name,
      nextAction: brief.internalNextActions[0] ?? project.nextAction,
      automationStatus: "Needs Review",
      reviewRequired: true,
    },
    outlookDraft: brief.outlookDraft,
    aiBrief: brief,
    automationLog: {
      sourceSystem: "Make.com",
      eventType: "qualified_enquiry_to_discovery_brief",
      projectId: project.id,
      status: "Needs Review",
      startedAt: receivedAt,
      finishedAt: new Date().toISOString(),
      retryCount: 0,
      humanReviewRequired: true,
      errorMessage: null,
    },
  });
}
