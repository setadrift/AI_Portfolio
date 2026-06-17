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
    id: "lead-lengthiness-extra",
    name: "Board reporting lead",
    source: "Reddit",
    business: "Small business / finance reporting",
    painPoint: "Quarterly investor reporting is slow and manual.",
    status: "Contacted",
    lastContactAt: "2026-06-11",
    nextFollowUpAt: "2026-06-19",
    valueEstimate: "$2k-$5k",
    links: [{ label: "Lead tracker", reference: "docs/lead-tracker.md" }],
    notes: "Warm reply received. Follow up if they do not book or respond after team discussion.",
  },
];

export const consultingProjects: ConsultingProject[] = [
  {
    id: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    project: "Airtable Turn-Season Workflow",
    status: "Active",
    phase: "Sandbox prototype / awaiting client feedback",
    feeCents: 75000,
    paymentStatus: "Deposit Paid",
    startedAt: "2026-06-16",
    targetDate: "2026-06-21",
    nextAction: "Wait for Alex sandbox feedback, then revise or prepare live rollout.",
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
      "Sandbox v1 is published and Duncan's first phone check was positive. Alex has been invited to test before live rollout.",
  },
  {
    id: "internal-admin-consulting-portal",
    client: "Internal",
    project: "Admin Consulting Portal",
    status: "Active",
    phase: "V1 implementation",
    feeCents: 0,
    paymentStatus: "Not Invoiced",
    startedAt: "2026-06-17",
    nextAction: "Ship a simple internal command center for projects, tasks, and leads.",
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
    id: "task-alex-feedback",
    title: "Check for Alex sandbox feedback",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Waiting",
    priority: "High",
    dueAt: "2026-06-17",
    type: "Client Follow-Up",
    notes: "If feedback is positive, prepare the live-base rollout checklist.",
  },
  {
    id: "task-alex-live-rollout",
    title: "Prepare live-base backup and rollout plan",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Todo",
    priority: "High",
    dueAt: "2026-06-18",
    type: "Build",
    notes: "Do not touch the live base until sandbox feedback and safety step are confirmed.",
  },
  {
    id: "task-alex-omni-tests",
    title: "Draft Airtable Omni field lookup tests",
    projectId: "alex-parker-airtable-turn-season",
    client: "Alex Parker",
    status: "Todo",
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
    status: "Todo",
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

export function currency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
