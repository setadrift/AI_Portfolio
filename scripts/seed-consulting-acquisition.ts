import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  consultingLeads,
  consultingProjects,
  consultingTasks,
} from "../src/lib/portal/admin/consulting";

async function main() {
  const env = {
    ...(await loadEnv(".env")),
    ...(await loadEnv(".env.local")),
    ...process.env,
  };
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!env.SUPABASE_URL || !key)
    throw new Error("SUPABASE_URL and a Supabase admin key are required.");
  const db = createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: offers, error: offerError } = await db
    .from("consulting_offers")
    .select("id,slug");
  if (offerError) throw offerError;
  const offerId = new Map(
    (offers ?? []).map((offer) => [offer.slug, offer.id]),
  );

  const opportunityRows = consultingLeads.map((lead) => {
    const override = leadOverrides[lead.id] ?? {};
    return {
      legacy_id: lead.id,
      opportunity_type: "direct_client",
      stage: stageForStatus(lead.status),
      name: lead.name,
      organization: lead.business,
      pain_point: lead.painPoint,
      evidence_summary: lead.notes,
      message_angle: `Lead with one concrete implementation observation about ${lead.painPoint}`,
      source_family: lead.source,
      primary_offer_id: offerId.get(offerForLead(lead.id)) ?? null,
      estimated_value_cents: valueForLead(lead.id),
      currency_code: currencyForLead(lead.id),
      probability_percent: probabilityForStage(stageForStatus(lead.status)),
      next_action: isClosed(stageForStatus(lead.status))
        ? null
        : `Follow up with ${lead.business} using one new useful observation.`,
      next_action_due_at: isClosed(stageForStatus(lead.status))
        ? null
        : dateTime(lead.nextFollowUpAt || "2026-07-14"),
      last_contact_at: dateTime(lead.lastContactAt),
      proposal_sent_at:
        lead.status === "Proposal Sent" ? dateTime(lead.lastContactAt) : null,
      proposal_reference:
        lead.status === "Proposal Sent"
          ? lead.links.find((link) => link.href)?.href ||
            `legacy:${lead.id}:proposal`
          : null,
      notes: `${lead.notes}\nLinks: ${JSON.stringify(lead.links)}`,
      ...override,
    };
  });

  opportunityRows.push({
    legacy_id: "lead-alex-parker-expansion",
    opportunity_type: "past_client_expansion",
    stage: "nurture",
    name: "Alex Parker",
    organization: "Alex Parker property operations",
    pain_point:
      "Potential follow-on workflow implementation after turn season.",
    evidence_summary:
      "Alex confirmed the first phase was paid and expects to revisit additional work near the end of August.",
    message_angle:
      "Lead with one concise follow-on workflow idea at the timing Alex provided.",
    source_family: "past_client",
    primary_offer_id: offerId.get("automation-sprint") ?? null,
    estimated_value_cents: null,
    currency_code: "USD",
    probability_percent: 35,
    next_action:
      "Prepare one concise follow-on workflow idea before Alex's expected end-of-August check-in.",
    next_action_due_at: dateTime("2026-08-24"),
    last_contact_at: dateTime("2026-06-16"),
    proposal_sent_at: null,
    proposal_reference: null,
    notes:
      "Do not contact early merely to fill the pipeline; use the timing Alex provided.",
  });

  const { error: opportunityError } = await db
    .from("consulting_opportunities")
    .upsert(opportunityRows, { onConflict: "legacy_id" });
  if (opportunityError) throw opportunityError;
  const { data: opportunities, error: opportunityReadError } = await db
    .from("consulting_opportunities")
    .select("id,legacy_id,organization");
  if (opportunityReadError) throw opportunityReadError;
  const opportunityId = new Map(
    (opportunities ?? []).map((row) => [row.legacy_id, row.id]),
  );

  const projectRows = consultingProjects.map((project) => ({
    legacy_id: project.id,
    opportunity_id: opportunityForProject(project.id, opportunityId),
    client: project.client,
    project: project.project,
    status: project.status,
    phase: project.phase,
    fee_cents: project.feeCents,
    currency_code: project.currencyCode ?? null,
    value_estimate: project.valueEstimate ?? null,
    payment_status: project.paymentStatus,
    started_at: project.startedAt,
    target_date: project.targetDate ?? null,
    next_action: project.nextAction,
    scope: project.scope,
    success_criteria: project.successCriteria,
    links: project.links,
    notes: project.notes,
  }));
  const { error: projectError } = await db
    .from("consulting_projects")
    .upsert(projectRows, { onConflict: "legacy_id" });
  if (projectError) throw projectError;
  const { data: projects, error: projectReadError } = await db
    .from("consulting_projects")
    .select("id,legacy_id");
  if (projectReadError) throw projectReadError;
  const projectId = new Map(
    (projects ?? []).map((row) => [row.legacy_id, row.id]),
  );

  const commitmentRows = consultingTasks.map((task) => ({
    legacy_id: task.id,
    project_id: task.projectId ? (projectId.get(task.projectId) ?? null) : null,
    commitment_type: commitmentType(task.type),
    title: task.title,
    due_at: dateTime(task.dueAt || projectStartForTask(task.projectId)),
    status:
      task.status === "Done"
        ? "done"
        : task.status === "Doing"
          ? "doing"
          : task.status === "Waiting"
            ? "waiting"
            : "todo",
    completed_at:
      task.status === "Done"
        ? dateTime(task.dueAt || projectStartForTask(task.projectId))
        : null,
    notes: `[${task.priority}] ${task.notes}`,
  }));
  const { error: commitmentError } = await db
    .from("consulting_commitments")
    .upsert(commitmentRows, { onConflict: "legacy_id" });
  if (commitmentError) throw commitmentError;

  const seedActivities = opportunityRows.flatMap((row) => {
    const id = opportunityId.get(row.legacy_id);
    if (!id || !row.last_contact_at) return [];
    return [
      {
        opportunity_id: id,
        activity_type:
          row.stage === "proposal_sent"
            ? "proposal"
            : row.stage === "nurture"
              ? "note"
              : "email",
        channel: row.source_family.includes("Reddit") ? "Reddit" : "email",
        occurred_at: row.last_contact_at,
        summary: `Migrated historical ${row.stage.replaceAll("_", " ")} activity for ${row.organization}.`,
        outcome: row.stage,
        created_by: "legacy_seed",
      },
    ];
  });
  for (const activity of seedActivities) {
    const { data: existing } = await db
      .from("consulting_activities")
      .select("id")
      .eq("opportunity_id", activity.opportunity_id)
      .eq("created_by", "legacy_seed")
      .eq("summary", activity.summary)
      .maybeSingle();
    if (!existing) {
      const { error } = await db.from("consulting_activities").insert(activity);
      if (error) throw error;
    }
  }

  const { error: assetError } = await db.from("consulting_proof_assets").upsert(
    {
      legacy_id: "proof-accounting-exception-workflow",
      title: "Accounting automation exception workflow teardown",
      asset_type: "workflow_teardown",
      stage: "briefed",
      intended_buyer: "CPA, bookkeeping, and finance operations leaders",
      buyer_decision:
        "Whether Duncan can design a reliable finance workflow with controls rather than a brittle happy-path automation.",
      scenario_label: "Representative finance operations workflow",
      business_problem:
        "Consolidated payouts, communication records, or accounting exports require manual matching and journal preparation.",
      current_process_cost:
        "Repeated manual reconciliation, inconsistent categorization, and limited exception visibility.",
      proposed_workflow:
        "Ingest source records, normalize identifiers, match deterministically, route exceptions for review, and post only approved outputs.",
      controls_and_review:
        "Idempotency, audit trail, no-discard exception queue, credential boundaries, and human approval for ambiguous accounting changes.",
      expected_outcome:
        "A buyer can see how the implementation reduces manual work without weakening financial controls.",
      primary_offer_id: offerId.get("workflow-diagnostic") ?? null,
      repository_reference:
        "docs/ai-consulting-client-acquisition-system-spec.md",
    },
    { onConflict: "legacy_id" },
  );
  if (assetError) throw assetError;

  const counts = await Promise.all([
    count(db, "consulting_opportunities"),
    count(db, "consulting_projects"),
    count(db, "consulting_commitments"),
    count(db, "consulting_activities"),
    count(db, "consulting_proof_assets"),
  ]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        opportunities: counts[0],
        projects: counts[1],
        commitments: counts[2],
        activities: counts[3],
        proofAssets: counts[4],
        expectedLegacy: {
          leads: consultingLeads.length,
          addedPastClientOpportunities: 1,
          projects: consultingProjects.length,
          tasks: consultingTasks.length,
        },
      },
      null,
      2,
    ),
  );
}

const leadOverrides: Record<string, Record<string, unknown>> = {
  "lead-willow-grey-automation-ai": {
    stage: "proposal_sent",
    proposal_sent_at: dateTime("2026-07-10"),
    last_contact_at: dateTime("2026-07-10"),
    next_action:
      "Follow up on the July 10 proposal with one concise implementation observation if there is still no reply.",
    next_action_due_at: dateTime("2026-07-15"),
    estimated_value_cents: 450000,
    currency_code: "GBP",
    probability_percent: 55,
  },
};

function stageForStatus(status: string) {
  return (
    (
      {
        New: "new",
        Contacted: "contacted",
        "Discovery Booked": "discovery_booked",
        "Proposal Sent": "proposal_sent",
        Won: "won",
        Lost: "lost",
        Dormant: "nurture",
      } as Record<string, string>
    )[status] ?? "new"
  );
}
function offerForLead(id: string) {
  return id === "lead-ttg-ceo-dashboard"
    ? "automation-sprint"
    : id === "lead-willow-grey-automation-ai"
      ? "workflow-diagnostic"
      : "workflow-diagnostic";
}
function valueForLead(id: string) {
  return id === "lead-ttg-ceo-dashboard"
    ? 75000
    : id === "lead-lengthiness-extra"
      ? 350000
      : null;
}
function currencyForLead(id: string) {
  return id === "lead-ttg-ceo-dashboard"
    ? "CAD"
    : id === "lead-lengthiness-extra"
      ? "USD"
      : null;
}
function probabilityForStage(stage: string) {
  return (
    (
      {
        new: 10,
        qualified: 20,
        contacted: 30,
        replied: 45,
        discovery_booked: 55,
        proposal_sent: 65,
        won: 100,
        lost: 0,
        nurture: 15,
      } as Record<string, number>
    )[stage] ?? 20
  );
}
function isClosed(stage: string) {
  return stage === "won" || stage === "lost" || stage === "nurture";
}
function opportunityForProject(id: string, map: Map<string | null, string>) {
  if (id === "willow-grey-automation-ai-discovery")
    return map.get("lead-willow-grey-automation-ai") ?? null;
  if (id === "ttg-ceo-dashboard" || id === "ttg-blog-content-pipeline")
    return map.get("lead-ttg-ceo-dashboard") ?? null;
  if (id === "alex-parker-airtable-turn-season")
    return map.get("lead-alex-parker-expansion") ?? null;
  return null;
}
function commitmentType(type: string) {
  return (
    (
      {
        "Client Follow-Up": "follow_up",
        Build: "project_work",
        Proposal: "proposal",
        Invoice: "invoice",
        Research: "research",
        Admin: "admin",
      } as Record<string, string>
    )[type] ?? "admin"
  );
}
function projectStartForTask(projectId?: string) {
  return (
    consultingProjects.find((project) => project.id === projectId)?.startedAt ??
    "2026-07-13"
  );
}
function dateTime(value?: string) {
  return value ? `${value}T13:00:00.000Z` : null;
}

async function count(db: SupabaseClient, table: string) {
  const { count: value, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return value ?? 0;
}

async function loadEnv(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [
            line.slice(0, index).trim(),
            line
              .slice(index + 1)
              .trim()
              .replace(/^["']|["']$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
