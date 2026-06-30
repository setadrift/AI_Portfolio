import { NextResponse } from "next/server";
import { generateWillowOpsBrief } from "@/lib/willowops/ai-brief";
import { getClient, getFinanceSnapshot, getProjectProcurement, projects } from "@/lib/willowops/prototype-data";

type DiscoveryBriefRequest = {
  projectId?: string;
  projectName?: string;
  statusChange?: {
    board?: string;
    changedAt?: string;
    changedBy?: string;
    newStatus?: string;
    previousStatus?: string;
  };
};

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/ai/discovery-brief",
    purpose: "Generate a structured discovery/project brief and Outlook-ready draft from WillowOps project context.",
    examplePayload: {
      projectId: "project_reeves",
      statusChange: {
        board: "Client Enquiries",
        previousStatus: "New",
        newStatus: "Qualified",
        changedAt: "2026-06-30T14:00:00Z",
        changedBy: "Operations",
      },
    },
  });
}

export async function POST(request: Request) {
  let payload: DiscoveryBriefRequest;

  try {
    payload = (await request.json()) as DiscoveryBriefRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const project =
    projects.find((candidate) => candidate.id === payload.projectId) ??
    projects.find((candidate) => candidate.name === payload.projectName);

  if (!project) {
    return NextResponse.json(
      {
        error: "Project not found in prototype seed data.",
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

  const brief = await generateWillowOpsBrief({
    client,
    finance: getFinanceSnapshot(project.id),
    procurement: getProjectProcurement(project.id),
    project,
    statusChange: payload.statusChange,
  });

  return NextResponse.json({
    projectId: project.id,
    generatedAt: new Date().toISOString(),
    brief,
  });
}
