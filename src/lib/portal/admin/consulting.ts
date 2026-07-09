export type ConsultingLeadStatus =
  | "New"
  | "Contacted"
  | "Discovery Booked"
  | "Proposal Sent"
  | "Won"
  | "Lost"
  | "Dormant";

export type ConsultingProjectStatus =
  | "Discovery"
  | "Proposal"
  | "Active"
  | "Waiting on Client"
  | "Complete"
  | "Paused";

export type ConsultingPaymentStatus =
  | "Not Invoiced"
  | "Deposit Sent"
  | "Deposit Paid"
  | "Final Due"
  | "Paid";

export type ConsultingTaskStatus = "Todo" | "Doing" | "Waiting" | "Done";
export type ConsultingTaskPriority = "High" | "Medium" | "Low";
export type ConsultingTaskType =
  | "Client Follow-Up"
  | "Build"
  | "Proposal"
  | "Invoice"
  | "Research"
  | "Admin";

export interface ConsultingLink {
  label: string;
  href?: string;
  reference?: string;
}

export interface ConsultingLead {
  id: string;
  name: string;
  source: string;
  business: string;
  painPoint: string;
  status: ConsultingLeadStatus;
  lastContactAt: string;
  nextFollowUpAt?: string;
  valueEstimate?: string;
  links: ConsultingLink[];
  notes: string;
}

export interface ConsultingProject {
  id: string;
  client: string;
  project: string;
  status: ConsultingProjectStatus;
  phase: string;
  feeCents: number;
  currencyCode?: "CAD" | "GBP" | "USD";
  valueEstimate?: string;
  paymentStatus: ConsultingPaymentStatus;
  startedAt: string;
  targetDate?: string;
  nextAction: string;
  scope: string;
  successCriteria: string[];
  links: ConsultingLink[];
  notes: string;
}

export interface ConsultingTask {
  id: string;
  title: string;
  projectId?: string;
  client: string;
  status: ConsultingTaskStatus;
  priority: ConsultingTaskPriority;
  dueAt?: string;
  type: ConsultingTaskType;
  notes: string;
}

export const consultingLeads: ConsultingLead[] = [
  {
    id: "lead-ttg-ceo-dashboard",
    name: "Gabriella Evans",
    source: "Existing client / Gmail",
    business: "The Trauma Therapy Group",
    painPoint:
      "Gabriella wants a CEO dashboard with key financial and practice-efficiency metrics from Jane and corporate bank data.",
    status: "Proposal Sent",
    lastContactAt: "2026-07-03",
    nextFollowUpAt: "2026-07-10",
    valueEstimate: "$750 lean dashboard build",
    links: [
      {
        label: "Current state log",
        reference: "outputs/client-proposals/ttg-current-state-2026-07-07.md",
      },
      {
        label: "TTG portal",
        href: "/portal/ttg",
      },
    ],
    notes:
      "Gabriella asked about a CEO dashboard on July 3. Duncan replied with a $750 fixed-scope lean dashboard proposal and asked her to confirm Jane reporting/API access and safe bank export/API/Plaid options. No newer reply found in Gmail as of July 7.",
  },
  {
    id: "lead-willow-grey-automation-ai",
    name: "Caroline Lawrence / Lucy",
    source: "Make Community",
    business: "Willow Grey Interiors",
    painPoint:
      "Leadership wants to transform a messy operating model across Monday.com, Studio Designer, Microsoft 365, Outlook, Xero, WhatsApp, WeTransfer, Make/Zapier, and AI.",
    status: "Contacted",
    lastContactAt: "2026-07-07",
    nextFollowUpAt: "2026-07-12",
    valueEstimate: "GBP 3.5k-5.5k discovery, GBP 8k-15k pilot, GBP 650/day ongoing",
    links: [
      {
        label: "Follow-up email log",
        reference: "outputs/client-proposals/willow-grey-followup-sent-2026-07-07.md",
      },
      {
        label: "Phase 1 readiness report",
        reference: "docs/willow-grey-phase-1-readiness-report.md",
      },
      {
        label: "Prototype status",
        reference: "docs/willow-grey-phase-1-status.md",
      },
    ],
    notes:
      "Positive post-call reply received from Caroline: she and Lucy like the approach and want to work together. Duncan replied with a discovery sprint next step and asked for lightweight materials before Caroline's two-week holiday. Proposal not sent yet; wait for materials, then draft Phase 0 scope, outputs, timeline, fee, and access needs.",
  },
  {
    id: "lead-lengthiness-extra",
    name: "Board reporting lead",
    source: "Reddit",
    business: "Small business / finance reporting",
    painPoint: "Quarterly investor reporting is slow and manual.",
    status: "Dormant",
    lastContactAt: "2026-06-11",
    valueEstimate: "$2k-$5k",
    links: [{ label: "Lead tracker", reference: "docs/lead-tracker.md" }],
    notes: "Older warm lead. Keep out of the active command center unless it revives.",
  },
];

export const consultingProjects: ConsultingProject[] = [
  {
    id: "willow-grey-automation-ai-discovery",
    client: "Willow Grey Interiors",
    project: "Automation & AI Discovery Sprint",
    status: "Proposal",
    phase: "Awaiting client materials / Phase 0 proposal prep",
    feeCents: 0,
    valueEstimate: "GBP 3.5k-4.5k discovery target",
    paymentStatus: "Not Invoiced",
    startedAt: "2026-07-07",
    targetDate: "2026-07-14",
    nextAction:
      "Wait for Caroline's pre-holiday materials, then draft a Phase 0 proposal with scope, outputs, timeline, fee, and access needs.",
    scope:
      "Map how work currently moves through Willow Grey, identify duplicated/missed/manually chased information, and recommend a cleaner operating model before selecting the first automation build.",
    successCriteria: [
      "Caroline and Lucy send current workflow/tool materials.",
      "Phase 0 proposal defines scope, deliverables, timeline, fee, and access needs.",
      "Discovery sprint produces a prioritized operating/process map and first automation recommendation.",
      "Implementation work does not start until pricing, scope, access, and timing are agreed.",
    ],
    links: [
      {
        label: "Follow-up email log",
        reference: "outputs/client-proposals/willow-grey-followup-sent-2026-07-07.md",
      },
      {
        label: "Prototype readiness",
        reference: "docs/willow-grey-phase-1-readiness-report.md",
      },
      {
        label: "Setup runbook",
        reference: "docs/willow-grey-phase-1-setup-runbook.md",
      },
    ],
    notes:
      "Discovery sprint positioning sent July 7 after a positive call. Pricing guidance to use in proposal: anchor Phase 0 around GBP 3.5k-4.5k if packaged tightly; ongoing day-rate anchor around GBP 650/day. Keep prototype work as proof/accelerator, not as already-contracted delivery.",
  },
  {
    id: "ttg-ceo-dashboard",
    client: "The Trauma Therapy Group",
    project: "CEO Dashboard",
    status: "Proposal",
    phase: "Quote sent / awaiting data-access answers",
    feeCents: 75000,
    currencyCode: "CAD",
    paymentStatus: "Not Invoiced",
    startedAt: "2026-07-03",
    targetDate: "2026-07-10",
    nextAction:
      "Wait for Gabriella to confirm Jane reporting/API access and bank export or approved read-only connector options.",
    scope:
      "Lean CEO dashboard for key financial and practice-efficiency metrics using Jane reports and bank data in the safest reliable form available.",
    successCriteria: [
      "Gabriella confirms the 6-10 most important CEO metrics.",
      "Jane reporting exports or approved API/integration access are confirmed.",
      "Bank data path avoids shared credentials, disabled 2FA, and unofficial browser extensions.",
      "Dashboard can be refreshed through a documented monthly process unless safe API access is available.",
    ],
    links: [
      {
        label: "Current state log",
        reference: "outputs/client-proposals/ttg-current-state-2026-07-07.md",
      },
      {
        label: "TTG portal",
        href: "/portal/ttg",
      },
    ],
    notes:
      "Gmail evidence: Gabriella requested a quote July 3 for a dashboard pulling Jane and corporate bank data. Duncan replied same day with a $750 fixed lean version and scoped API/integration work separately if needed.",
  },
  {
    id: "ttg-blog-content-pipeline",
    client: "The Trauma Therapy Group",
    project: "Blog & Content Pipeline",
    status: "Complete",
    phase: "Phase 1 paid / support as needed",
    feeCents: 50000,
    currencyCode: "CAD",
    paymentStatus: "Paid",
    startedAt: "2026-05-08",
    targetDate: "2026-05-14",
    nextAction:
      "No active action. Keep available for issues with the Google Docs-to-WordPress publishing workflow.",
    scope:
      "Google Docs-to-WordPress draft publishing tool, image generation/upload workflow, formatting cleanup, metadata support, and TherapyEverywhere setup/testing coordination.",
    successCriteria: [
      "Gabriella and Jess can use the publishing workflow.",
      "Phase 1 invoice is paid.",
      "Future TTG automation ideas are captured separately instead of expanding the completed blog-pipeline scope.",
    ],
    links: [
      {
        label: "Current state log",
        reference: "outputs/client-proposals/ttg-current-state-2026-07-07.md",
      },
      {
        label: "TTG publisher",
        href: "/portal/ttg/publish",
      },
    ],
    notes:
      "Phase 1 blog/content pipeline invoice was sent May 8 for $500. Gabriella confirmed May 14 that the e-transfer was resent and went through, and said the blog tool was nice work. She planned to think further about the next automation priority.",
  },
  {
    id: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    project: "Airtable Turn-Season Workflow",
    status: "Complete",
    phase: "Phase 1 paid / future work after turn season",
    feeCents: 75000,
    currencyCode: "USD",
    paymentStatus: "Paid",
    startedAt: "2026-06-16",
    targetDate: "2026-09-15",
    nextAction:
      "No active action. Alex confirmed first-phase payment and may reach out after turn season about more work together.",
    scope:
      "Make the existing Airtable rental management system field-ready for turn season, focused on Turn Repairs, mobile workflow, Omni testing, Gmail sweep support, and a short runbook.",
    successCriteria: [
      "Alex has a clear phone path for active turn repairs.",
      "The workflow supports property filtering, repair detail review, notes, photos, materials, contractor, and status updates.",
      "Live-base changes are additive and made only after sandbox approval.",
      "Omni and Gmail sweep recommendations are documented before handoff.",
    ],
    links: [
      {
        label: "Sandbox Interface",
        href: "https://airtable.com/appRB4L3wVfpN9tIb/pagH3aVxhAAoMTUys",
      },
      {
        label: "Implementation spec",
        reference: "client-work/alex-parker/context/implementation-spec.md",
      },
      {
        label: "Property Hub spec",
        reference: "client-work/alex-parker/working/property-hub-interface-spec.md",
      },
    ],
    notes:
      "First-phase payment is confirmed. Alex expects to revisit possible additional work after turn season; do not prepare live-base rollout work unless he reopens the conversation.",
  },
  {
    id: "internal-admin-consulting-portal",
    client: "Internal",
    project: "Admin Consulting Portal",
    status: "Complete",
    phase: "V1 shipped / maintenance only",
    feeCents: 0,
    paymentStatus: "Not Invoiced",
    startedAt: "2026-06-17",
    nextAction: "Keep the admin command center concise and current as client state changes.",
    scope:
      "Extend the existing admin portal with a dashboard, project list, and task queue using read-only seed data.",
    successCriteria: [
      "Admin home is a useful dashboard.",
      "Projects and tasks have dedicated admin pages.",
      "Existing lead digest behavior is preserved.",
    ],
    links: [{ label: "Spec", reference: "docs/admin-consulting-portal-spec.md" }],
    notes: "Keep this intentionally simple; no persistence or integrations in v1.",
  },
];

export const consultingTasks: ConsultingTask[] = [
  {
    id: "task-ttg-ceo-dashboard-access",
    title: "Wait for TTG CEO dashboard data-access answers",
    projectId: "ttg-ceo-dashboard",
    client: "The Trauma Therapy Group",
    status: "Waiting",
    priority: "Medium",
    dueAt: "2026-07-10",
    type: "Proposal",
    notes:
      "Gabriella needs to confirm priority metrics, Jane reporting/API options, and safe bank data access before the $750 lean dashboard can be finalized or started.",
  },
  {
    id: "task-alex-turn-season-followup",
    title: "Check whether Alex wants more work after turn season",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Waiting",
    priority: "Low",
    dueAt: "2026-09-15",
    type: "Client Follow-Up",
    notes:
      "First phase is paid and closed. Alex said he may reach out at the end of turn season for possible additional work together.",
  },
  {
    id: "task-willow-grey-materials-proposal",
    title: "Review Willow Grey materials and draft Phase 0 proposal",
    projectId: "willow-grey-automation-ai-discovery",
    client: "Willow Grey Interiors",
    status: "Waiting",
    priority: "High",
    dueAt: "2026-07-12",
    type: "Proposal",
    notes:
      "Caroline was asked to send rough workflows, Monday screenshots/exports, tool usage notes, SOPs/templates/spreadsheets, dashboard priorities, and constraints before her holiday. Draft proposal after those arrive.",
  },
  {
    id: "task-alex-feedback",
    title: "Check for Alex sandbox feedback",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Done",
    priority: "High",
    dueAt: "2026-07-10",
    type: "Client Follow-Up",
    notes: "Superseded by paid/complete state and end-of-turn-season follow-up.",
  },
  {
    id: "task-alex-live-rollout",
    title: "Prepare live-base backup and rollout plan",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Done",
    priority: "High",
    type: "Build",
    notes: "Closed with Phase 1. Do not touch the live base unless Alex reopens work after turn season.",
  },
  {
    id: "task-alex-omni-tests",
    title: "Draft Airtable Omni field lookup tests",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Done",
    priority: "Medium",
    dueAt: "2026-06-19",
    type: "Research",
    notes: "Use known answers from Turn Repairs, Move In, and Move Out records.",
  },
  {
    id: "task-alex-gmail-sweep",
    title: "Draft manual Gmail sweep prompt",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Done",
    priority: "Medium",
    dueAt: "2026-06-20",
    type: "Build",
    notes: "Prompt must search beyond one thread and account for tenant replies that start new threads.",
  },
  {
    id: "task-portal-v1",
    title: "Implement admin consulting portal v1",
    projectId: "internal-admin-consulting-portal",
    client: "Internal",
    status: "Done",
    priority: "High",
    dueAt: "2026-06-17",
    type: "Admin",
    notes: "Dashboard, Projects, Tasks. Preserve existing Leads behavior.",
  },
];

export const importantAdminLinks: ConsultingLink[] = [
  {
    label: "Cal discovery call",
    href: "https://cal.com/duncan-anderson-sdo5hp/ai-automation-discovery-call",
  },
  {
    label: "Lead tracker",
    reference: "docs/lead-tracker.md",
  },
  {
    label: "Admin portal spec",
    reference: "docs/admin-consulting-portal-spec.md",
  },
];

export function currency(cents: number, currencyCode: "CAD" | "GBP" | "USD" = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(date?: string) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isDueOrOverdue(date: string | undefined, now = new Date()) {
  if (!date) return false;
  return date <= dateKey(now);
}

export function isThisWeek(date: string | undefined, now = new Date()) {
  if (!date) return false;
  const today = dateKey(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const endKey = end.toISOString().slice(0, 10);
  return date >= today && date <= endKey;
}

export function getActiveProjects() {
  return consultingProjects.filter((project) =>
    ["Active", "Discovery", "Proposal", "Waiting on Client"].includes(project.status),
  );
}

export function getProposalProjects() {
  return consultingProjects.filter((project) => project.status === "Proposal");
}

export function getOpenTasks() {
  return consultingTasks.filter((task) => task.status !== "Done");
}

export function getDueTasks(now = new Date()) {
  return getOpenTasks().filter((task) => isDueOrOverdue(task.dueAt, now));
}

export function getWaitingTasks() {
  return getOpenTasks().filter((task) => task.status === "Waiting");
}

export function getFollowUpLeads(now = new Date()) {
  return consultingLeads.filter((lead) => isDueOrOverdue(lead.nextFollowUpAt, now));
}

export function getPendingCommercialItems() {
  return consultingProjects.filter(
    (project) =>
      project.feeCents > 0 &&
      (project.status === "Proposal" ||
        ["Not Invoiced", "Deposit Sent", "Final Due"].includes(project.paymentStatus)),
  );
}

export function projectValue(project: ConsultingProject) {
  if (project.valueEstimate) return project.valueEstimate;
  if (project.feeCents > 0) {
    const code = project.currencyCode ?? "USD";
    return `${currency(project.feeCents, code)} ${code}`;
  }
  return "TBD";
}

export function getBookedRevenueForMonth(now = new Date()) {
  return consultingProjects
    .filter((project) => {
      if (project.feeCents <= 0) return false;
      const started = new Date(`${project.startedAt}T00:00:00Z`);
      const current = new Date(`${dateKey(now)}T00:00:00Z`);
      return (
        started.getUTCFullYear() === current.getUTCFullYear() &&
        started.getUTCMonth() === current.getUTCMonth()
      );
    })
    .reduce((sum, project) => sum + project.feeCents, 0);
}

export function getTasksByBucket(now = new Date()) {
  const open = getOpenTasks();
  const actionable = open.filter((task) => task.status !== "Waiting");
  const today = dateKey(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const endKey = end.toISOString().slice(0, 10);

  return {
    overdue: actionable.filter((task) => task.dueAt && task.dueAt < today),
    today: actionable.filter((task) => task.dueAt === today),
    thisWeek: actionable.filter(
      (task) => task.dueAt && task.dueAt > today && task.dueAt <= endKey,
    ),
    waiting: open.filter((task) => task.status === "Waiting"),
    backlog: actionable.filter((task) => !task.dueAt),
  };
}
