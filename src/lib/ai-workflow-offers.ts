export type WorkflowOfferPath = {
  id: string;
  title: string;
  eyebrow: string;
  body: string;
  outcome: string;
  bestFor: string[];
  links: string[];
};

export const WORKFLOW_OFFER_PATHS: WorkflowOfferPath[] = [
  {
    id: "revenue-follow-up",
    title: "Revenue Follow-Up Workflow",
    eyebrow: "Quotes, estimates, consults",
    body: "For service teams where good opportunities go stale after the first call, inspection, estimate, consult, or repair recommendation.",
    outcome:
      "A visible queue for open opportunities, next follow-up owner, customer context, and review-first follow-up drafts.",
    bestFor: [
      "Roofing contractors",
      "HVAC and plumbing service companies",
      "Med spas and consult-driven local services",
    ],
    links: [
      "roofing-estimate-follow-up",
      "hvac-plumbing-dispatch-follow-up",
      "med-spa-lead-intake-follow-up",
    ],
  },
  {
    id: "document-intake-review",
    title: "Document Intake and Review Workflow",
    eyebrow: "PDFs, photos, forms, receipts",
    body: "For teams buried in document-heavy admin where missing information, messy attachments, and manual review slow down the real work.",
    outcome:
      "An intake queue with missing-info checks, summaries, classifications, status, and a human approval step before records change.",
    bestFor: [
      "Commercial subcontractors",
      "Property managers",
      "Bookkeepers and accounting teams",
      "Insurance brokerages",
      "Small law firms",
    ],
    links: [
      "construction-bid-package-review",
      "property-management-maintenance-intake",
      "bookkeeping-receipt-cleanup",
      "insurance-renewal-intake",
      "legal-client-intake",
    ],
  },
  {
    id: "operations-admin-queue",
    title: "Operations Inbox and Admin Queue",
    eyebrow: "Shared inboxes, forms, spreadsheets",
    body: "For owner-led firms where work arrives through too many channels and nobody has a dependable view of owner, status, aging, and next action.",
    outcome:
      "A practical operating queue that triages requests, drafts next steps, flags exceptions, and gives the team a status view.",
    bestFor: [
      "Owner-led service businesses",
      "Teams without a clean system of record",
      "Businesses running on inboxes and spreadsheets",
    ],
    links: [],
  },
];

export const FEATURED_WORKFLOW_SLUGS = [
  "roofing-estimate-follow-up",
  "hvac-plumbing-dispatch-follow-up",
  "construction-bid-package-review",
  "property-management-maintenance-intake",
  "bookkeeping-receipt-cleanup",
  "legal-client-intake",
];

export function getOfferForWorkflow(slug: string) {
  return WORKFLOW_OFFER_PATHS.find((offer) => offer.links.includes(slug));
}

export function getVerticalExclusion(slug: string) {
  const exclusions: Record<string, string> = {
    "construction-bid-package-review":
      "This is not full estimating, takeoff, or a replacement for estimator judgment.",
    "roofing-estimate-follow-up":
      "This is not generic lead generation; it is the workflow after a roofing opportunity already exists.",
    "hvac-plumbing-dispatch-follow-up":
      "This is business workflow automation, not thermostats, controls, sensors, or building hardware.",
    "property-management-maintenance-intake":
      "This is not property management software replacement; it cleans up intake, vendor follow-through, and status.",
    "bookkeeping-receipt-cleanup":
      "This does not replace bookkeeping judgment; it prepares documents, status, and questions for review.",
    "dental-clinic-front-desk-recall":
      "This supports front desk follow-up and admin consistency, not clinical judgment.",
    "med-spa-lead-intake-follow-up":
      "This improves inquiry and consult follow-up; it is not medical advice or treatment recommendation.",
    "staffing-candidate-screening":
      "This supports intake, screening, and status review; hiring judgment stays with the recruiting team.",
    "manufacturing-rfq-triage":
      "This supports quote operations and missing-info triage; pricing and production judgment stay with the shop.",
    "insurance-renewal-intake":
      "This supports renewal and document admin, not coverage advice or underwriting decisions.",
    "legal-client-intake":
      "This supports intake admin and matter-opening workflow, not legal advice generation.",
  };

  return exclusions[slug] || "This is review-first workflow automation, not a promise to automate every decision.";
}
