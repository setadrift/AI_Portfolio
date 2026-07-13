import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AcquisitionData,
  ConsultingActivityRecord,
  ConsultingAssetUseRecord,
  ConsultingWeeklySnapshotRecord,
  ConsultingCommitmentRecord,
  ConsultingOfferRecord,
  ConsultingOpportunityRecord,
  ConsultingPartnerRecord,
  ConsultingPlatformProgramRecord,
  ConsultingProjectRecord,
  ConsultingProofAssetRecord,
  FollowUpStep,
  OpportunityStage,
  OpportunityType,
} from "./acquisition";
import {
  followUpDueAt,
  followUpGuidance,
  followUpTitle,
  nextFollowUpStep,
} from "./consulting-cadence";
import { opportunityInputErrors } from "./consulting-validation";

type MutationResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; status?: number };

let cachedClient: SupabaseClient | null = null;

export function isAcquisitionDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && supabaseAdminKey());
}

function adminClient() {
  const adminKey = supabaseAdminKey();
  if (!process.env.SUPABASE_URL || !adminKey) return null;
  cachedClient ??= createClient(process.env.SUPABASE_URL, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

function supabaseAdminKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  );
}

export async function readAcquisitionData(): Promise<AcquisitionData> {
  const db = adminClient();
  if (!db) return emptyData(false);

  const [
    opportunities,
    activities,
    commitments,
    partners,
    assets,
    offers,
    programs,
    projects,
    assetUses,
    weeklySnapshots,
  ] = await Promise.all([
    db
      .from("consulting_opportunities")
      .select("*")
      .order("updated_at", { ascending: false }),
    db
      .from("consulting_activities")
      .select("*")
      .order("occurred_at", { ascending: false }),
    db
      .from("consulting_commitments")
      .select("*")
      .order("due_at", { ascending: true }),
    db
      .from("consulting_partners")
      .select("*")
      .order("updated_at", { ascending: false }),
    db
      .from("consulting_proof_assets")
      .select("*")
      .order("updated_at", { ascending: false }),
    db.from("consulting_offers").select("*").order("name"),
    db.from("consulting_platform_programs").select("*").order("name"),
    db
      .from("consulting_projects")
      .select("*")
      .order("started_at", { ascending: false }),
    db.from("consulting_asset_uses").select("*"),
    db
      .from("consulting_weekly_snapshots")
      .select("*")
      .order("week_start", { ascending: false }),
  ]);

  const results = [
    opportunities,
    activities,
    commitments,
    partners,
    assets,
    offers,
    programs,
    projects,
    assetUses,
    weeklySnapshots,
  ];
  const schemaMissing = results.some(
    (result) =>
      result.error?.code === "42P01" || result.error?.code === "PGRST205",
  );
  if (schemaMissing) return emptyData(false);
  const error = results.find((result) => result.error)?.error;
  if (error)
    throw new Error(
      `Failed to read consulting acquisition data: ${error.message}`,
    );

  const reuseCounts = (assetUses.data ?? []).reduce<Record<string, number>>(
    (counts, row) => {
      const id = String(row.asset_id || "");
      if (id) counts[id] = (counts[id] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return {
    configured: true,
    opportunities: (opportunities.data ?? []).map(mapOpportunity),
    activities: (activities.data ?? []).map(mapActivity),
    commitments: (commitments.data ?? []).map(mapCommitment),
    partners: (partners.data ?? []).map(mapPartner),
    proofAssets: (assets.data ?? []).map((row) =>
      mapProofAsset(row, reuseCounts[String(row.id)] ?? 0),
    ),
    offers: (offers.data ?? []).map(mapOffer),
    programs: (programs.data ?? []).map(mapProgram),
    projects: (projects.data ?? []).map(mapProject),
    assetUses: (assetUses.data ?? []).map(mapAssetUse),
    weeklySnapshots: (weeklySnapshots.data ?? []).map(mapWeeklySnapshot),
  };
}

export async function createOpportunity(
  input: Partial<ConsultingOpportunityRecord>,
): Promise<MutationResult<ConsultingOpportunityRecord>> {
  const errors = opportunityInputErrors(input);
  if (errors.length) return { ok: false, error: errors.join(" "), status: 400 };
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db
    .from("consulting_opportunities")
    .insert(opportunityRow(input))
    .select("*")
    .single();
  if (error) return databaseError(error);
  return { ok: true, data: mapOpportunity(data) };
}

export async function updateOpportunity(
  id: string,
  patch: Partial<ConsultingOpportunityRecord>,
): Promise<MutationResult<ConsultingOpportunityRecord>> {
  const db = adminClient();
  if (!db) return notConfigured();
  const { data: existing, error: readError } = await db
    .from("consulting_opportunities")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) return databaseError(readError);
  const merged = { ...mapOpportunity(existing), ...patch };
  const errors = opportunityInputErrors(merged);
  if (errors.length) return { ok: false, error: errors.join(" "), status: 400 };
  if (patch.stage === "won") {
    const { data: project } = await db
      .from("consulting_projects")
      .select("id")
      .eq("opportunity_id", id)
      .maybeSingle();
    if (!project)
      return {
        ok: false,
        error:
          "Create the project handoff before marking this opportunity won.",
        status: 400,
      };
  }
  if (patch.stage === "contacted") {
    const { count } = await db
      .from("consulting_activities")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", id)
      .in("activity_type", ["comment", "dm", "email", "application"]);
    if (!count)
      return {
        ok: false,
        error:
          "Record the actual outbound activity and channel before marking this opportunity contacted.",
        status: 400,
      };
  }
  const { data, error } = await db
    .from("consulting_opportunities")
    .update(opportunityRow(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) return databaseError(error);
  if (patch.stage && patch.stage !== mapOpportunity(existing).stage) {
    await db.from("consulting_activities").insert({
      opportunity_id: id,
      activity_type: "stage_change",
      summary: `Stage changed from ${mapOpportunity(existing).stage} to ${patch.stage}.`,
      occurred_at: new Date().toISOString(),
      created_by: "duncan",
    });
  }
  return { ok: true, data: mapOpportunity(data) };
}

export async function promoteLead(input: {
  sourceId: string;
  leadKey: string;
  opportunityType: OpportunityType;
  nextAction: string;
  nextActionDueAt: string;
  primaryOfferId?: string | null;
}): Promise<MutationResult<ConsultingOpportunityRecord>> {
  const db = adminClient();
  if (!db) return notConfigured();

  const { data: existing } = await db
    .from("consulting_opportunities")
    .select("*")
    .eq("source_id", input.sourceId)
    .eq("source_lead_key", input.leadKey)
    .maybeSingle();
  if (existing) {
    const { error: repairError } = await db.from("admin_lead_states").upsert(
      {
        source_id: input.sourceId,
        lead_key: input.leadKey,
        queue: "actionable",
        action: "converted",
        notes: `Linked to consulting opportunity ${existing.id}.`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id,lead_key" },
    );
    if (repairError)
      return {
        ok: false,
        error: `Opportunity ${existing.id} exists, but the lead state could not be repaired: ${repairError.message}. Retrying is safe.`,
        status: 409,
      };
    return { ok: true, data: mapOpportunity(existing) };
  }

  const { data: lead, error: leadError } = await db
    .from("admin_leads")
    .select("*")
    .eq("source_id", input.sourceId)
    .eq("lead_key", input.leadKey)
    .single();
  if (leadError) return databaseError(leadError);
  const payload = objectValue(lead.payload);
  const opportunity = {
    opportunityType: input.opportunityType,
    stage: "qualified" as OpportunityStage,
    name:
      stringValue(payload.author) ||
      stringValue(lead.author) ||
      stringValue(lead.title),
    organization:
      stringValue(payload.business) ||
      stringValue(payload.sourceLabel) ||
      stringValue(lead.source_label) ||
      "Unknown business",
    contactEmail: nullableString(payload.email),
    contactUrl: stringValue(lead.url) || null,
    painPoint:
      stringValue(payload.evidenceSummary) ||
      stringValue(payload.reason) ||
      stringValue(lead.reason) ||
      stringValue(lead.title),
    evidenceSummary:
      [
        stringValue(payload.explicitEvidence),
        stringValue(payload.missingEvidence)
          ? `Missing: ${stringValue(payload.missingEvidence)}`
          : "",
      ]
        .filter(Boolean)
        .join(" ") || stringValue(lead.reason),
    messageAngle:
      stringValue(payload.replyAngle) || stringValue(payload.nextStep),
    sourceFamily:
      stringValue(payload.sourceFamily) ||
      stringValue(lead.source_kind) ||
      input.sourceId,
    sourceId: input.sourceId,
    sourceLeadKey: input.leadKey,
    primaryOfferId: input.primaryOfferId ?? null,
    nextAction: input.nextAction,
    nextActionDueAt: input.nextActionDueAt,
    notes: `Promoted from ${input.sourceId} discovery evidence.`,
  };
  const { data: candidates } = await db
    .from("consulting_opportunities")
    .select("*");
  const duplicate = (candidates ?? [])
    .map(mapOpportunity)
    .find(
      (item) =>
        (opportunity.contactUrl &&
          item.contactUrl &&
          normalizeUrl(opportunity.contactUrl) ===
            normalizeUrl(item.contactUrl)) ||
        (opportunity.contactEmail &&
          item.contactEmail &&
          opportunity.contactEmail.toLowerCase() ===
            item.contactEmail.toLowerCase()) ||
        (opportunity.organization !== "Unknown business" &&
          normalizeName(opportunity.organization) ===
            normalizeName(item.organization)),
    );
  if (duplicate) {
    const { data: linked, error: linkError } = await db
      .from("consulting_opportunities")
      .update({
        source_id: input.sourceId,
        source_lead_key: input.leadKey,
        source_family: opportunity.sourceFamily,
        evidence_summary: [
          duplicate.evidenceSummary,
          opportunity.evidenceSummary,
        ]
          .filter(Boolean)
          .join("\n\n"),
        primary_offer_id:
          duplicate.primaryOfferId || opportunity.primaryOfferId,
      })
      .eq("id", duplicate.id)
      .select("*")
      .single();
    if (linkError) return databaseError(linkError);
    await db.from("consulting_activities").insert({
      opportunity_id: duplicate.id,
      activity_type: "qualified",
      occurred_at: new Date().toISOString(),
      summary:
        "Linked reviewed discovery evidence to an existing consulting opportunity.",
      external_reference: opportunity.contactUrl,
      created_by: "duncan",
    });
    const { error: stateError } = await db.from("admin_lead_states").upsert(
      {
        source_id: input.sourceId,
        lead_key: input.leadKey,
        queue: "actionable",
        action: "converted",
        notes: `Linked to consulting opportunity ${duplicate.id}.`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id,lead_key" },
    );
    if (stateError)
      return {
        ok: false,
        error: `Opportunity ${duplicate.id} was linked, but the lead state could not be updated: ${stateError.message}. Retrying is safe.`,
        status: 409,
      };
    return { ok: true, data: mapOpportunity(linked) };
  }
  const created = await createOpportunity(opportunity);
  if (!created.ok) return created;

  await db.from("consulting_activities").insert({
    opportunity_id: created.data.id,
    activity_type: "qualified",
    occurred_at: new Date().toISOString(),
    summary:
      "Promoted from the reviewed lead board into the consulting pipeline.",
    external_reference: created.data.contactUrl,
    created_by: "duncan",
  });
  const { error: stateError } = await db.from("admin_lead_states").upsert(
    {
      source_id: input.sourceId,
      lead_key: input.leadKey,
      queue: "actionable",
      action: "converted",
      notes: `Promoted to consulting opportunity ${created.data.id}.`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source_id,lead_key" },
  );
  if (stateError) {
    return {
      ok: false,
      error: `Opportunity ${created.data.id} was created, but the lead state could not be updated: ${stateError.message}. Retrying is safe.`,
      status: 409,
    };
  }
  return created;
}

export async function createActivity(
  input: Partial<ConsultingActivityRecord>,
): Promise<MutationResult<ConsultingActivityRecord>> {
  if (!input.opportunityId && !input.partnerId)
    return {
      ok: false,
      error: "Choose an opportunity or partner.",
      status: 400,
    };
  if (
    !String(input.activityType || "").trim() ||
    !String(input.summary || "").trim()
  ) {
    return {
      ok: false,
      error: "Activity type and summary are required.",
      status: 400,
    };
  }
  if (
    ["comment", "dm", "email", "application"].includes(
      String(input.activityType),
    ) &&
    !String(input.channel || "").trim()
  )
    return {
      ok: false,
      error: "Outbound activities require a channel.",
      status: 400,
    };
  const db = adminClient();
  if (!db) return notConfigured();
  const row = {
    opportunity_id: input.opportunityId ?? null,
    partner_id: input.partnerId ?? null,
    activity_type: input.activityType,
    channel: input.channel ?? null,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
    summary: input.summary,
    outcome: input.outcome ?? null,
    external_reference: input.externalReference ?? null,
    created_by: input.createdBy ?? "duncan",
  };
  const { data, error } = await db
    .from("consulting_activities")
    .insert(row)
    .select("*")
    .single();
  if (error) return databaseError(error);

  if (input.opportunityId) {
    const outbound = ["comment", "dm", "email", "application"].includes(
      String(input.activityType),
    );
    const reply = input.activityType === "reply";
    if (outbound) {
      const { data: opportunity } = await db
        .from("consulting_opportunities")
        .select("organization")
        .eq("id", input.opportunityId)
        .single();
      await db
        .from("consulting_opportunities")
        .update({
          stage: "contacted",
          last_contact_at: row.occurred_at,
        })
        .eq("id", input.opportunityId);
      await createCommitment({
        opportunityId: input.opportunityId,
        commitmentType: "follow_up",
        title: followUpTitle(
          3,
          stringValue(opportunity?.organization) || "this opportunity",
        ),
        dueAt: followUpDueAt(row.occurred_at, 3),
        status: "todo",
        sequenceStep: 3,
        notes: followUpGuidance(3),
      });
    }
    if (reply) {
      await db
        .from("consulting_opportunities")
        .update({ stage: "replied" })
        .eq("id", input.opportunityId);
      await db
        .from("consulting_commitments")
        .update({ status: "cancelled" })
        .eq("opportunity_id", input.opportunityId)
        .eq("commitment_type", "follow_up")
        .in("status", ["todo", "doing", "waiting"]);
    }
  }
  if (
    input.partnerId &&
    ["dm", "email", "call", "referral"].includes(String(input.activityType))
  ) {
    await db
      .from("consulting_partners")
      .update({
        last_contact_at: row.occurred_at,
        relationship_stage: "contacted",
      })
      .eq("id", input.partnerId);
  }
  return { ok: true, data: mapActivity(data) };
}

export async function createCommitment(
  input: Partial<ConsultingCommitmentRecord>,
): Promise<MutationResult<ConsultingCommitmentRecord>> {
  if (
    !input.opportunityId &&
    !input.partnerId &&
    !input.assetId &&
    !input.projectId
  ) {
    return {
      ok: false,
      error:
        "A commitment must belong to an opportunity, partner, proof asset, or project.",
      status: 400,
    };
  }
  if (
    input.status &&
    !["todo", "doing", "waiting", "done", "cancelled"].includes(input.status)
  )
    return {
      ok: false,
      error: "Choose a valid commitment status.",
      status: 400,
    };
  if (input.sequenceStep != null && ![0, 3, 7, 14].includes(input.sequenceStep))
    return { ok: false, error: "Choose a valid follow-up step.", status: 400 };
  if (
    !String(input.title || "").trim() ||
    !input.dueAt ||
    !String(input.commitmentType || "").trim()
  ) {
    return {
      ok: false,
      error: "Commitment type, title, and due date are required.",
      status: 400,
    };
  }
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db
    .from("consulting_commitments")
    .insert(commitmentRow(input))
    .select("*")
    .single();
  if (error) return databaseError(error);
  return { ok: true, data: mapCommitment(data) };
}

export async function updateCommitment(
  id: string,
  patch: Partial<ConsultingCommitmentRecord>,
): Promise<MutationResult<ConsultingCommitmentRecord>> {
  if (
    patch.status &&
    !["todo", "doing", "waiting", "done", "cancelled"].includes(patch.status)
  )
    return {
      ok: false,
      error: "Choose a valid commitment status.",
      status: 400,
    };
  const db = adminClient();
  if (!db) return notConfigured();
  const { data: existing, error: readError } = await db
    .from("consulting_commitments")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) return databaseError(readError);
  const update = commitmentRow(patch);
  if (patch.status === "done" && !patch.completedAt)
    update.completed_at = new Date().toISOString();
  const { data, error } = await db
    .from("consulting_commitments")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return databaseError(error);
  const completed = mapCommitment(data);
  const prior = mapCommitment(existing);
  if (
    patch.status === "done" &&
    prior.status !== "done" &&
    completed.sequenceStep &&
    completed.opportunityId
  ) {
    const next = nextFollowUpStep(completed.sequenceStep);
    if (next) {
      const { data: opportunity } = await db
        .from("consulting_opportunities")
        .select("organization")
        .eq("id", completed.opportunityId)
        .single();
      await createCommitment({
        opportunityId: completed.opportunityId,
        commitmentType: "follow_up",
        title: followUpTitle(
          next,
          stringValue(opportunity?.organization) || "this opportunity",
        ),
        dueAt: followUpDueAt(
          completed.completedAt || new Date(),
          next - completed.sequenceStep,
        ),
        status: "todo",
        sequenceStep: next,
        notes: followUpGuidance(next),
      });
    } else if (completed.sequenceStep === 14) {
      const revisitAt = new Date(completed.completedAt || new Date());
      revisitAt.setDate(revisitAt.getDate() + 30);
      await db
        .from("consulting_opportunities")
        .update({
          stage: "nurture",
          next_action:
            "Revisit only with new evidence, a relevant trigger, or a useful proof asset.",
          next_action_due_at: revisitAt.toISOString(),
        })
        .eq("id", completed.opportunityId);
      await db.from("consulting_activities").insert({
        opportunity_id: completed.opportunityId,
        activity_type: "stage_change",
        occurred_at: new Date().toISOString(),
        summary:
          "Day 14 close-the-loop completed without a reply; moved to nurture.",
        created_by: "duncan",
      });
    }
  }
  return { ok: true, data: completed };
}

export async function endFollowUpSequence(
  id: string,
): Promise<MutationResult<ConsultingCommitmentRecord>> {
  const db = adminClient();
  if (!db) return notConfigured();
  const { data: existing, error } = await db
    .from("consulting_commitments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return databaseError(error);
  const commitment = mapCommitment(existing);
  if (!commitment.opportunityId || commitment.commitmentType !== "follow_up")
    return updateCommitment(id, { status: "cancelled" });
  const { error: cancelError } = await db
    .from("consulting_commitments")
    .update({ status: "cancelled" })
    .eq("opportunity_id", commitment.opportunityId)
    .eq("commitment_type", "follow_up")
    .in("status", ["todo", "doing", "waiting"]);
  if (cancelError) return databaseError(cancelError);
  const { data } = await db
    .from("consulting_commitments")
    .select("*")
    .eq("id", id)
    .single();
  return { ok: true, data: mapCommitment(data!) };
}

export async function createPartner(
  input: Partial<ConsultingPartnerRecord>,
): Promise<MutationResult<ConsultingPartnerRecord>> {
  if (
    !String(input.name || "").trim() ||
    !String(input.organization || "").trim()
  ) {
    return {
      ok: false,
      error: "Partner name and organization are required.",
      status: 400,
    };
  }
  if (
    input.relationshipStrength != null &&
    (input.relationshipStrength < 1 || input.relationshipStrength > 5)
  )
    return {
      ok: false,
      error: "Relationship strength must be between 1 and 5.",
      status: 400,
    };
  return insertMapped("consulting_partners", partnerRow(input), mapPartner);
}

export async function updatePartner(
  id: string,
  input: Partial<ConsultingPartnerRecord>,
) {
  if (
    input.relationshipStrength != null &&
    (input.relationshipStrength < 1 || input.relationshipStrength > 5)
  )
    return {
      ok: false as const,
      error: "Relationship strength must be between 1 and 5.",
      status: 400,
    };
  return updateMapped("consulting_partners", id, partnerRow(input), mapPartner);
}

export async function createProofAsset(
  input: Partial<ConsultingProofAssetRecord>,
): Promise<MutationResult<ConsultingProofAssetRecord>> {
  const missing = [
    ["title", input.title],
    ["intended buyer", input.intendedBuyer],
    ["buyer decision", input.buyerDecision],
    ["scenario label", input.scenarioLabel],
    ["business problem", input.businessProblem],
    ["current-process cost", input.currentProcessCost],
    ["proposed workflow", input.proposedWorkflow],
    ["controls and review", input.controlsAndReview],
    ["expected outcome", input.expectedOutcome],
  ]
    .filter(([, value]) => !String(value || "").trim())
    .map(([label]) => label);
  if (missing.length)
    return {
      ok: false,
      error: `Proof assets require: ${missing.join(", ")}.`,
      status: 400,
    };
  return insertMapped("consulting_proof_assets", proofAssetRow(input), (row) =>
    mapProofAsset(row, 0),
  );
}

export async function updateProofAsset(
  id: string,
  input: Partial<ConsultingProofAssetRecord>,
) {
  const required = [
    "title",
    "intendedBuyer",
    "buyerDecision",
    "scenarioLabel",
    "businessProblem",
    "currentProcessCost",
    "proposedWorkflow",
    "controlsAndReview",
    "expectedOutcome",
  ] as const;
  const blank = required.find(
    (key) => key in input && !String(input[key] || "").trim(),
  );
  if (blank)
    return {
      ok: false as const,
      error: `${blank} cannot be blank.`,
      status: 400,
    };
  return updateMapped(
    "consulting_proof_assets",
    id,
    proofAssetRow(input),
    (row) => mapProofAsset(row, 0),
  );
}

export async function updateOffer(
  id: string,
  input: Partial<ConsultingOfferRecord>,
) {
  if (input.priceCents != null && input.priceCents < 0)
    return {
      ok: false as const,
      error: "Offer price cannot be negative.",
      status: 400,
    };
  if (input.priceCents != null && !input.currencyCode)
    return {
      ok: false as const,
      error: "Priced offers require a currency.",
      status: 400,
    };
  return updateMapped("consulting_offers", id, offerRow(input), mapOffer);
}

export async function updateProgram(
  id: string,
  input: Partial<ConsultingPlatformProgramRecord>,
) {
  if (
    input.status &&
    ![
      "research",
      "preparing",
      "ready_to_apply",
      "applied",
      "accepted",
      "not_yet_eligible",
      "declined",
    ].includes(input.status)
  )
    return {
      ok: false as const,
      error: "Choose a valid program status.",
      status: 400,
    };
  return updateMapped(
    "consulting_platform_programs",
    id,
    programRow(input),
    mapProgram,
  );
}

export async function linkProofAsset(input: {
  assetId: string;
  opportunityId: string;
  notes?: string;
}): Promise<MutationResult<ConsultingAssetUseRecord>> {
  if (!input.assetId || !input.opportunityId)
    return {
      ok: false,
      error: "Choose a proof asset and opportunity.",
      status: 400,
    };
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db
    .from("consulting_asset_uses")
    .upsert(
      {
        asset_id: input.assetId,
        opportunity_id: input.opportunityId,
        notes: input.notes || "",
      },
      { onConflict: "asset_id,opportunity_id" },
    )
    .select("*")
    .single();
  if (error) return databaseError(error);
  return { ok: true, data: mapAssetUse(data) };
}

export async function handoffWonOpportunity(
  id: string,
  input: {
    projectName: string;
    nextAction: string;
    targetDate?: string | null;
  },
): Promise<MutationResult<ConsultingProjectRecord>> {
  if (!input.projectName.trim() || !input.nextAction.trim())
    return {
      ok: false,
      error: "Project name and delivery next action are required.",
      status: 400,
    };
  const db = adminClient();
  if (!db) return notConfigured();
  const { data: existingProject } = await db
    .from("consulting_projects")
    .select("*")
    .eq("opportunity_id", id)
    .maybeSingle();
  if (existingProject) return { ok: true, data: mapProject(existingProject) };
  const { data: row, error: readError } = await db
    .from("consulting_opportunities")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) return databaseError(readError);
  const opportunity = mapOpportunity(row);
  if (opportunity.estimatedValueCents == null || !opportunity.currencyCode)
    return {
      ok: false,
      error:
        "Confirm agreed value and currency before handoff. Use 0 when explicitly unknown.",
      status: 400,
    };
  const { data: project, error } = await db
    .from("consulting_projects")
    .insert({
      opportunity_id: id,
      client: opportunity.organization,
      project: input.projectName,
      status: "Active",
      phase: "Handoff",
      fee_cents: opportunity.estimatedValueCents,
      currency_code: opportunity.currencyCode,
      payment_status: "Not Invoiced",
      started_at: new Date().toISOString().slice(0, 10),
      target_date: input.targetDate || null,
      next_action: input.nextAction,
      scope: opportunity.painPoint,
      success_criteria: [],
      links: opportunity.contactUrl
        ? [{ label: "Original opportunity", href: opportunity.contactUrl }]
        : [],
      notes: `Created from won opportunity ${id}.`,
    })
    .select("*")
    .single();
  if (error) return databaseError(error);
  await db
    .from("consulting_opportunities")
    .update({
      stage: "won",
      closed_at: new Date().toISOString(),
      next_action: null,
      next_action_due_at: null,
      probability_percent: 100,
    })
    .eq("id", id);
  await db.from("consulting_activities").insert({
    opportunity_id: id,
    activity_type: "stage_change",
    summary: "Opportunity won and handed off to a delivery project.",
    occurred_at: new Date().toISOString(),
    created_by: "duncan",
  });
  await createCommitment({
    projectId: String(project.id),
    commitmentType: "project_handoff",
    title: input.nextAction,
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    status: "todo",
    notes: "First delivery commitment created during project handoff.",
  });
  return { ok: true, data: mapProject(project) };
}

export async function saveWeeklySnapshot(input: {
  weekStart: string;
  metrics: Record<string, unknown>;
  lesson: string;
}): Promise<MutationResult<ConsultingWeeklySnapshotRecord>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart))
    return { ok: false, error: "A valid week start is required.", status: 400 };
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db
    .from("consulting_weekly_snapshots")
    .upsert(
      {
        week_start: input.weekStart,
        metrics: input.metrics,
        lesson: input.lesson,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "week_start" },
    )
    .select("*")
    .single();
  if (error) return databaseError(error);
  return { ok: true, data: mapWeeklySnapshot(data) };
}

async function insertMapped<T>(
  table: string,
  row: Record<string, unknown>,
  mapper: (row: Record<string, unknown>) => T,
): Promise<MutationResult<T>> {
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db.from(table).insert(row).select("*").single();
  if (error) return databaseError(error);
  return { ok: true, data: mapper(data) };
}

async function updateMapped<T>(
  table: string,
  id: string,
  row: Record<string, unknown>,
  mapper: (row: Record<string, unknown>) => T,
): Promise<MutationResult<T>> {
  const db = adminClient();
  if (!db) return notConfigured();
  const { data, error } = await db
    .from(table)
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return databaseError(error);
  return { ok: true, data: mapper(data) };
}

function opportunityRow(input: Partial<ConsultingOpportunityRecord>) {
  return compact({
    legacy_id: input.legacyId,
    opportunity_type: input.opportunityType,
    stage: input.stage,
    name: input.name,
    organization: input.organization,
    contact_email: input.contactEmail,
    contact_url: input.contactUrl,
    pain_point: input.painPoint,
    evidence_summary: input.evidenceSummary,
    message_angle: input.messageAngle,
    source_family: input.sourceFamily,
    source_id: input.sourceId,
    source_lead_key: input.sourceLeadKey,
    primary_offer_id: input.primaryOfferId,
    estimated_value_cents: input.estimatedValueCents,
    currency_code: input.currencyCode,
    probability_percent: input.probabilityPercent,
    next_action: input.nextAction,
    next_action_due_at: input.nextActionDueAt,
    last_contact_at: input.lastContactAt,
    discovery_at: input.discoveryAt,
    proposal_sent_at: input.proposalSentAt,
    proposal_reference: input.proposalReference,
    closed_at: input.closedAt,
    loss_reason: input.lossReason,
    notes: input.notes,
  });
}

function commitmentRow(input: Partial<ConsultingCommitmentRecord>) {
  return compact({
    legacy_id: input.legacyId,
    opportunity_id: input.opportunityId,
    partner_id: input.partnerId,
    asset_id: input.assetId,
    project_id: input.projectId,
    commitment_type: input.commitmentType,
    title: input.title,
    due_at: input.dueAt,
    status: input.status,
    sequence_step: input.sequenceStep,
    completed_at: input.completedAt,
    notes: input.notes,
  });
}

function partnerRow(input: Partial<ConsultingPartnerRecord>) {
  return compact({
    legacy_id: input.legacyId,
    name: input.name,
    organization: input.organization,
    category: input.category,
    relationship_stage: input.relationshipStage,
    geography: input.geography,
    client_focus: input.clientFocus,
    complementary_capabilities: input.complementaryCapabilities,
    overflow_angle: input.overflowAngle,
    contact_url: input.contactUrl,
    contact_email: input.contactEmail,
    relationship_strength: input.relationshipStrength,
    last_contact_at: input.lastContactAt,
    next_action: input.nextAction,
    next_action_due_at: input.nextActionDueAt,
    referrals_given: input.referralsGiven,
    referrals_received: input.referralsReceived,
    notes: input.notes,
  });
}

function proofAssetRow(input: Partial<ConsultingProofAssetRecord>) {
  return compact({
    legacy_id: input.legacyId,
    title: input.title,
    asset_type: input.assetType,
    stage: input.stage,
    intended_buyer: input.intendedBuyer,
    buyer_decision: input.buyerDecision,
    scenario_label: input.scenarioLabel,
    business_problem: input.businessProblem,
    current_process_cost: input.currentProcessCost,
    proposed_workflow: input.proposedWorkflow,
    controls_and_review: input.controlsAndReview,
    expected_outcome: input.expectedOutcome,
    primary_offer_id: input.primaryOfferId,
    public_url: input.publicUrl,
    repository_reference: input.repositoryReference,
    published_at: input.publishedAt,
  });
}

function offerRow(input: Partial<ConsultingOfferRecord>) {
  return compact({
    slug: input.slug,
    name: input.name,
    active: input.active,
    buyer: input.buyer,
    outcome: input.outcome,
    deliverables: input.deliverables,
    duration_text: input.durationText,
    pricing_model: input.pricingModel,
    price_cents: input.priceCents,
    currency_code: input.currencyCode,
    conversion_path: input.conversionPath,
  });
}

function programRow(input: Partial<ConsultingPlatformProgramRecord>) {
  return compact({
    slug: input.slug,
    name: input.name,
    official_url: input.officialUrl,
    status: input.status,
    eligibility_requirements: input.eligibilityRequirements,
    evidence_required: input.evidenceRequired,
    completed_milestones: input.completedMilestones,
    next_action: input.nextAction,
    next_action_due_at: input.nextActionDueAt,
    application_at: input.applicationAt,
    decision: input.decision,
    verified_at: input.verifiedAt,
    notes: input.notes,
  });
}

function mapOpportunity(
  row: Record<string, unknown>,
): ConsultingOpportunityRecord {
  return {
    id: stringValue(row.id),
    legacyId: nullableString(row.legacy_id),
    opportunityType: stringValue(row.opportunity_type) as OpportunityType,
    stage: stringValue(row.stage) as OpportunityStage,
    name: stringValue(row.name),
    organization: stringValue(row.organization),
    contactEmail: nullableString(row.contact_email),
    contactUrl: nullableString(row.contact_url),
    painPoint: stringValue(row.pain_point),
    evidenceSummary: stringValue(row.evidence_summary),
    messageAngle: stringValue(row.message_angle),
    sourceFamily: stringValue(row.source_family),
    sourceId: nullableString(row.source_id),
    sourceLeadKey: nullableString(row.source_lead_key),
    primaryOfferId: nullableString(row.primary_offer_id),
    estimatedValueCents: nullableNumber(row.estimated_value_cents),
    currencyCode: nullableString(row.currency_code),
    probabilityPercent: nullableNumber(row.probability_percent),
    nextAction: nullableString(row.next_action),
    nextActionDueAt: nullableString(row.next_action_due_at),
    lastContactAt: nullableString(row.last_contact_at),
    discoveryAt: nullableString(row.discovery_at),
    proposalSentAt: nullableString(row.proposal_sent_at),
    proposalReference: nullableString(row.proposal_reference),
    closedAt: nullableString(row.closed_at),
    lossReason: nullableString(row.loss_reason),
    notes: stringValue(row.notes),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function mapActivity(row: Record<string, unknown>): ConsultingActivityRecord {
  return {
    id: stringValue(row.id),
    opportunityId: nullableString(row.opportunity_id),
    partnerId: nullableString(row.partner_id),
    activityType: stringValue(row.activity_type),
    channel: nullableString(row.channel),
    occurredAt: stringValue(row.occurred_at),
    summary: stringValue(row.summary),
    outcome: nullableString(row.outcome),
    externalReference: nullableString(row.external_reference),
    createdBy: stringValue(row.created_by),
  };
}

function mapCommitment(
  row: Record<string, unknown>,
): ConsultingCommitmentRecord {
  return {
    id: stringValue(row.id),
    legacyId: nullableString(row.legacy_id),
    opportunityId: nullableString(row.opportunity_id),
    partnerId: nullableString(row.partner_id),
    assetId: nullableString(row.asset_id),
    projectId: nullableString(row.project_id),
    commitmentType: stringValue(row.commitment_type),
    title: stringValue(row.title),
    dueAt: stringValue(row.due_at),
    status: stringValue(row.status) as ConsultingCommitmentRecord["status"],
    sequenceStep: nullableNumber(row.sequence_step) as FollowUpStep | null,
    completedAt: nullableString(row.completed_at),
    notes: stringValue(row.notes),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function mapPartner(row: Record<string, unknown>): ConsultingPartnerRecord {
  return {
    id: stringValue(row.id),
    legacyId: nullableString(row.legacy_id),
    name: stringValue(row.name),
    organization: stringValue(row.organization),
    category: stringValue(row.category),
    relationshipStage: stringValue(row.relationship_stage),
    geography: stringValue(row.geography),
    clientFocus: stringValue(row.client_focus),
    complementaryCapabilities: stringValue(row.complementary_capabilities),
    overflowAngle: stringValue(row.overflow_angle),
    contactUrl: nullableString(row.contact_url),
    contactEmail: nullableString(row.contact_email),
    relationshipStrength: Number(row.relationship_strength || 1),
    lastContactAt: nullableString(row.last_contact_at),
    nextAction: nullableString(row.next_action),
    nextActionDueAt: nullableString(row.next_action_due_at),
    referralsGiven: Number(row.referrals_given || 0),
    referralsReceived: Number(row.referrals_received || 0),
    notes: stringValue(row.notes),
  };
}

function mapProofAsset(
  row: Record<string, unknown>,
  reuseCount: number,
): ConsultingProofAssetRecord {
  return {
    id: stringValue(row.id),
    legacyId: nullableString(row.legacy_id),
    title: stringValue(row.title),
    assetType: stringValue(row.asset_type),
    stage: stringValue(row.stage),
    intendedBuyer: stringValue(row.intended_buyer),
    buyerDecision: stringValue(row.buyer_decision),
    scenarioLabel: stringValue(row.scenario_label),
    businessProblem: stringValue(row.business_problem),
    currentProcessCost: stringValue(row.current_process_cost),
    proposedWorkflow: stringValue(row.proposed_workflow),
    controlsAndReview: stringValue(row.controls_and_review),
    expectedOutcome: stringValue(row.expected_outcome),
    primaryOfferId: nullableString(row.primary_offer_id),
    publicUrl: nullableString(row.public_url),
    repositoryReference: nullableString(row.repository_reference),
    publishedAt: nullableString(row.published_at),
    reuseCount,
    updatedAt: stringValue(row.updated_at),
  };
}

function mapOffer(row: Record<string, unknown>): ConsultingOfferRecord {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    name: stringValue(row.name),
    active: Boolean(row.active),
    buyer: stringValue(row.buyer),
    outcome: stringValue(row.outcome),
    deliverables: stringArray(row.deliverables),
    durationText: stringValue(row.duration_text),
    pricingModel: stringValue(row.pricing_model),
    priceCents: nullableNumber(row.price_cents),
    currencyCode: nullableString(row.currency_code),
    conversionPath: stringValue(row.conversion_path),
  };
}

function mapProgram(
  row: Record<string, unknown>,
): ConsultingPlatformProgramRecord {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    name: stringValue(row.name),
    officialUrl: stringValue(row.official_url),
    status: stringValue(row.status),
    eligibilityRequirements: stringValue(row.eligibility_requirements),
    evidenceRequired: stringValue(row.evidence_required),
    completedMilestones: stringArray(row.completed_milestones),
    nextAction: nullableString(row.next_action),
    nextActionDueAt: nullableString(row.next_action_due_at),
    applicationAt: nullableString(row.application_at),
    decision: nullableString(row.decision),
    verifiedAt: nullableString(row.verified_at),
    notes: stringValue(row.notes),
  };
}

function mapProject(row: Record<string, unknown>): ConsultingProjectRecord {
  return {
    id: stringValue(row.id),
    legacyId: nullableString(row.legacy_id),
    opportunityId: nullableString(row.opportunity_id),
    client: stringValue(row.client),
    project: stringValue(row.project),
    status: stringValue(row.status),
    phase: stringValue(row.phase),
    feeCents: Number(row.fee_cents || 0),
    currencyCode: nullableString(row.currency_code),
    valueEstimate: nullableString(row.value_estimate),
    paymentStatus: stringValue(row.payment_status),
    startedAt: stringValue(row.started_at),
    targetDate: nullableString(row.target_date),
    nextAction: stringValue(row.next_action),
    scope: stringValue(row.scope),
    successCriteria: stringArray(row.success_criteria),
    links: Array.isArray(row.links)
      ? (row.links as ConsultingProjectRecord["links"])
      : [],
    notes: stringValue(row.notes),
  };
}

function mapAssetUse(row: Record<string, unknown>): ConsultingAssetUseRecord {
  return {
    assetId: stringValue(row.asset_id),
    opportunityId: stringValue(row.opportunity_id),
    usedAt: stringValue(row.used_at),
    notes: stringValue(row.notes),
  };
}
function mapWeeklySnapshot(
  row: Record<string, unknown>,
): ConsultingWeeklySnapshotRecord {
  return {
    weekStart: stringValue(row.week_start),
    metrics: objectValue(row.metrics),
    lesson: stringValue(row.lesson),
    generatedAt: stringValue(row.generated_at),
  };
}

function emptyData(configured: boolean): AcquisitionData {
  return {
    configured,
    opportunities: [],
    activities: [],
    commitments: [],
    partners: [],
    proofAssets: [],
    offers: [],
    programs: [],
    projects: [],
    assetUses: [],
    weeklySnapshots: [],
  };
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}
function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
function nullableString(value: unknown) {
  const text = stringValue(value).trim();
  return text || null;
}
function nullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean) : [];
}

function notConfigured(): MutationResult<never> {
  return {
    ok: false,
    error: "Supabase acquisition database is not configured.",
    status: 503,
  };
}
function databaseError(error: {
  message: string;
  code?: string;
}): MutationResult<never> {
  const status =
    error.code === "23505" ? 409 : error.code === "PGRST116" ? 404 : 500;
  return { ok: false, error: error.message, status };
}
