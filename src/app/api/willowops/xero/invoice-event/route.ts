import { NextResponse } from "next/server";
import { projects } from "@/lib/willowops/prototype-data";

type XeroInvoiceEventPayload = {
  amountDue?: number;
  amountPaid?: number;
  contactName?: string;
  currency?: string;
  dueDate?: string;
  eventType?: "invoice_created" | "invoice_updated" | "invoice_paid" | "invoice_overdue";
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  projectName?: string;
  status?: "DRAFT" | "AUTHORISED" | "PAID" | "VOIDED";
  total?: number;
};

function financeStatus(payload: XeroInvoiceEventPayload) {
  if (payload.eventType === "invoice_paid" || payload.status === "PAID") return "Paid";
  if (payload.eventType === "invoice_overdue") return "Overdue";
  if ((payload.amountPaid ?? 0) > 0 && (payload.amountDue ?? 0) > 0) return "Part paid";
  if ((payload.amountDue ?? 0) > 0) return "Outstanding";
  return "Not invoiced";
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/willowops/xero/invoice-event",
    purpose:
      "Prototype Xero invoice webhook adapter. Accepts a mock invoice event and returns project finance/risk updates for Monday and the dashboard.",
    examplePayload: {
      eventType: "invoice_overdue",
      invoiceId: "xero_invoice_123",
      invoiceNumber: "INV-1042",
      projectId: "project_brooks",
      projectName: "Brooks Study",
      contactName: "Amelia Brooks",
      total: 12000,
      amountPaid: 0,
      amountDue: 12000,
      currency: "GBP",
      dueDate: "2026-06-24",
      status: "AUTHORISED",
    },
  });
}

export async function POST(request: Request) {
  let payload: XeroInvoiceEventPayload;

  try {
    payload = (await request.json()) as XeroInvoiceEventPayload;
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

  const status = financeStatus(payload);
  const needsReview = status === "Overdue" || status === "Outstanding";

  return NextResponse.json({
    sourceSystem: "Xero",
    eventType: payload.eventType ?? "invoice_updated",
    projectId: project.id,
    projectName: project.name,
    invoice: {
      invoiceId: payload.invoiceId,
      invoiceNumber: payload.invoiceNumber,
      contactName: payload.contactName,
      total: payload.total ?? 0,
      amountPaid: payload.amountPaid ?? 0,
      amountDue: payload.amountDue ?? 0,
      currency: payload.currency ?? "GBP",
      dueDate: payload.dueDate,
      status: payload.status,
    },
    mondayUpdates: {
      financeStatus: status,
      riskStatus: needsReview ? "Watch" : project.riskStatus,
      nextAction: needsReview
        ? `Review ${payload.invoiceNumber ?? "invoice"} finance status before next client update.`
        : project.nextAction,
    },
    dashboardImpact: {
      outstandingDelta: payload.amountDue ?? 0,
      shouldShowInLeadershipReport: needsReview,
    },
    automationLog: {
      sourceSystem: "Xero",
      eventType: payload.eventType ?? "invoice_updated",
      projectId: project.id,
      status: needsReview ? "Needs Review" : "Success",
      humanReviewRequired: needsReview,
    },
  });
}
