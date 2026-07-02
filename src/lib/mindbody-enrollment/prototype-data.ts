export type EnrollmentStatus = "Already enrolled" | "Missing" | "Waitlist" | "Conflict";

export type Student = {
  id: string;
  mindbodyClientId: string;
  hubSpotContactId: string;
  name: string;
  email: string;
  guardianEmail: string;
  phone: string;
  timezone: string;
};

export type CourseSession = {
  id: string;
  mindbodyClassId: string;
  title: string;
  startsAt: string;
  coach: string;
  room: string;
};

export type EnrollmentCheck = CourseSession & {
  status: EnrollmentStatus;
  existingVisitId?: string;
  action: "skip" | "add_client_to_class" | "route_to_va_review";
  reason: string;
};

export const student: Student = {
  id: "student_maya_chen",
  mindbodyClientId: "MB-839104",
  hubSpotContactId: "HS-420188",
  name: "Maya Chen",
  email: "maya.chen@example.com",
  guardianEmail: "parent.chen@example.com",
  phone: "+1 703 555 0139",
  timezone: "America/New_York",
};

export const coursePurchase = {
  purchaseId: "MB-SALE-11742",
  courseId: "exec_function_foundations_fall",
  courseName: "Executive Function Foundations - Fall Cohort",
  purchasedAt: "2026-07-02T13:32:00-04:00",
  source: "Mindbody purchase webhook",
  amountPaid: 1295,
};

export const requiredSessions: CourseSession[] = [
  {
    id: "session_01",
    mindbodyClassId: "MB-CLASS-7101",
    title: "Intake and goals",
    startsAt: "2026-09-08T16:00:00-04:00",
    coach: "Dana Reed",
    room: "McLean Room A",
  },
  {
    id: "session_02",
    mindbodyClassId: "MB-CLASS-7102",
    title: "Planning systems",
    startsAt: "2026-09-15T16:00:00-04:00",
    coach: "Dana Reed",
    room: "McLean Room A",
  },
  {
    id: "session_03",
    mindbodyClassId: "MB-CLASS-7103",
    title: "Study routines",
    startsAt: "2026-09-22T16:00:00-04:00",
    coach: "Dana Reed",
    room: "McLean Room A",
  },
  {
    id: "session_04",
    mindbodyClassId: "MB-CLASS-7104",
    title: "Completion review",
    startsAt: "2026-09-29T16:00:00-04:00",
    coach: "Dana Reed",
    room: "McLean Room A",
  },
];

export const existingMindbodyEnrollments = [
  {
    classId: "MB-CLASS-7101",
    visitId: "MB-VISIT-55410",
    status: "Booked",
  },
  {
    classId: "MB-CLASS-7103",
    visitId: "MB-VISIT-55412",
    status: "Booked",
  },
];

export const documentationChecklist = [
  "Scenario purpose, owner, trigger, and systems touched",
  "Mindbody StartIntegrate/MAXMEL module list and field mappings",
  "Appiant guardrail: do not overwrite contact fields owned by the MB-HubSpot sync",
  "HubSpot properties, segment/list update, and post-enrollment template payload",
  "Google Sheet delivery log columns and VA follow-up rules",
  "Retry, duplicate-prevention, and human-review behavior",
];

export const requirementCoverage = [
  {
    requirement: "Make.com only",
    coverage:
      "The demo models Make as the orchestration layer. No Zapier, n8n, or custom queue is required for the core scenario.",
    status: "Covered in prototype",
  },
  {
    requirement: "Mindbody API via StartIntegrate/MAXMEL",
    coverage:
      "The prototype names the expected connector modules and keeps Mindbody operations isolated behind a connector-shaped adapter contract.",
    status: "Ready for live credentials",
  },
  {
    requirement: "Check existing enrollments before adding new ones",
    coverage:
      "Required sessions are compared against existing class visits/enrollments; already-booked sessions are skipped and only missing sessions are queued.",
    status: "Covered in prototype",
  },
  {
    requirement: "Work alongside Appiant's Mindbody-HubSpot sync",
    coverage:
      "HubSpot identity fields owned by Appiant are blocked; the scenario writes only automation-specific course/status/audit fields.",
    status: "Covered in prototype",
  },
  {
    requirement: "Full documentation with every build",
    coverage:
      "The demo includes a documentation checklist and JSON documentation endpoint that can become build documentation.",
    status: "Covered in prototype",
  },
];

export const makeModuleBlueprint = [
  {
    module: "Mindbody - Watch Purchases",
    input: "Sale/course purchase event",
    output: "clientId, courseId, purchaseId, purchasedAt",
    note: "Trigger can be replaced by scheduled polling if the connector lacks a native purchase webhook.",
  },
  {
    module: "Mindbody - Search Client Schedule / Enrollments",
    input: "mindbodyClientId, course date window",
    output: "classId, visitId, booking status",
    note: "This is the duplicate-prevention step: existing visits are checked before any add-class action runs.",
  },
  {
    module: "Make - Iterator + Filter",
    input: "requiredSessions[] and existingEnrollments[]",
    output: "missingSessions[]",
    note: "Only sessions absent from the client schedule continue to the add-class branch.",
  },
  {
    module: "Mindbody - Add Client to Class",
    input: "mindbodyClientId, classId",
    output: "new visit/enrollment result",
    note: "Failures route to VA review instead of silently sending confirmation.",
  },
  {
    module: "HubSpot - Update Contact",
    input: "hubSpotContactId, course status fields",
    output: "updated automation-owned properties",
    note: "Appiant-owned identity fields are intentionally not mapped.",
  },
  {
    module: "Google Sheets + HubSpot Template Payload",
    input: "scenario summary, added sessions, contact/course fields",
    output: "ops log row, review flag, post-enrollment template payload",
    note: "Creates visibility for Customer Success and leaves an audit trail.",
  },
];

export const edgeCaseChecks = [
  "Student already enrolled in every required session",
  "Student exists in HubSpot but not found in Mindbody",
  "Mindbody class is full or waitlisted",
  "One session conflicts with another enrollment",
  "Appiant updates contact identity fields during the Make run",
  "HubSpot confirmation template is missing or inactive",
];

export const prototypeValueMetrics = [
  {
    label: "Duplicate enrollments prevented",
    value: "2",
    explanation: "Already-booked Mindbody sessions are detected and skipped before add-class actions run.",
  },
  {
    label: "Systems coordinated",
    value: "5",
    explanation: "Mindbody, Make, HubSpot, Google Sheets, and Appiant guardrails are represented in one scenario contract.",
  },
  {
    label: "Manual handoffs clarified",
    value: "1",
    explanation: "The VA review point is explicit, conditional, and tied to the exact enrollment outcome.",
  },
  {
    label: "Build docs seeded",
    value: "6",
    explanation: "The documentation checklist is ready to turn into scenario handoff notes.",
  },
];

export const makeScenarioSteps = [
  {
    system: "Mindbody / StartIntegrate",
    name: "Watch course purchase",
    detail: "Receives a paid course purchase and normalizes the client, course, and session IDs.",
  },
  {
    system: "Mindbody / StartIntegrate",
    name: "Search client enrollments",
    detail: "Pulls existing class visits/enrollments before attempting to add anything new.",
  },
  {
    system: "Make.com router",
    name: "Compare required vs existing",
    detail: "Skips sessions already booked, adds missing sessions, and routes conflicts to review.",
  },
  {
    system: "HubSpot",
    name: "Update property and segment",
    detail: "Sets course status without touching Appiant-owned contact identity fields.",
  },
  {
    system: "Google Workspace",
    name: "Append delivery row",
    detail: "Writes a clear operations log for Customer Success and VA follow-up.",
  },
  {
    system: "HubSpot",
    name: "Prepare template payload",
    detail: "Builds the post-enrollment template payload only after enrollment actions complete.",
  },
];

export function buildEnrollmentChecks(): EnrollmentCheck[] {
  return requiredSessions.map((session) => {
    const existing = existingMindbodyEnrollments.find(
      (enrollment) => enrollment.classId === session.mindbodyClassId,
    );

    if (existing) {
      return {
        ...session,
        status: "Already enrolled",
        existingVisitId: existing.visitId,
        action: "skip",
        reason: "Mindbody already has a booked visit for this class.",
      };
    }

    return {
      ...session,
      status: "Missing",
      action: "add_client_to_class",
      reason: "Required course session is not present in the client's current Mindbody schedule.",
    };
  });
}

export function buildScenarioResult() {
  const enrollmentChecks = buildEnrollmentChecks();
  const missingSessions = enrollmentChecks.filter((check) => check.action === "add_client_to_class");

  return {
    scenario: "mindbody_course_purchase_to_enrollment_completion",
    mode: "prototype_dry_run",
    dryRun: true,
    receivedAt: new Date().toISOString(),
    sourceEvent: {
      ...coursePurchase,
      student,
    },
    mindbody: {
      connector: "StartIntegrate/MAXMEL Mindbody app for Make.com",
      searchClientInput: {
        email: student.email,
        mindbodyClientId: student.mindbodyClientId,
      },
      enrollmentChecks,
      actionsToRun: missingSessions.map((session) => ({
        module: "Add a Client to a Class",
        clientId: student.mindbodyClientId,
        classId: session.mindbodyClassId,
        reason: session.reason,
      })),
      duplicateProtection: "Class IDs already present in the client's schedule are skipped.",
    },
    appiantGuardrail: {
      rule: "Do not update HubSpot identity fields currently owned by Appiant's Mindbody-HubSpot sync.",
      allowedHubSpotWrites: ["course_status", "current_course", "enrollment_audit"],
      blockedHubSpotWrites: ["firstname", "lastname", "email", "phone", "mindbody_client_id"],
    },
    hubSpot: {
      contactId: student.hubSpotContactId,
      propertyUpdate: {
        course_status: missingSessions.length === 0 ? "enrolled_complete" : "enrollment_updated",
        current_course: coursePurchase.courseName,
        enrollment_audit: `${missingSessions.length} missing session(s) prepared by Make dry run.`,
      },
      segmentAction: {
        listName: "Current EF Foundations Students",
        action: "add_contact_to_list",
      },
      confirmationEmail: {
        template: "EF Foundations enrollment confirmation",
        to: student.guardianEmail,
        personalization: {
          studentName: student.name,
          courseName: coursePurchase.courseName,
          firstSession: requiredSessions[0]?.startsAt,
        },
      },
    },
    googleSheet: {
      sheet: "Course purchase automation log",
      appendedRow: {
        purchaseId: coursePurchase.purchaseId,
        studentName: student.name,
        courseName: coursePurchase.courseName,
        requiredSessions: requiredSessions.length,
        alreadyEnrolled: enrollmentChecks.filter((check) => check.status === "Already enrolled").length,
        addedSessions: missingSessions.length,
        status: "Ready for live Make build",
      },
    },
    vaAlert: {
      required: missingSessions.length > 0,
      channel: "Internal ops notification",
      message: `${student.name} had ${missingSessions.length} missing Mindbody session(s). Review the add-class result before follow-up.`,
    },
    requirementCoverage,
    makeModuleBlueprint,
    edgeCaseChecks,
    prototypeValueMetrics,
    documentationChecklist,
  };
}
