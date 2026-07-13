import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function envFile(path: string) {
  try {
    return Object.fromEntries(
      (await readFile(path, "utf8"))
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const at = line.indexOf("=");
          return [
            line.slice(0, at),
            line.slice(at + 1).replace(/^['\"]|['\"]$/g, ""),
          ];
        }),
    );
  } catch {
    return {};
  }
}
async function main() {
  const env = {
    ...(await envFile(".env")),
    ...(await envFile(".env.local")),
    ...process.env,
  };
  Object.assign(process.env, env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  assert.ok(env.SUPABASE_URL && key, "Supabase admin credentials required");
  const db = createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
  const api = await import("../src/lib/portal/admin/acquisition-db");
  const suffix = `acceptance-${Date.now()}`;
  const sourceId = suffix;
  const leadKey = `https://example.com/${suffix}`;
  let opportunityId = "";
  let projectId = "";
  const snapshotWeek = "2099-01-05";
  try {
    await db.from("admin_lead_sources").upsert({
      id: sourceId,
      label: "Acceptance fixture",
      description: "Acceptance fixture",
      file_name: "fixture",
      markdown: "",
    });
    const { error: leadError } = await db.from("admin_leads").insert({
      source_id: sourceId,
      lead_key: leadKey,
      score: 5,
      source_label: "Reddit",
      source_kind: "reddit",
      title: "Explicit paid automation RFP",
      url: leadKey,
      author: "fixture-buyer",
      reason: "Needs paid implementation",
      payload: {
        author: "fixture-buyer",
        business: "Acceptance Fixture",
        evidenceSummary: "Explicit paid implementation request",
        explicitEvidence: "RFP",
        offerMatch: "automation-sprint",
      },
    });
    if (leadError) throw leadError;
    const offer = (
      await db
        .from("consulting_offers")
        .select("id")
        .eq("slug", "automation-sprint")
        .single()
    ).data;
    const manual = await api.createOpportunity({
      opportunityType: "direct_client",
      stage: "qualified",
      name: "Existing buyer",
      organization: "  Acceptance   Fixture ",
      contactUrl: `${leadKey}/`,
      painPoint: "Manual work",
      evidenceSummary: "Existing warm-network evidence",
      sourceFamily: "manual",
      primaryOfferId: offer?.id,
      nextAction: "Prepare response",
      nextActionDueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.ok(manual.ok);
    opportunityId = manual.ok ? manual.data.id : "";
    const promoted = await api.promoteLead({
      sourceId,
      leadKey,
      opportunityType: "direct_client",
      nextAction: "Send tailored response",
      nextActionDueAt: new Date(Date.now() + 86_400_000).toISOString(),
      primaryOfferId: offer?.id,
    });
    assert.ok(
      promoted.ok && promoted.data.id === opportunityId,
      "promotion must normalize URL and organization before creating a duplicate",
    );
    if (promoted.ok) {
      assert.equal(promoted.data.sourceId, sourceId);
      assert.equal(promoted.data.sourceLeadKey, leadKey);
      assert.equal(promoted.data.primaryOfferId, offer?.id);
      assert.match(promoted.data.evidenceSummary, /RFP/);
    }
    const duplicate = await api.promoteLead({
      sourceId,
      leadKey,
      opportunityType: "direct_client",
      nextAction: "Duplicate",
      nextActionDueAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.ok(
      duplicate.ok && duplicate.data.id === opportunityId,
      "promotion must deduplicate by discovery key",
    );
    const outbound = await api.createActivity({
      opportunityId,
      activityType: "email",
      channel: "email",
      occurredAt: new Date().toISOString(),
      summary: "Actually sent after review",
    });
    assert.ok(outbound.ok);
    let followups =
      (
        await db
          .from("consulting_commitments")
          .select("*")
          .eq("opportunity_id", opportunityId)
          .eq("commitment_type", "follow_up")
      ).data ?? [];
    assert.equal(followups.filter((row) => row.status === "todo").length, 1);
    const pending = followups.find((row) => row.status === "todo");
    assert.ok(pending);
    const ended = await api.endFollowUpSequence(pending.id);
    assert.ok(ended.ok);
    const outboundAgain = await api.createActivity({
      opportunityId,
      activityType: "email",
      channel: "email",
      occurredAt: new Date().toISOString(),
      summary:
        "Second actual outbound after deliberately ending the prior sequence",
    });
    assert.ok(outboundAgain.ok);
    const reply = await api.createActivity({
      opportunityId,
      activityType: "reply",
      channel: "email",
      summary: "Buyer replied",
    });
    assert.ok(reply.ok);
    followups =
      (
        await db
          .from("consulting_commitments")
          .select("*")
          .eq("opportunity_id", opportunityId)
          .eq("commitment_type", "follow_up")
      ).data ?? [];
    assert.ok(followups.every((row) => row.status === "cancelled"));
    const day14 = await api.createCommitment({
      opportunityId,
      commitmentType: "follow_up",
      title: "Close the loop",
      dueAt: new Date().toISOString(),
      status: "todo",
      sequenceStep: 14,
      notes: "Add one final useful detail.",
    });
    assert.ok(day14.ok);
    if (day14.ok) {
      const completed14 = await api.updateCommitment(day14.data.id, {
        status: "done",
      });
      assert.ok(completed14.ok);
    }
    const nurtured = (
      await db
        .from("consulting_opportunities")
        .select("stage,next_action")
        .eq("id", opportunityId)
        .single()
    ).data;
    assert.equal(nurtured?.stage, "nurture");
    assert.ok(nurtured?.next_action);
    const proposal = await api.updateOpportunity(opportunityId, {
      stage: "proposal_sent",
      primaryOfferId: offer?.id,
      proposalSentAt: new Date().toISOString(),
      proposalReference: `${leadKey}#proposal`,
      estimatedValueCents: 250_000,
      currencyCode: "USD",
      nextAction: "Follow up on proposal",
      nextActionDueAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    });
    assert.ok(proposal.ok);
    const handoff = await api.handoffWonOpportunity(opportunityId, {
      projectName: "Acceptance delivery",
      nextAction: "Schedule kickoff",
    });
    assert.ok(handoff.ok);
    projectId = handoff.ok ? handoff.data.id : "";
    const state = (
      await db
        .from("admin_lead_states")
        .select("action")
        .eq("source_id", sourceId)
        .eq("lead_key", leadKey)
        .single()
    ).data;
    assert.equal(state?.action, "converted");
    const snapshot = await api.saveWeeklySnapshot({
      weekStart: snapshotWeek,
      metrics: { primaryOfferId: offer?.id, partnerContacts: 5 },
      lesson: "Acceptance fixture lesson",
    });
    assert.ok(
      snapshot.ok && snapshot.data.lesson === "Acceptance fixture lesson",
    );
    console.log(
      JSON.stringify(
        {
          promotionDedup: true,
          outboundCadence: true,
          sequenceEndAndNurture: true,
          replyCancellation: true,
          proposalValidation: true,
          wonHandoff: true,
        },
        null,
        2,
      ),
    );
  } finally {
    if (projectId)
      await db.from("consulting_projects").delete().eq("id", projectId);
    if (opportunityId)
      await db
        .from("consulting_opportunities")
        .delete()
        .eq("id", opportunityId);
    await db
      .from("admin_leads")
      .delete()
      .eq("source_id", sourceId)
      .eq("lead_key", leadKey);
    await db.from("admin_lead_sources").delete().eq("id", sourceId);
    await db
      .from("consulting_weekly_snapshots")
      .delete()
      .eq("week_start", snapshotWeek);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
