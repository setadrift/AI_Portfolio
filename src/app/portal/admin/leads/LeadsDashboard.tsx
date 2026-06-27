"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LeadDashboardData,
  LeadSourceId,
  RedditLead,
} from "@/lib/portal/admin/leads";

type LeadQueue = "actionable" | "review" | "community_reply" | "commented" | "dm_sent" | "dismissed";
type LeadAction = "new" | "opened" | "commented" | "dm_sent" | "converted" | "dismissed";
type SortField = "score" | "source" | "title" | "action";

interface LeadState {
  queue: LeadQueue;
  action: LeadAction;
  notes: string;
  updatedAt: string;
}

const STORAGE_KEY = "ai-portfolio-admin-lead-state-v1";

const QUEUES: Array<{ value: LeadQueue; label: string; description: string }> = [
  { value: "actionable", label: "Actionable", description: "Highest-intent leads to work now." },
  { value: "review", label: "Review", description: "Good signals that need a judgment call." },
  { value: "community_reply", label: "Community Reply", description: "Useful public replies without DM intent." },
  { value: "commented", label: "Commented", description: "Leads where you already replied publicly." },
  { value: "dm_sent", label: "DM sent", description: "Leads where you already sent a Reddit DM." },
  { value: "dismissed", label: "Dismissed", description: "Handled, duplicate, stale, or not a fit." },
];

const ACTIONS: Array<{ value: LeadAction; label: string }> = [
  { value: "new", label: "New" },
  { value: "opened", label: "Opened" },
  { value: "commented", label: "Commented" },
  { value: "dm_sent", label: "DM sent" },
  { value: "converted", label: "Converted" },
  { value: "dismissed", label: "Dismissed" },
];

const queueButtonClass =
  "rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-white/25 hover:bg-white/5 hover:text-white";

export default function LeadsDashboard({
  initialData,
}: {
  initialData: LeadDashboardData;
}) {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState(
    initialData.channels[0]?.id ?? "automation",
  );
  const [selectedSourceId, setSelectedSourceId] = useState<LeadSourceId>(
    initialData.sources[0]?.id ?? "reddit",
  );
  const [selectedQueue, setSelectedQueue] = useState<LeadQueue>("actionable");
  const [selectedLeadUrl, setSelectedLeadUrl] = useState(
    initialData.sources[0]?.digest?.leads[0]?.url ?? initialData.digest?.leads[0]?.url ?? "",
  );
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("score");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [leadState, setLeadState] = useState<Record<string, LeadState>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLeadState(JSON.parse(raw) as Record<string, LeadState>);
    } catch {
      setLeadState({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leadState));
  }, [leadState]);

  const selectedSource =
    initialData.sources.find((source) => source.id === selectedSourceId) ??
    initialData.sources[0] ??
    null;

  const rows = useMemo(
    () => (selectedSource?.digest?.leads ?? []).map((lead) => enrichLead(lead, leadState[leadKey(lead)])),
    [selectedSource?.digest?.leads, leadState],
  );

  const counts = useMemo(() => {
    return QUEUES.reduce(
      (acc, queue) => ({
        ...acc,
        [queue.value]: rows.filter((lead) => lead.queue === queue.value).length,
      }),
      {} as Record<LeadQueue, number>,
    );
  }, [rows]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((lead) => lead.queue === selectedQueue)
      .filter((lead) => {
        if (!needle) return true;
        return [
          lead.title,
          lead.sourceLabel,
          lead.author,
          lead.category,
          lead.reason,
          lead.notes,
          lead.suggestedComment,
          lead.suggestedDm,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => sortRows(a, b, sortBy));
  }, [rows, search, selectedQueue, sortBy]);

  const selectedLead =
    visibleRows.find((lead) => lead.url === selectedLeadUrl) ??
    rows.find((lead) => lead.url === selectedLeadUrl) ??
    visibleRows[0] ??
    null;

  const selectedLeads = rows.filter((lead) => selectedIds.has(leadKey(lead)));
  const currentQueue = QUEUES.find((queue) => queue.value === selectedQueue) ?? QUEUES[0];
  const selectedStatus =
    selectedSource?.id === "reddit" ? selectedSource.status ?? initialData.status : selectedSource?.status ?? null;

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

  function updateLead(lead: RedditLead, patch: Partial<LeadState>) {
    const key = leadKey(lead);
    setLeadState((current) => ({
      ...current,
      [key]: {
        queue: queueForLead(lead, current[key]),
        action: current[key]?.action ?? "new",
        notes: current[key]?.notes ?? "",
        updatedAt: new Date().toISOString(),
        ...patch,
      },
    }));
  }

  function bulkMove(queue: LeadQueue, action?: LeadAction) {
    const nextSelected = selectedLeads.length ? selectedLeads : visibleRows;
    setLeadState((current) => {
      const next = { ...current };
      for (const lead of nextSelected) {
        const key = leadKey(lead);
        next[key] = {
          queue,
          action: action ?? current[key]?.action ?? (queue === "dismissed" ? "dismissed" : "new"),
          notes: current[key]?.notes ?? "",
          updatedAt: new Date().toISOString(),
        };
      }
      return next;
    });
    setSelectedIds(new Set());
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#141414] text-[#f3f0e8]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:h-[calc(100vh-3.5rem)] lg:px-5">
        <header className="rounded-lg border border-white/10 bg-[#1d1d1d] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                AI consulting lead board
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Leads</h1>
              <p className="mt-1 text-sm text-white/50">
                Switch between Codex research leads and the Reddit monitor, then work each source from one queue.
              </p>
            </div>

            {selectedSourceId === "reddit" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedChannel}
                  onChange={(event) => setSelectedChannel(event.target.value)}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  {initialData.channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runScan}
                  disabled={isRunning}
                  className="h-10 rounded-md bg-[#f3f0e8] px-4 text-sm font-medium text-[#151515] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? "Scanning..." : "Run scan"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {initialData.sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  setSelectedSourceId(source.id);
                  setSelectedQueue("actionable");
                  setSelectedIds(new Set());
                  setSelectedLeadUrl(source.digest?.leads[0]?.url ?? "");
                }}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  selectedSourceId === source.id
                    ? "bg-white text-[#151515]"
                    : "bg-white/5 text-white/65 hover:bg-white/10"
                }`}
                title={source.description}
              >
                {source.label} {source.digest?.leads.length ?? 0}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <Metric label="Total" value={rows.length.toString()} />
            <Metric label="Actionable" value={counts.actionable.toString()} />
            <Metric label="Review" value={counts.review.toString()} />
            <Metric label="Community" value={counts.community_reply.toString()} />
            <Metric label="Commented" value={counts.commented.toString()} />
            <Metric label="DM sent" value={counts.dm_sent.toString()} />
            <Metric label="Dismissed" value={counts.dismissed.toString()} />
          </div>

          <div className="mt-3 text-xs text-white/45">
            {selectedStatus ? (
              <>
                Last run: {selectedStatus.message} {selectedStatus.successfulFeeds}/
                {selectedStatus.totalFeeds} feeds, {selectedStatus.fetchedPosts} posts,{" "}
                {selectedStatus.candidatesScored} scored, mode{" "}
                {selectedStatus.ingestionMode ?? "unknown"}.
              </>
            ) : selectedSource?.digest ? (
              <>
                Source: {selectedSource.description} Generated {selectedSource.digest.generatedAt || "unknown"},{" "}
                {selectedSource.digest.leads.length} leads loaded.
              </>
            ) : (
              "No lead source data found."
            )}
            {runMessage ? <span className="ml-2 text-white/70">{runMessage}</span> : null}
          </div>
        </header>

        <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#202020]">
            <div className="border-b border-white/10 p-3">
              <div className="flex flex-wrap gap-2">
                {QUEUES.map((queue) => (
                  <button
                    key={queue.value}
                    type="button"
                    onClick={() => {
                      setSelectedQueue(queue.value);
                      setSelectedIds(new Set());
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      selectedQueue === queue.value
                        ? "bg-white text-[#151515]"
                        : "bg-white/5 text-white/65 hover:bg-white/10"
                    }`}
                    title={queue.description}
                  >
                    {queue.label} {counts[queue.value]}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, reason, source..."
                  className="h-10 min-w-[260px] flex-1 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortField)}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="score">Score</option>
                  <option value="source">Source</option>
                  <option value="title">Title</option>
                  <option value="action">Action</option>
                </select>
                <button
                  type="button"
                  onClick={() => downloadCsv(selectedLeads.length ? selectedLeads : visibleRows)}
                  className="h-10 rounded-md border border-white/10 px-3 text-sm text-white/70 hover:bg-white/5"
                >
                  CSV
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-white/45">
                  {selectedIds.size
                    ? `${selectedIds.size} selected`
                    : `${visibleRows.length} visible in ${currentQueue.label}`}
                </span>
                <button type="button" onClick={() => bulkMove("review")} className={queueButtonClass}>
                  Move to Review
                </button>
                <button type="button" onClick={() => bulkMove("community_reply")} className={queueButtonClass}>
                  Community
                </button>
                <button type="button" onClick={() => bulkMove("commented", "commented")} className={queueButtonClass}>
                  Mark Commented
                </button>
                <button type="button" onClick={() => bulkMove("dm_sent", "dm_sent")} className={queueButtonClass}>
                  Mark DM sent
                </button>
                <button type="button" onClick={() => bulkMove("dismissed", "dismissed")} className={queueButtonClass}>
                  Dismiss
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {visibleRows.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center">
                  <div>
                    <h2 className="text-base font-medium">No leads match this view</h2>
                    <p className="mt-2 text-sm text-white/45">
                      Run another channel scan or clear the search filter.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-[980px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#202020] text-xs uppercase tracking-[0.12em] text-white/40">
                    <tr className="border-b border-white/10">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            visibleRows.length > 0 &&
                            visibleRows.every((lead) => selectedIds.has(leadKey(lead)))
                          }
                          onChange={(event) => {
                            setSelectedIds(
                              event.target.checked
                                ? new Set(visibleRows.map((lead) => leadKey(lead)))
                                : new Set(),
                            );
                          }}
                        />
                      </th>
                      <th className="px-3 py-3">Lead</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Action</th>
                      <th className="px-3 py-3">Score</th>
                      <th className="px-3 py-3 text-right">Work</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((lead) => (
                      <tr
                        key={leadKey(lead)}
                        className={`cursor-pointer border-b border-white/10 ${
                          selectedLead?.url === lead.url ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                        }`}
                        onClick={() => setSelectedLeadUrl(lead.url)}
                      >
                        <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(leadKey(lead))}
                            onChange={(event) => {
                              setSelectedIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(leadKey(lead));
                                else next.delete(leadKey(lead));
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="max-w-[380px] px-3 py-3">
                          <div className="truncate font-medium">{lead.title}</div>
                          <div className="line-clamp-2 text-xs leading-5 text-white/45">
                            {lead.reason}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-white/65">{lead.sourceLabel}</td>
                        <td className="px-3 py-3 capitalize text-white/65">
                          {formatCategory(lead.category)}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={lead.action}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              updateLead(lead, {
                                action: event.target.value as LeadAction,
                                queue:
                                  event.target.value === "dismissed"
                                    ? "dismissed"
                                    : event.target.value === "commented"
                                      ? "commented"
                                      : event.target.value === "dm_sent"
                                        ? "dm_sent"
                                      : lead.queue,
                              })
                            }
                            className="h-8 rounded-md border border-white/10 bg-[#151515] px-2 text-xs text-white outline-none"
                          >
                            {ACTIONS.map((action) => (
                              <option key={action.value} value={action.value}>
                                {action.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                            {lead.score}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                          {lead.queue !== "commented" ? (
                            <button
                              type="button"
                              onClick={() => updateLead(lead, { queue: "commented", action: "commented" })}
                              className="mr-3 text-sm text-white/70 hover:text-white"
                            >
                              Commented
                            </button>
                          ) : null}
                          {lead.queue !== "dm_sent" ? (
                            <button
                              type="button"
                              onClick={() => updateLead(lead, { queue: "dm_sent", action: "dm_sent" })}
                              className="mr-3 text-sm text-white/70 hover:text-white"
                            >
                              DM sent
                            </button>
                          ) : null}
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-white/70 hover:text-white"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <LeadDetail
            lead={selectedLead}
            updateLead={updateLead}
          />
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function LeadDetail({
  lead,
  updateLead,
}: {
  lead: EnrichedLead | null;
  updateLead: (lead: RedditLead, patch: Partial<LeadState>) => void;
}) {
  if (!lead) {
    return (
      <aside className="rounded-lg border border-white/10 bg-[#202020] p-6 text-center">
        <h2 className="text-base font-medium">No lead selected</h2>
        <p className="mt-2 text-sm text-white/45">Select a row to review the source and next action.</p>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 overflow-y-auto rounded-lg border border-white/10 bg-[#202020] p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{lead.sourceLabel}</span>
        <span>{lead.author}</span>
        {lead.sourceDate ? <span>{lead.sourceDate}</span> : null}
        <span>{formatCategory(lead.category)}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold leading-7">{lead.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/55">{lead.reason}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailStat label="Score" value={lead.score} />
        <DetailStat label="Recommended" value={formatAction(lead.recommendedAction)} />
        <DetailStat label="Queue" value={formatQueue(lead.queue)} />
        <DetailStat label="Action" value={formatAction(lead.action)} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => updateLead(lead, { queue: "actionable", action: "new" })} className={queueButtonClass}>
          Actionable
        </button>
        <button type="button" onClick={() => updateLead(lead, { queue: "review" })} className={queueButtonClass}>
          Review
        </button>
        <button type="button" onClick={() => updateLead(lead, { queue: "community_reply" })} className={queueButtonClass}>
          Community
        </button>
        <button type="button" onClick={() => updateLead(lead, { queue: "commented", action: "commented" })} className={queueButtonClass}>
          Commented
        </button>
        <button type="button" onClick={() => updateLead(lead, { queue: "dm_sent", action: "dm_sent" })} className={queueButtonClass}>
          DM sent
        </button>
        <button type="button" onClick={() => updateLead(lead, { queue: "dismissed", action: "dismissed" })} className={queueButtonClass}>
          Dismiss
        </button>
      </div>

      <CopyBlock label="Suggested comment" value={lead.suggestedComment} />
      <CopyBlock label="Suggested DM" value={lead.suggestedDm} />

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-[0.16em] text-white/35">Notes</span>
        <textarea
          value={lead.notes}
          onChange={(event) => updateLead(lead, { notes: event.target.value })}
          rows={4}
          className="mt-2 w-full rounded-md border border-white/10 bg-[#151515] p-3 text-sm leading-6 text-white outline-none focus:border-white/30"
          placeholder="Decision, follow-up angle, or why this was dismissed."
        />
      </label>

      <a
        href={lead.url}
        target="_blank"
        rel="noreferrer"
        className="mt-5 block rounded-md bg-white px-4 py-2 text-center text-sm font-medium text-[#151515] hover:bg-[#f3f0e8]"
      >
        Open source
      </a>
    </aside>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm text-white">{value}</p>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</h3>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-xs text-white/55 hover:text-white"
        >
          Copy
        </button>
      </div>
      <p className="whitespace-pre-wrap rounded-md border border-white/10 bg-[#151515] p-3 text-sm leading-6 text-white/70">
        {value}
      </p>
    </section>
  );
}

type EnrichedLead = RedditLead &
  LeadState & {
    numericScore: number;
  };

function enrichLead(lead: RedditLead, state?: LeadState): EnrichedLead {
  const queue = queueForLead(lead, state);
  return {
    ...lead,
    queue,
    action: state?.action ?? (queue === "dismissed" ? "dismissed" : "new"),
    notes: state?.notes ?? "",
    updatedAt: state?.updatedAt ?? "",
    numericScore: Number.parseInt(lead.score, 10) || 0,
  };
}

function queueForLead(lead: RedditLead, state?: LeadState): LeadQueue {
  if (state?.action === "dm_sent") return "dm_sent";
  if (state?.action === "commented") return "commented";
  if (state?.queue) return state.queue;
  if (lead.recommendedAction === "watch") return "review";
  if (lead.recommendedAction === "comment") return "community_reply";
  if ((Number.parseInt(lead.score, 10) || 0) >= 4) return "actionable";
  return "review";
}

function sortRows(a: EnrichedLead, b: EnrichedLead, sortBy: SortField) {
  if (sortBy === "score") return b.numericScore - a.numericScore || a.title.localeCompare(b.title);
  if (sortBy === "source") return a.sourceLabel.localeCompare(b.sourceLabel);
  if (sortBy === "action") return a.action.localeCompare(b.action);
  return a.title.localeCompare(b.title);
}

function leadKey(lead: RedditLead) {
  return lead.url || `${lead.subreddit}:${lead.title}`;
}

function formatCategory(value: string) {
  return value.replace(/_/g, " ") || "other";
}

function formatQueue(value: LeadQueue) {
  return value.replace(/_/g, " ");
}

function formatAction(value: string) {
  return value.replace(/_/g, " ");
}

function downloadCsv(leads: EnrichedLead[]) {
  const rows = [
    ["queue", "action", "score", "source", "source_date", "author", "title", "category", "reason", "url", "notes"],
    ...leads.map((lead) => [
      lead.queue,
      lead.action,
      lead.score,
      lead.sourceLabel,
      lead.sourceDate,
      lead.author,
      lead.title,
      lead.category,
      lead.reason,
      lead.url,
      lead.notes,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-consulting-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
