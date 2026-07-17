import {
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  type ConsultingOpportunityRecord,
  type OpportunityStage,
  type OpportunityType,
} from "./acquisition";

const ACTIVE_STAGES = new Set<OpportunityStage>(
  OPPORTUNITY_STAGES.filter((stage) => !["won", "lost"].includes(stage)),
);

export function opportunityInputErrors(
  input: Partial<ConsultingOpportunityRecord>,
) {
  const errors: string[] = [];
  if (!String(input.name || "").trim())
    errors.push("A contact or opportunity name is required.");
  if (!String(input.organization || "").trim())
    errors.push("An organization is required.");
  if (!OPPORTUNITY_TYPES.includes(input.opportunityType as OpportunityType))
    errors.push("Choose a valid opportunity type.");
  if (!OPPORTUNITY_STAGES.includes(input.stage as OpportunityStage))
    errors.push("Choose a valid pipeline stage.");
  if (
    input.estimatedValueCents != null &&
    (!Number.isSafeInteger(input.estimatedValueCents) || input.estimatedValueCents < 0)
  ) {
    errors.push("Estimated value must be a non-negative whole number of cents.");
  }
  if (
    input.probabilityPercent != null &&
    (!Number.isInteger(input.probabilityPercent) ||
      input.probabilityPercent < 0 ||
      input.probabilityPercent > 100)
  ) {
    errors.push("Probability must be a whole number between 0 and 100.");
  }
  if (input.stage && ACTIVE_STAGES.has(input.stage as OpportunityStage)) {
    if (!String(input.nextAction || "").trim())
      errors.push("Active opportunities require a next action.");
    if (!input.nextActionDueAt)
      errors.push("Active opportunities require a next-action due date.");
    else if (!isValidDate(input.nextActionDueAt))
      errors.push("Active opportunities require a valid next-action due date.");
  }
  if (input.stage === "ready_to_contact") {
    if (!input.contactEmail && !input.contactUrl)
      errors.push("Ready-to-contact opportunities require a response path.");
    if (!String(input.messageAngle || "").trim())
      errors.push(
        "Ready-to-contact opportunities require a specific message angle.",
      );
  }
  if (input.stage === "discovery_booked") {
    if (!input.discoveryAt) errors.push("Discovery booked requires a scheduled date.");
    else if (!isValidDate(input.discoveryAt))
      errors.push("Discovery booked requires a valid scheduled date.");
  }
  if (input.stage === "proposal_sent") {
    if (!input.proposalSentAt) errors.push("Proposal sent date is required.");
    else if (!isValidDate(input.proposalSentAt))
      errors.push("Proposal sent requires a valid proposal sent date.");
    if (input.estimatedValueCents == null)
      errors.push(
        "Proposal value is required. Use 0 only when explicitly unknown.",
      );
    if (!input.currencyCode) errors.push("Proposal currency is required.");
    if (!input.primaryOfferId)
      errors.push("Choose a primary offer or Custom scope before proposal.");
    if (!input.proposalReference)
      errors.push("Proposal sent requires a proposal reference or URL.");
  }
  if (input.stage === "lost" && !String(input.lossReason || "").trim())
    errors.push("Lost opportunities require a loss reason.");
  return errors;
}

function isValidDate(value: string | Date) {
  return !Number.isNaN(new Date(value).getTime());
}
