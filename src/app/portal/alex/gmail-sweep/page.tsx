import { readAlexGmailSweepSkill } from "@/lib/portal/alex/gmail-sweep-skill";
import GmailSweepSkillPanel from "./GmailSweepSkillPanel";

export default async function AlexGmailSweepPage() {
  const skillText = await readAlexGmailSweepSkill();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Gmail sweep setup
      </p>
      <h1 className="mb-3 font-display text-4xl">Rental email review workflow</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        This is the workflow file you can give Claude when using your Gmail and Airtable
        connectors. It is intentionally review-first: Claude should show proposed actions before
        updating anything.
      </p>

      <div className="mb-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-2 font-medium">Prompt to use with Claude</h2>
        <p className="rounded-lg bg-surface-elevated p-4 text-sm leading-6 text-cream-muted">
          I have attached a Gmail sweep workflow file. Please adapt this into a reusable workflow
          in my Claude setup using my Gmail and Airtable connectors. Keep it review-first. Search
          relevant rental emails, classify them, match to Airtable records where possible, and show
          me proposed updates before writing anything. Do not send emails, delete emails, move
          emails, or update Airtable records automatically. First show me the proposed actions and
          ask for approval.
        </p>
      </div>

      <GmailSweepSkillPanel skillText={skillText} />
    </div>
  );
}
