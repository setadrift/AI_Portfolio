import { NextResponse } from "next/server";
import { getClient, getProjectProcurement, projects } from "@/lib/willowops/prototype-data";

type WhatsAppDraftRequest = {
  audience?: "client" | "supplier" | "internal";
  itemId?: string;
  projectId?: string;
  projectName?: string;
  reason?: "supplier_delay" | "client_approval_pending" | "delivery_confirmed" | "status_update";
};

function buildMessage({
  audience,
  clientName,
  itemName,
  projectName,
  reason,
  supplier,
}: {
  audience: "client" | "supplier" | "internal";
  clientName: string;
  itemName?: string;
  projectName: string;
  reason: WhatsAppDraftRequest["reason"];
  supplier?: string;
}) {
  if (audience === "supplier") {
    return [
      `Hi ${supplier || "there"},`,
      `Just checking the latest status for ${itemName || "the item"} on ${projectName}.`,
      "Could you confirm the current delivery date and flag anything we need to escalate internally?",
      "Many thanks.",
    ].join(" ");
  }

  if (reason === "client_approval_pending") {
    return [
      `Hi ${clientName},`,
      `A quick note on ${projectName}: we are ready to move forward on ${itemName || "the pending item"} once you are happy to approve.`,
      "Please let us know if you would like any changes before we proceed.",
    ].join(" ");
  }

  if (reason === "supplier_delay") {
    return [
      `Hi ${clientName},`,
      `A quick update on ${projectName}: one supplier item has a revised delivery date.`,
      "We are reviewing the impact and will come back with the clearest next step before anything changes in the schedule.",
    ].join(" ");
  }

  return [
    `Hi ${clientName},`,
    `A quick update on ${projectName}: everything is being reviewed and the next action is with the team.`,
    "We will follow up if any decision is needed from you.",
  ].join(" ");
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/whatsapp/message-draft",
    purpose:
      "Prepare a WhatsApp-style client/supplier message in review mode. Dry run only; nothing is sent.",
    examplePayload: {
      projectId: "project_shah",
      itemId: "item_shah_lighting",
      audience: "supplier",
      reason: "supplier_delay",
    },
  });
}

export async function POST(request: Request) {
  let payload: WhatsAppDraftRequest;

  try {
    payload = (await request.json()) as WhatsAppDraftRequest;
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
  const item = getProjectProcurement(project.id).find((candidate) => candidate.id === payload.itemId);
  const audience = payload.audience ?? "client";
  const reason = payload.reason ?? (item?.status === "Delayed" ? "supplier_delay" : "status_update");

  const message = buildMessage({
    audience,
    clientName: client?.name ?? "there",
    itemName: item?.itemName,
    projectName: project.name,
    reason,
    supplier: item?.supplier,
  });

  return NextResponse.json({
    channel: "WhatsApp",
    dryRun: true,
    reviewRequired: true,
    projectId: project.id,
    audience,
    reason,
    draft: {
      to:
        audience === "client"
          ? {
              name: client?.name,
              phone: client?.phone,
            }
          : {
              name: item?.supplier ?? "Supplier",
              phone: null,
            },
      message,
    },
    guardrails: [
      "No WhatsApp message is sent by this endpoint.",
      "Avoid sensitive finance, personal, or contractual details in WhatsApp drafts.",
      "Client-facing or supplier-facing messages require human approval.",
    ],
    automationLog: {
      sourceSystem: "WhatsApp",
      eventType: "message_draft",
      projectId: project.id,
      status: "Needs Review",
      humanReviewRequired: true,
    },
  });
}
