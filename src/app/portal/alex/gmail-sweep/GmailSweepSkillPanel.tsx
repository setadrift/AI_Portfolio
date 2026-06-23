"use client";

import { useState } from "react";

export default function GmailSweepSkillPanel({ skillText }: { skillText: string }) {
  const [copied, setCopied] = useState(false);

  async function copySkillText() {
    await navigator.clipboard.writeText(skillText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadSkillText() {
    window.location.href = "/api/portal/alex/gmail-sweep/skill";
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copySkillText}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {copied ? "Copied" : "Copy skill text"}
        </button>
        <button
          type="button"
          onClick={downloadSkillText}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
        >
          Download skill text
        </button>
      </div>

      <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-elevated p-5 text-sm leading-6 text-cream-muted">
        {skillText}
      </pre>
    </div>
  );
}
