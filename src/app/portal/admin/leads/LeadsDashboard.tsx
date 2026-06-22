"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LeadChannel,
  LeadDashboardData,
  LeadRunStatus,
  RedditLead,
} from "@/lib/portal/admin/leads";

export default function LeadsDashboard({
  initialData,
}: {
  initialData: LeadDashboardData;
}) {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [selectedLeadUrl, setSelectedLeadUrl] = useState(
    initialData.digest?.leads[0]?.url ?? "",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");

  const leads = useMemo(() => initialData.digest?.leads ?? [], [initialData.digest?.leads]);
  const selectedLead = useMemo(
    () => leads.find((lead) => lead.url === selectedLeadUrl) ?? leads[0] ?? null,
    [leads, selectedLeadUrl],
  );

  async function runScan() {
    setIsRunning(true);
    setRunMessage("");
    try {
      const response = await fetch("/api/portal/admin/leads/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: selectedChannel }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        stdout?: string;
        stderr?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || result.stderr || "Scan failed");
      }

      setRunMessage(result.stdout?.trim() || "Scan complete.");
      router.refresh();
    } catch (error) {
      setRunMessage(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#141414] text-[#f3f0e8]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:h-[calc(100vh-3.5rem)] lg:px-5">
        <Header
          channels={initialData.channels}
          selectedChannel={selectedChannel}
          isRunning={isRunning}
          runMessage={runMessage}
          onChannelChange={setSelectedChannel}
          onRun={runScan}
        />

        {initialData.status && !initialData.status.ok && (
          <RunWarning status={initialData.status} />
        )}

        <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#202020] lg:grid-cols-[430px_minmax(0,1fr)]">
          <LeadList
            leads={leads}
            digest={initialData.digest}
            selectedLead={selectedLead}
            onSelect={(lead) => setSelectedLeadUrl(lead.url)}
          />
          <LeadDetail lead={selectedLead} />
        </div>
      </div>
    </div>
  );
}

function Header({
  channels,
  selectedChannel,
  isRunning,
  runMessage,
  onChannelChange,
  onRun,
}: {
  channels: LeadChannel[];
  selectedChannel: string;
  isRunning: boolean;
  runMessage: string;
  onChannelChange: (value: string) => void;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/10 bg-[#1d1d1d] p-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Reddit lead monitor</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-white/50">
          Run all configured sources or focus on one subreddit.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm text-white/50" htmlFor="channel">
          Channel
        </label>
        <select
          id="channel"
          value={selectedChannel}
          onChange={(event) => onChannelChange(event.target.value)}
          className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
        >
          <option value="all">All configured sources</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="h-10 rounded-md bg-[#f3f0e8] px-4 text-sm font-medium text-[#151515] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? "Scanning..." : "Run scan"}
        </button>
        {runMessage && (
          <span className="max-w-sm truncate text-xs text-white/45" title={runMessage}>
            {runMessage}
          </span>
        )}
      </div>
    </div>
  );
}

function LeadList({
  leads,
  digest,
  selectedLead,
  onSelect,
}: {
  leads: RedditLead[];
  digest: LeadDashboardData["digest"];
  selectedLead: RedditLead | null;
  onSelect: (lead: RedditLead) => void;
}) {
  return (
    <aside className="flex min-h-[420px] flex-col border-white/10 lg:border-r">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">New</h2>
          <p className="text-xs text-white/45">
            {digest?.fileName ?? "No digest"} / {leads.length} lead{leads.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">
          min 4/5
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <button
              key={`${lead.url}-${lead.title}`}
              type="button"
              onClick={() => onSelect(lead)}
              className={`block w-full border-b border-white/10 px-4 py-4 text-left transition ${
                selectedLead?.url === lead.url
                  ? "bg-white/[0.08]"
                  : "bg-transparent hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs text-white/45">r/{lead.subreddit}</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-5">
                    {lead.title}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                  {lead.score}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/45">{lead.reason}</p>
            </button>
          ))
        ) : (
          <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <span className="text-xs font-medium">OK</span>
              </div>
              <h3 className="text-base font-medium">No actionable leads</h3>
              <p className="mt-2 text-sm leading-6 text-white/45">
                Try another channel or wait for Reddit rate limits to clear.
              </p>
            </div>
          </div>
        )}
      </div>

      {digest && (
        <div className="border-t border-white/10 px-4 py-3 text-xs text-white/40">
          Checked {digest.feedsChecked || "0"} / rejected {digest.rejectedCount || "0"} /{" "}
          {digest.generatedAt}
        </div>
      )}
    </aside>
  );
}

function LeadDetail({ lead }: { lead: RedditLead | null }) {
  if (!lead) {
    return (
      <section className="flex min-h-[520px] items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <span className="text-xs font-medium">OK</span>
          </div>
          <h2 className="text-lg font-medium">You&apos;re all caught up</h2>
          <p className="mt-2 text-sm text-white/45">Run another channel scan to find more.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[520px] overflow-y-auto px-5 py-5 lg:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
            <span>r/{lead.subreddit}</span>
            <span>u/{lead.author}</span>
            <span>{lead.category}</span>
          </div>
          <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-8">{lead.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
            {lead.score}
          </span>
          <a
            href={lead.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-white/30 hover:text-white"
          >
            Open
          </a>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-[#181818] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Why it matched</p>
        <p className="mt-2 text-sm leading-6 text-white/70">{lead.reason}</p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ReplyBox title="Suggested comment" body={lead.suggestedComment} />
        <ReplyBox title="Suggested DM" body={lead.suggestedDm} />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-[#181818] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/35">Next action</p>
        <p className="mt-2 text-sm text-white/70">
          Recommended action: <span className="text-white">{lead.recommendedAction}</span>
        </p>
      </div>
    </section>
  );
}

function ReplyBox({ title, body }: { title: string; body: string }) {
  async function copyText() {
    if (!body) return;
    await navigator.clipboard.writeText(body);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#181818] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <button
          type="button"
          onClick={copyText}
          disabled={!body}
          className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-40"
        >
          Copy
        </button>
      </div>
      {body ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-white/65">{body}</p>
      ) : (
        <p className="text-sm text-white/35">None suggested.</p>
      )}
    </div>
  );
}

function RunWarning({ status }: { status: LeadRunStatus }) {
  return (
    <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-amber-100">
      <p className="text-sm font-medium">Latest run was partial or skipped</p>
      <p className="mt-1 text-xs leading-5 text-amber-100/70">
        {status.message} Successful feeds: {status.successfulFeeds}/{status.totalFeeds}.
      </p>
    </div>
  );
}
