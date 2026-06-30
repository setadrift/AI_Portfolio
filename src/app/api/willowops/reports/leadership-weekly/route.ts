import { NextResponse } from "next/server";
import {
  automationLogs,
  financeSnapshots,
  getClient,
  getDashboardSummary,
  getProjectProcurement,
  procurementItems,
  projects,
} from "@/lib/willowops/prototype-data";

export async function GET() {
  const summary = getDashboardSummary();
  const atRiskProjects = projects
    .filter((project) => project.riskStatus === "At risk" || project.riskStatus === "Blocked" || project.riskStatus === "Watch")
    .map((project) => ({
      projectId: project.id,
      projectName: project.name,
      client: getClient(project.clientId)?.name,
      riskStatus: project.riskStatus,
      stage: project.stage,
      nextAction: project.nextAction,
      procurementFlags: getProjectProcurement(project.id)
        .filter((item) => item.status === "Delayed" || item.clientApprovalStatus === "Pending")
        .map((item) => ({
          itemName: item.itemName,
          supplier: item.supplier,
          status: item.status,
          clientApprovalStatus: item.clientApprovalStatus,
          blockedReason: item.blockedReason,
        })),
    }));

  const financeFlags = financeSnapshots
    .filter((snapshot) => snapshot.outstandingTotal > 0 || snapshot.paymentStatus === "Overdue")
    .map((snapshot) => {
      const project = projects.find((candidate) => candidate.id === snapshot.projectId);

      return {
        projectId: snapshot.projectId,
        projectName: project?.name,
        paymentStatus: snapshot.paymentStatus,
        outstandingTotal: snapshot.outstandingTotal,
      };
    });

  const procurementFlags = procurementItems
    .filter((item) => item.status === "Delayed" || item.clientApprovalStatus === "Pending")
    .map((item) => ({
      projectId: item.projectId,
      itemName: item.itemName,
      supplier: item.supplier,
      status: item.status,
      clientApprovalStatus: item.clientApprovalStatus,
      blockedReason: item.blockedReason,
    }));

  const automationReviewQueue = automationLogs
    .filter((log) => log.status !== "Success" || log.humanReviewRequired)
    .map((log) => ({
      id: log.id,
      sourceSystem: log.sourceSystem,
      eventType: log.eventType,
      projectId: log.projectId,
      status: log.status,
      humanReviewRequired: log.humanReviewRequired,
    }));

  return NextResponse.json({
    reportName: "WillowOps weekly leadership report",
    generatedAt: new Date().toISOString(),
    summary,
    executiveNarrative: [
      `${summary.activeProjects} active projects are represented in the prototype control tower.`,
      `${summary.atRiskProjects} project needs leadership attention, with ${summary.delayedItems} delayed procurement item and ${summary.pendingApprovals} pending client approval.`,
      `Outstanding finance exposure in the mock data is GBP ${summary.outstandingTotal.toLocaleString("en-GB")}.`,
      `${summary.automationReviewQueue} automation item is in the review queue.`,
    ],
    atRiskProjects,
    financeFlags,
    procurementFlags,
    automationReviewQueue,
    recommendedLeadershipActions: [
      "Review delayed procurement before the next client update.",
      "Confirm ownership for overdue finance follow-up.",
      "Keep AI-generated client/supplier messages in review mode until the team trusts the workflow.",
      "Use Monday.com as the visible operating layer and keep Studio Designer/Xero as specialist source systems.",
    ],
  });
}
