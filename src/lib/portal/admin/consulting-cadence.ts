import type { FollowUpStep } from "./acquisition";

const NEXT_STEP: Record<FollowUpStep, FollowUpStep | null> = {
  0: 3,
  3: 7,
  7: 14,
  14: null,
};

export function nextFollowUpStep(current: FollowUpStep) {
  return NEXT_STEP[current];
}

export function followUpDueAt(from: string | Date, step: number) {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + step);
  return date.toISOString();
}

export function followUpTitle(step: FollowUpStep, organization: string) {
  if (step === 3)
    return `Add one useful implementation observation for ${organization}`;
  if (step === 7)
    return `Offer a bounded first step or proof asset to ${organization}`;
  if (step === 14) return `Close the loop with ${organization}`;
  return `Send the initial useful response to ${organization}`;
}

export function followUpGuidance(step: FollowUpStep) {
  if (step === 3)
    return "Add a concrete implementation observation or one clarifying question. Do not just check in.";
  if (step === 7)
    return "Offer a small first engagement or a directly relevant proof asset.";
  if (step === 14)
    return "Send a concise close-the-loop note, then move the opportunity to nurture if unanswered.";
  return "Lead with one useful observation and a low-risk first step. Human review is required before sending.";
}
