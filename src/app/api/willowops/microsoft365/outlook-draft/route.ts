import { NextResponse } from "next/server";
import { generateWillowOpsBrief } from "@/lib/willowops/ai-brief";
import { getClient, getFinanceSnapshot, getProjectProcurement, projects } from "@/lib/willowops/prototype-data";

type OutlookDraftRequest = {
  projectId?: string;
  projectName?: string;
  mode?: "draft" | "send";
};

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/microsoft365/outlook-draft",
    purpose:
      "Prepare an Outlook/Microsoft Graph-ready draft email payload from WillowOps project context. Dry run only; nothing is sent.",
    examplePayload: {
      projectId: "project_reeves",
      mode: "draft",
    },
  });
}

export async function POST(request: Request) {
  let payload: OutlookDraftRequest;

  try {
    payload = (await request.json()) as OutlookDraftRequest;
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
  });

  const graphDraftPayload = {
    subject: brief.outlookDraft.subject,
    body: {
      contentType: "Text",
      content: brief.outlookDraft.body,
    },
    toRecipients: [
      {
        emailAddress: {
          address: client.email,
          name: client.name,
        },
      },
    ],
    categories: ["WillowOps Prototype", "AI Draft", "Needs Review"],
    importance: project.riskStatus === "At risk" || project.riskStatus === "Blocked" ? "high" : "normal",
  };

  return NextResponse.json({
    mode: payload.mode ?? "draft",
    dryRun: true,
    reviewRequired: true,
    graphEndpointLater: "POST /me/messages to create a draft, or POST /me/sendMail to send after approval.",
    guardrails: [
      "This endpoint does not send email.",
      "Client-facing communication stays in review mode by default.",
      "Microsoft Graph OAuth and mailbox permissions are required before live draft creation.",
    ],
    project: {
      id: project.id,
      name: project.name,
      riskStatus: project.riskStatus,
    },
    graphDraftPayload,
    aiBrief: brief,
  });
}
