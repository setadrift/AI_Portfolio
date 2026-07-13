export const OPPORTUNITY_TYPES = [
  "direct_client",
  "partner_overflow",
  "warm_referral",
  "past_client_expansion",
  "platform_program",
  "strategic_partner",
] as const;

export const OPPORTUNITY_STAGES = [
  "new",
  "qualified",
  "ready_to_contact",
  "contacted",
  "replied",
  "discovery_booked",
  "discovery_complete",
  "proposal_drafting",
  "proposal_sent",
  "won",
  "lost",
  "nurture",
] as const;

export const COMMITMENT_STATUSES = [
  "todo",
  "doing",
  "waiting",
  "done",
  "cancelled",
] as const;
export const FOLLOW_UP_STEPS = [0, 3, 7, 14] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];
export type FollowUpStep = (typeof FOLLOW_UP_STEPS)[number];

export interface ConsultingOfferRecord {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  buyer: string;
  outcome: string;
  deliverables: string[];
  durationText: string;
  pricingModel: string;
  priceCents: number | null;
  currencyCode: string | null;
  conversionPath: string;
}

export interface ConsultingOpportunityRecord {
  id: string;
  legacyId: string | null;
  opportunityType: OpportunityType;
  stage: OpportunityStage;
  name: string;
  organization: string;
  contactEmail: string | null;
  contactUrl: string | null;
  painPoint: string;
  evidenceSummary: string;
  messageAngle: string;
  sourceFamily: string;
  sourceId: string | null;
  sourceLeadKey: string | null;
  primaryOfferId: string | null;
  estimatedValueCents: number | null;
  currencyCode: string | null;
  probabilityPercent: number | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  lastContactAt: string | null;
  discoveryAt: string | null;
  proposalSentAt: string | null;
  proposalReference: string | null;
  closedAt: string | null;
  lossReason: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultingActivityRecord {
  id: string;
  opportunityId: string | null;
  partnerId: string | null;
  activityType: string;
  channel: string | null;
  occurredAt: string;
  summary: string;
  outcome: string | null;
  externalReference: string | null;
  createdBy: string;
}

export interface ConsultingCommitmentRecord {
  id: string;
  legacyId: string | null;
  opportunityId: string | null;
  partnerId: string | null;
  assetId: string | null;
  projectId: string | null;
  commitmentType: string;
  title: string;
  dueAt: string;
  status: CommitmentStatus;
  sequenceStep: FollowUpStep | null;
  completedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultingPartnerRecord {
  id: string;
  legacyId: string | null;
  name: string;
  organization: string;
  category: string;
  relationshipStage: string;
  geography: string;
  clientFocus: string;
  complementaryCapabilities: string;
  overflowAngle: string;
  contactUrl: string | null;
  contactEmail: string | null;
  relationshipStrength: number;
  lastContactAt: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  referralsGiven: number;
  referralsReceived: number;
  notes: string;
}

export interface ConsultingProofAssetRecord {
  id: string;
  legacyId: string | null;
  title: string;
  assetType: string;
  stage: string;
  intendedBuyer: string;
  buyerDecision: string;
  scenarioLabel: string;
  businessProblem: string;
  currentProcessCost: string;
  proposedWorkflow: string;
  controlsAndReview: string;
  expectedOutcome: string;
  primaryOfferId: string | null;
  publicUrl: string | null;
  repositoryReference: string | null;
  publishedAt: string | null;
  reuseCount: number;
  updatedAt: string;
}

export interface ConsultingPlatformProgramRecord {
  id: string;
  slug: string;
  name: string;
  officialUrl: string;
  status: string;
  eligibilityRequirements: string;
  evidenceRequired: string;
  completedMilestones: string[];
  nextAction: string | null;
  nextActionDueAt: string | null;
  applicationAt: string | null;
  decision: string | null;
  verifiedAt: string | null;
  notes: string;
}

export interface ConsultingProjectRecord {
  id: string;
  legacyId: string | null;
  opportunityId: string | null;
  client: string;
  project: string;
  status: string;
  phase: string;
  feeCents: number;
  currencyCode: string | null;
  valueEstimate: string | null;
  paymentStatus: string;
  startedAt: string;
  targetDate: string | null;
  nextAction: string;
  scope: string;
  successCriteria: string[];
  links: Array<{ label: string; href?: string; reference?: string }>;
  notes: string;
}

export interface ConsultingAssetUseRecord {
  assetId: string;
  opportunityId: string;
  usedAt: string;
  notes: string;
}

export interface ConsultingWeeklySnapshotRecord {
  weekStart: string;
  metrics: Record<string, unknown>;
  lesson: string;
  generatedAt: string;
}

export interface AcquisitionData {
  configured: boolean;
  opportunities: ConsultingOpportunityRecord[];
  activities: ConsultingActivityRecord[];
  commitments: ConsultingCommitmentRecord[];
  partners: ConsultingPartnerRecord[];
  proofAssets: ConsultingProofAssetRecord[];
  offers: ConsultingOfferRecord[];
  programs: ConsultingPlatformProgramRecord[];
  projects: ConsultingProjectRecord[];
  assetUses: ConsultingAssetUseRecord[];
  weeklySnapshots: ConsultingWeeklySnapshotRecord[];
}

export interface AcquisitionMetrics {
  weekStart: string;
  partnerContacts: number;
  warmConversations: number;
  proofAssetsAdvanced: number;
  partnerTarget: number;
  warmTarget: number;
  proofTarget: number;
  overdueCommitments: number;
  dueToday: number;
  pipelineByCurrency: Record<string, number>;
  stageCounts: Record<string, number>;
  funnel: Array<{
    from: string;
    to: string;
    numerator: number;
    denominator: number;
    rate: number;
  }>;
  medianResponseHours: number | null;
}

export function stageLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isClosedStage(stage: OpportunityStage) {
  return stage === "won" || stage === "lost";
}
