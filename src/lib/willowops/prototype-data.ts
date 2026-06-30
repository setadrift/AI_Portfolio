export type ProjectStage =
  | "New enquiry"
  | "Qualified"
  | "Discovery scheduled"
  | "Proposal sent"
  | "Kickoff"
  | "Concept design"
  | "Sourcing"
  | "Client approval"
  | "Procurement"
  | "Installation"
  | "Aftercare"
  | "Complete";

export type RiskStatus = "On track" | "Watch" | "At risk" | "Blocked";

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferredChannel: "Email" | "WhatsApp" | "Phone";
  address: string;
  leadSource: string;
  budgetRange: string;
  styleNotes: string;
  status: "Lead" | "Active" | "Past client";
};

export type Project = {
  id: string;
  clientId: string;
  name: string;
  propertyLocation: string;
  serviceType: string;
  stage: ProjectStage;
  leadDesigner: string;
  projectManager: string;
  targetStartDate: string;
  targetInstallDate: string;
  budget: number;
  riskStatus: RiskStatus;
  nextAction: string;
  lastClientTouch: string;
};

export type ProcurementItem = {
  id: string;
  projectId: string;
  room: string;
  supplier: string;
  itemName: string;
  status: "Proposed" | "Approved" | "PO required" | "Ordered" | "Delayed" | "Delivered" | "Installed";
  clientApprovalStatus: "Pending" | "Approved" | "Rejected" | "Not required";
  purchaseOrderStatus: "Not started" | "Required" | "Sent" | "Acknowledged";
  invoiceStatus: "Not invoiced" | "Invoiced" | "Paid" | "Overdue";
  expectedDeliveryDate: string;
  blockedReason?: string;
};

export type FinanceSnapshot = {
  projectId: string;
  proposalTotal: number;
  invoicedTotal: number;
  paidTotal: number;
  outstandingTotal: number;
  paymentStatus: "Not invoiced" | "Part paid" | "Paid" | "Overdue";
};

export type AutomationLog = {
  id: string;
  sourceSystem: "Monday.com" | "Make.com" | "Outlook" | "Xero" | "WhatsApp" | "Studio Designer";
  eventType: string;
  projectId: string;
  status: "Success" | "Needs review" | "Failed";
  startedAt: string;
  finishedAt: string;
  errorMessage?: string;
  retryCount: number;
  humanReviewRequired: boolean;
};

export type SourceOfTruthRow = {
  workflowArea: string;
  sourceOfTruth: string;
  supportingSystems: string[];
  automationTrigger: string;
  humanOwner: string;
};

export type TrainingModule = {
  audience: "Leadership" | "Operations" | "Design team" | "Project managers";
  title: string;
  duration: string;
  outcome: string;
  exercises: string[];
};

export const clients: Client[] = [
  {
    id: "client_reeves",
    name: "Charlotte Reeves",
    email: "charlotte.reeves@example.com",
    phone: "+44 7000 111111",
    preferredChannel: "Email",
    address: "Winchester, Hampshire",
    leadSource: "Website enquiry",
    budgetRange: "GBP 75k-100k",
    styleNotes: "Warm contemporary kitchen and living space with natural stone finishes.",
    status: "Lead",
  },
  {
    id: "client_shah",
    name: "James and Priya Shah",
    email: "shah.house@example.com",
    phone: "+44 7000 222222",
    preferredChannel: "WhatsApp",
    address: "Basingstoke, Hampshire",
    leadSource: "Referral",
    budgetRange: "GBP 180k-250k",
    styleNotes: "Full home renovation, calm luxury, child-friendly materials.",
    status: "Active",
  },
  {
    id: "client_brooks",
    name: "Amelia Brooks",
    email: "amelia.brooks@example.com",
    phone: "+44 7000 333333",
    preferredChannel: "Email",
    address: "Farnham, Surrey",
    leadSource: "Instagram",
    budgetRange: "GBP 20k-35k",
    styleNotes: "Study refresh with bespoke joinery and layered lighting.",
    status: "Active",
  },
];

export const projects: Project[] = [
  {
    id: "project_reeves",
    clientId: "client_reeves",
    name: "Reeves Residence",
    propertyLocation: "Winchester",
    serviceType: "Kitchen and living room redesign",
    stage: "Discovery scheduled",
    leadDesigner: "Lucy",
    projectManager: "Operations",
    targetStartDate: "2026-07-08",
    targetInstallDate: "2026-10-30",
    budget: 90000,
    riskStatus: "On track",
    nextAction: "Prepare discovery call brief and confirm desired procurement timeline.",
    lastClientTouch: "2026-06-29",
  },
  {
    id: "project_shah",
    clientId: "client_shah",
    name: "Shah House",
    propertyLocation: "Basingstoke",
    serviceType: "Full home renovation",
    stage: "Procurement",
    leadDesigner: "Senior Designer",
    projectManager: "Projects",
    targetStartDate: "2026-05-20",
    targetInstallDate: "2026-09-15",
    budget: 220000,
    riskStatus: "At risk",
    nextAction: "Resolve delayed lighting delivery and send client update for approval.",
    lastClientTouch: "2026-06-25",
  },
  {
    id: "project_brooks",
    clientId: "client_brooks",
    name: "Brooks Study",
    propertyLocation: "Farnham",
    serviceType: "Single-room refresh",
    stage: "Client approval",
    leadDesigner: "Designer",
    projectManager: "Operations",
    targetStartDate: "2026-06-18",
    targetInstallDate: "2026-08-12",
    budget: 32000,
    riskStatus: "Watch",
    nextAction: "Chase fabric approval before purchase order deadline.",
    lastClientTouch: "2026-06-24",
  },
];

export const procurementItems: ProcurementItem[] = [
  {
    id: "item_shah_lighting",
    projectId: "project_shah",
    room: "Entrance hall",
    supplier: "Heritage Lighting",
    itemName: "Statement pendant and wall lights",
    status: "Delayed",
    clientApprovalStatus: "Approved",
    purchaseOrderStatus: "Acknowledged",
    invoiceStatus: "Invoiced",
    expectedDeliveryDate: "2026-07-18",
    blockedReason: "Supplier revised delivery date by 12 days.",
  },
  {
    id: "item_brooks_fabric",
    projectId: "project_brooks",
    room: "Study",
    supplier: "Atelier Fabrics",
    itemName: "Window treatment fabric",
    status: "Proposed",
    clientApprovalStatus: "Pending",
    purchaseOrderStatus: "Not started",
    invoiceStatus: "Not invoiced",
    expectedDeliveryDate: "2026-07-29",
    blockedReason: "Awaiting client approval.",
  },
  {
    id: "item_reeves_stone",
    projectId: "project_reeves",
    room: "Kitchen",
    supplier: "Stone & Surface Ltd.",
    itemName: "Honed stone worktop sample set",
    status: "Proposed",
    clientApprovalStatus: "Not required",
    purchaseOrderStatus: "Not started",
    invoiceStatus: "Not invoiced",
    expectedDeliveryDate: "2026-07-16",
  },
];

export const financeSnapshots: FinanceSnapshot[] = [
  {
    projectId: "project_reeves",
    proposalTotal: 90000,
    invoicedTotal: 0,
    paidTotal: 0,
    outstandingTotal: 0,
    paymentStatus: "Not invoiced",
  },
  {
    projectId: "project_shah",
    proposalTotal: 220000,
    invoicedTotal: 84000,
    paidTotal: 56000,
    outstandingTotal: 28000,
    paymentStatus: "Part paid",
  },
  {
    projectId: "project_brooks",
    proposalTotal: 32000,
    invoicedTotal: 12000,
    paidTotal: 0,
    outstandingTotal: 12000,
    paymentStatus: "Overdue",
  },
];

export const automationLogs: AutomationLog[] = [
  {
    id: "auto_001",
    sourceSystem: "Make.com",
    eventType: "qualified_enquiry_to_discovery_brief",
    projectId: "project_reeves",
    status: "Success",
    startedAt: "2026-06-30T09:12:00Z",
    finishedAt: "2026-06-30T09:12:09Z",
    retryCount: 0,
    humanReviewRequired: true,
  },
  {
    id: "auto_002",
    sourceSystem: "Studio Designer",
    eventType: "procurement_delay_import",
    projectId: "project_shah",
    status: "Needs review",
    startedAt: "2026-06-30T10:05:00Z",
    finishedAt: "2026-06-30T10:05:04Z",
    retryCount: 0,
    humanReviewRequired: true,
  },
  {
    id: "auto_003",
    sourceSystem: "Xero",
    eventType: "invoice_overdue",
    projectId: "project_brooks",
    status: "Success",
    startedAt: "2026-06-30T11:24:00Z",
    finishedAt: "2026-06-30T11:24:03Z",
    retryCount: 0,
    humanReviewRequired: false,
  },
];

export const sourceOfTruthRows: SourceOfTruthRow[] = [
  {
    workflowArea: "Lead and enquiry pipeline",
    sourceOfTruth: "Monday.com Client Enquiries board",
    supportingSystems: ["Website form", "Outlook", "Make.com"],
    automationTrigger: "New enquiry or status changes to Qualified",
    humanOwner: "Operations / leadership",
  },
  {
    workflowArea: "Project delivery status",
    sourceOfTruth: "Monday.com Design Projects board",
    supportingSystems: ["Studio Designer", "Outlook", "WhatsApp"],
    automationTrigger: "Project stage changes",
    humanOwner: "Project manager",
  },
  {
    workflowArea: "Procurement details",
    sourceOfTruth: "Studio Designer export or adapter",
    supportingSystems: ["Monday.com", "Supplier email", "WhatsApp"],
    automationTrigger: "CSV/API import shows delayed, overdue, or approval-needed item",
    humanOwner: "Procurement / project manager",
  },
  {
    workflowArea: "Invoices and payment status",
    sourceOfTruth: "Xero",
    supportingSystems: ["Monday.com", "Dashboard"],
    automationTrigger: "Invoice created, paid, or overdue",
    humanOwner: "Finance / leadership",
  },
  {
    workflowArea: "Client and supplier communication",
    sourceOfTruth: "Project communication log",
    supportingSystems: ["Outlook", "WhatsApp", "Monday.com"],
    automationTrigger: "Stage change, delay, overdue approval, or manual update request",
    humanOwner: "Project manager",
  },
];

export const mondayBoardBlueprint = [
  {
    board: "Client Enquiries",
    purpose: "Track lead intake through proposal outcome.",
    statuses: ["New", "Qualified", "Discovery Scheduled", "Proposal Sent", "Won", "Lost"],
    columns: ["Client", "Email", "Phone", "Lead Source", "Budget Range", "Owner", "Next Action", "Last Touch", "Automation Status"],
  },
  {
    board: "Design Projects",
    purpose: "Track delivery from kickoff through aftercare.",
    statuses: ["Kickoff", "Concept Design", "Sourcing", "Client Approval", "Procurement", "Installation", "Aftercare", "Complete"],
    columns: ["Client", "Service Type", "Lead Designer", "Project Manager", "Install Date", "Risk Status", "Next Action", "Finance Status"],
  },
  {
    board: "Procurement Tracker",
    purpose: "Track design items, supplier movement, and delays.",
    statuses: ["Proposed", "Approved", "PO Required", "Ordered", "Acknowledged", "Delayed", "Delivered", "Installed"],
    columns: ["Project", "Room", "Supplier", "Item", "Client Approval", "PO Status", "Invoice Status", "Expected Delivery", "Blocked Reason"],
  },
  {
    board: "Automation Log",
    purpose: "Make automation behavior visible and debuggable.",
    statuses: ["Success", "Needs Review", "Failed", "Retried"],
    columns: ["Source System", "Event Type", "Project", "Started At", "Finished At", "Retry Count", "Human Review", "Error Message"],
  },
];

export const sampleAiBrief = {
  summary:
    "Charlotte Reeves is preparing for a discovery conversation around the Reeves Residence kitchen and living room redesign. The project is early-stage, on track, and needs a clear brief around budget, timing, design priorities, and procurement expectations before downstream automation creates tasks or client-facing drafts.",
  risks: [
    "The project is not yet formally kicked off, so automation should stay in draft/review mode.",
    "Procurement data is still light; Studio Designer or supplier detail will be needed before delivery risk can be assessed.",
  ],
  discoveryQuestions: [
    "What decisions does Charlotte want help making first: layout, finishes, sourcing, timeline, or budget allocation?",
    "Are there fixed dates, access constraints, or family events that affect the target install timeline?",
    "Who should approve design decisions and client-facing communications?",
  ],
  internalNextActions: [
    "Confirm source-of-truth ownership for enquiry status in Monday.com.",
    "Create the discovery call brief and assign an owner.",
    "Prepare an Outlook follow-up draft for review.",
    "Log the automation run as review-required.",
  ],
};

export const trainingModules: TrainingModule[] = [
  {
    audience: "Leadership",
    title: "Weekly control tower review",
    duration: "30 minutes",
    outcome: "Leadership can read the dashboard, identify risk, and assign next actions without inspecting every project manually.",
    exercises: [
      "Review at-risk projects and decide owner/action/date.",
      "Compare procurement flags against finance flags.",
      "Use the leadership report to prepare a weekly ops agenda.",
    ],
  },
  {
    audience: "Operations",
    title: "Monday.com source-of-truth discipline",
    duration: "45 minutes",
    outcome: "Operations can keep enquiry, project, procurement, and automation statuses clean enough for reliable automations.",
    exercises: [
      "Move a test enquiry from New to Qualified.",
      "Confirm the next action and owner are populated.",
      "Review the automation log when a workflow needs review.",
    ],
  },
  {
    audience: "Design team",
    title: "AI draft review and client tone",
    duration: "30 minutes",
    outcome: "Designers can review AI-generated briefs/messages and correct tone or missing context before anything reaches clients.",
    exercises: [
      "Review a generated discovery brief.",
      "Edit an Outlook draft for luxury client tone.",
      "Identify facts the AI should not guess.",
    ],
  },
  {
    audience: "Project managers",
    title: "Procurement and finance exception handling",
    duration: "45 minutes",
    outcome: "Project managers can handle supplier delays, pending approvals, and finance flags using a consistent review queue.",
    exercises: [
      "Triage a delayed supplier item.",
      "Draft a supplier WhatsApp update for review.",
      "Escalate an overdue invoice flag into a leadership action.",
    ],
  },
];

export const handoffChecklist = [
  "Source-of-truth map is agreed and documented.",
  "Monday boards have owners, status definitions, and required fields.",
  "AI-generated client/supplier communication stays in review mode until explicitly approved.",
  "Every automation writes a visible success/review/failure state.",
  "The team knows where to check failed automations and who owns follow-up.",
  "Credentials and API keys are stored in platform credential stores, not shared docs or Make notes.",
  "Studio Designer integration boundary is confirmed: CSV export first, API/vendor access later if available.",
  "Leadership has a weekly report ritual tied to dashboard metrics.",
];

export function getClient(clientId: string) {
  return clients.find((client) => client.id === clientId);
}

export function getFinanceSnapshot(projectId: string) {
  return financeSnapshots.find((snapshot) => snapshot.projectId === projectId);
}

export function getProjectProcurement(projectId: string) {
  return procurementItems.filter((item) => item.projectId === projectId);
}

export function getProjectAutomationLogs(projectId: string) {
  return automationLogs.filter((log) => log.projectId === projectId);
}

export function getDashboardSummary() {
  const atRiskProjects = projects.filter((project) => project.riskStatus === "At risk" || project.riskStatus === "Blocked");
  const pendingApprovals = procurementItems.filter((item) => item.clientApprovalStatus === "Pending");
  const delayedItems = procurementItems.filter((item) => item.status === "Delayed");
  const outstandingTotal = financeSnapshots.reduce((total, snapshot) => total + snapshot.outstandingTotal, 0);
  const failedOrReviewLogs = automationLogs.filter((log) => log.status !== "Success");

  return {
    activeProjects: projects.filter((project) => project.stage !== "Complete").length,
    atRiskProjects: atRiskProjects.length,
    pendingApprovals: pendingApprovals.length,
    delayedItems: delayedItems.length,
    outstandingTotal,
    automationReviewQueue: failedOrReviewLogs.length,
  };
}
