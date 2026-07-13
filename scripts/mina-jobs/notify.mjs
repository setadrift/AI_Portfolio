import { createHash } from "node:crypto";
import { Resend } from "resend";

export async function notifyNewJobs(db, jobs, env) {
  const enabled = env.MINA_JOB_NOTIFICATIONS_ENABLED === "true";
  const recipient = String(env.MINA_JOB_ALERT_EMAIL || "").trim();
  if (!enabled || !recipient || !env.RESEND_API_KEY) {
    return { enabled, attempted: 0, sent: 0, skipped: jobs.length, reason: !enabled ? "disabled" : !recipient ? "recipient_missing" : "resend_key_missing" };
  }
  const resend = new Resend(env.RESEND_API_KEY);
  let sent = 0;
  for (const job of jobs.filter((item) => ["priority", "strong"].includes(item.quality_tier))) {
    const dedupeKey = notificationDedupeKey(job.id, "email", recipient, "first_seen");
    const { data: receipt, error: reserveError } = await db.from("mina_job_notifications").insert({
      job_id: job.id,
      channel: "email",
      recipient_ref: recipient,
      alert_kind: "first_seen",
      reason: `${job.quality_tier} first-seen match`,
      dedupe_key: dedupeKey,
      delivery_status: "pending",
    }).select("id").maybeSingle();
    if (reserveError?.code === "23505") continue;
    if (reserveError) throw new Error(`Unable to reserve Mina notification: ${reserveError.message}`);
    try {
      const result = await resend.emails.send({
        from: env.MINA_JOB_ALERT_FROM || "Mina job search <onboarding@resend.dev>",
        to: recipient,
        subject: `${job.quality_tier === "priority" ? "Priority" : "Strong"}: ${job.title} at ${job.company}`,
        text: alertText(job),
      });
      if (result.error) throw new Error(result.error.message);
      await db.from("mina_job_notifications").update({
        delivery_status: "sent",
        provider_message_id: result.data?.id || null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", receipt.id);
      sent += 1;
    } catch (error) {
      await db.from("mina_job_notifications").update({
        delivery_status: "failed",
        error: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      }).eq("id", receipt.id);
    }
  }
  return { enabled: true, attempted: jobs.length, sent, skipped: jobs.length - sent };
}

export function notificationDedupeKey(jobId, channel, recipient, alertKind) {
  return createHash("sha256").update(`${jobId}|${channel}|${recipient}|${alertKind}`).digest("hex");
}

function alertText(job) {
  const compensation = job.salary_min_cents || job.salary_max_cents
    ? `${job.salary_currency} ${money(job.salary_min_cents)}${job.salary_max_cents ? `–${money(job.salary_max_cents)}` : "+"}`
    : "Salary not posted";
  return [
    `${job.title} — ${job.company}`,
    `${job.location || "Location not listed"} · ${job.work_model}`,
    `${compensation} · ${job.freshness_bucket} · ${job.quality_tier}`,
    "",
    ...(job.fit_reasons || []).slice(0, 5).map((reason) => `- ${reason}`),
    ...(job.flags || []).length ? ["", `Check: ${(job.flags || []).join("; ")}`] : [],
    "",
    job.apply_url || job.canonical_url,
  ].join("\n");
}

function money(cents) {
  return cents ? `$${Math.round(cents / 100).toLocaleString("en-CA")}` : "?";
}
