"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LeadDashboardData,
  LeadAction,
  LeadQueue,
  LeadSourceId,
  RedditLead,
  StoredLeadState,
} from "@/lib/portal/admin/leads";

type SortField = "score" | "posted" | "source" | "title" | "action";

type LeadState = StoredLeadState;

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
  const [selectedScanMode, setSelectedScanMode] = useState(
    initialData.scanModes[0]?.id ?? "broad-buyer-intent",
  );
  const [selectedSourceId, setSelectedSourceId] = useState<LeadSourceId>(
    preferredSource(initialData)?.id ?? "reddit",
  );
  const [selectedQueue, setSelectedQueue] = useState<LeadQueue>("actionable");
  const [selectedLeadUrl, setSelectedLeadUrl] = useState(
    preferredSource(initialData)?.digest?.leads[0]?.url ?? initialData.digest?.leads[0]?.url ?? "",
  );
  const [search, setSearch] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");
  const [postureFilter, setPostureFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("posted");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [leadState, setLeadState] = useState<Record<string, LeadState>>(initialData.leadStates);
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLeadState((current) => mergeLeadStates(JSON.parse(raw) as Record<string, LeadState>, current));
      }
    } catch {
      setLeadState(initialData.leadStates);
    }
  }, [initialData.leadStates]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leadState));
  }, [leadState]);

  useEffect(() => {
    const currentSource = initialData.sources.find((source) => source.id === selectedSourceId);
    const nextSource = currentSource ?? preferredSource(initialData);

    if (!nextSource) return;
    if (nextSource.id !== selectedSourceId) {
      setSelectedSourceId(nextSource.id);
      setSelectedQueue("actionable");
      setSelectedIds(new Set());
      setSelectedLeadUrl(nextSource.digest?.leads[0]?.url ?? "");
      return;
    }

    const leads = nextSource.digest?.leads ?? [];
    if (leads.length > 0 && selectedLeadUrl && !leads.some((lead) => lead.url === selectedLeadUrl)) {
      setSelectedLeadUrl(leads[0]?.url ?? "");
    }
  }, [initialData, selectedLeadUrl, selectedSourceId]);

  const selectedSource =
    initialData.sources.find((source) => source.id === selectedSourceId) ??
    initialData.sources[0] ??
    null;

  const rows = useMemo(
    () =>
      (selectedSource?.digest?.leads ?? []).map((lead) =>
        enrichLead(lead, leadState[stateKey(lead)] ?? leadState[leadKey(lead)]),
      ),
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

  const leadTypeOptions = useMemo(
    () => filterOptions(rows, (lead) => lead.leadType || lead.category || "other"),
    [rows],
  );
  const postureOptions = useMemo(
    () => filterOptions(rows, (lead) => lead.outreachPosture || "watch"),
    [rows],
  );

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((lead) => lead.queue === selectedQueue)
      .filter((lead) => leadTypeFilter === "all" || (lead.leadType || lead.category || "other") === leadTypeFilter)
      .filter((lead) => postureFilter === "all" || (lead.outreachPosture || "watch") === postureFilter)
      .filter((lead) => {
        if (!needle) return true;
        return [
          lead.title,
          lead.sourceLabel,
          lead.author,
          lead.category,
          lead.leadType,
          lead.vertical,
          lead.failureMode,
          lead.outreachPosture,
          lead.freeToPursuePath,
          lead.commentContext,
          lead.matchedLeadTypes,
          lead.matchEvidence,
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
  }, [leadTypeFilter, postureFilter, rows, search, selectedQueue, sortBy]);

  const selectedLead =
    visibleRows.find((lead) => lead.url === selectedLeadUrl) ??
    visibleRows[0] ??
    null;

  const selectedLeads = rows.filter((lead) => selectedIds.has(stateKey(lead)));
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
        body: JSON.stringify({ mode: selectedScanMode }),
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

  async function runAutomationScan() {
    setIsRunning(true);
    setRunMessage("");
    try {
      const response = await fetch("/api/portal/admin/leads/run-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Automation scan failed");
      }

      setRunMessage(result.message || "Codex automation leads loaded.");
      router.refresh();
    } catch (error) {
      setRunMessage(error instanceof Error ? error.message : "Automation scan failed");
    } finally {
      setIsRunning(false);
    }
  }

  function updateLead(lead: RedditLead, patch: Partial<LeadState>) {
    const key = stateKey(lead);
    const currentState = leadState[key] ?? leadState[leadKey(lead)];
    const nextState = {
      queue: queueForLead(lead, currentState),
      action: currentState?.action ?? "new",
      notes: currentState?.notes ?? "",
      updatedAt: new Date().toISOString(),
      ...patch,
    };

    setLeadState((current) => ({
      ...current,
      [key]: nextState,
    }));
    void persistLeadStateUpdates([
      {
        lead,
        state: nextState,
      },
    ]);
  }

  function bulkMove(queue: LeadQueue, action?: LeadAction) {
    const nextSelected = selectedLeads.length ? selectedLeads : visibleRows;
    const updates = nextSelected.map((lead) => {
      const key = stateKey(lead);
      const currentState = leadState[key] ?? leadState[leadKey(lead)];
      return {
        lead,
        state: {
          queue,
          action: action ?? currentState?.action ?? (queue === "dismissed" ? "dismissed" : "new"),
          notes: currentState?.notes ?? "",
          updatedAt: new Date().toISOString(),
        },
      };
    });

    setLeadState((current) => {
      const next = { ...current };
      for (const update of updates) {
        next[stateKey(update.lead)] = update.state;
      }
      return next;
    });
    setSelectedIds(new Set());
    void persistLeadStateUpdates(updates);
  }

  async function persistLeadStateUpdates(
    updates: Array<{ lead: RedditLead; state: LeadState }>,
  ) {
    try {
      const response = await fetch("/api/portal/admin/leads/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: updates.map(({ lead, state }) => ({
            sourceId: lead.sourceKind,
            leadKey: leadKey(lead),
            queue: state.queue,
            action: state.action,
            notes: state.notes,
          })),
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setRunMessage(result.error ?? "Lead state saved locally, but Supabase persistence failed.");
      }
    } catch {
      setRunMessage("Lead state saved locally, but Supabase persistence failed.");
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#141414] text-[#f3f0e8]">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-5 lg:px-6 xl:px-8">
        <header className="rounded-lg border border-white/10 bg-[#1d1d1d] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                AI consulting lead board
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Leads</h1>
              <p className="mt-1 text-sm text-white/50">
                Switch between Codex research leads and broad Reddit scan modes, then work each source from one queue.
              </p>
            </div>

            {selectedSourceId === "reddit" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedScanMode}
                  onChange={(event) => setSelectedScanMode(event.target.value)}
                  title={initialData.scanModes.find((mode) => mode.id === selectedScanMode)?.description}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  {initialData.scanModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
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
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={runAutomationScan}
                  disabled={isRunning}
                  className="h-10 rounded-md bg-[#f3f0e8] px-4 text-sm font-medium text-[#151515] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  title="Publishes the latest Codex automation digest from the configured worktree output directory."
                >
                  {isRunning ? "Loading..." : "Load automation digest"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {initialData.sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  setSelectedSourceId(source.id);
                  setSelectedQueue("actionable");
                  setLeadTypeFilter("all");
                  setPostureFilter("all");
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
                {source.diagnostic.warning ? " !" : ""}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
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
              selectedSourceId === "reddit" ? (
                <>
                  Last run: {selectedStatus.message} {selectedStatus.successfulFeeds}/
                  {selectedStatus.totalFeeds} feeds, {selectedStatus.fetchedPosts} posts,{" "}
                  {selectedStatus.candidatesScored} scored, scan{" "}
                  {selectedStatus.scanMode ?? selectedScanMode}, ingestion{" "}
                  {selectedStatus.ingestionMode ?? "unknown"}.
                </>
              ) : (
                <>
                  Last run: {selectedStatus.message} {selectedStatus.successfulFeeds}/
                  {selectedStatus.totalFeeds} sources, {selectedStatus.fetchedPosts} candidates,{" "}
                  {selectedStatus.candidatesScored} scored, {selectedStatus.leadsIncluded} loaded.
                </>
              )
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
          {selectedSource?.diagnostic ? (
            <div className="mt-2 text-xs text-white/40">
              Parsed {selectedSource.diagnostic.parsedLeads} displayed lead rows from{" "}
              {selectedSource.diagnostic.fileName || "unknown file"}; declared{" "}
              {selectedSource.diagnostic.declaredCandidates} Best Leads, posted dates{" "}
              {selectedSource.diagnostic.postedDateCount}/
              {selectedSource.diagnostic.parsedLeads}
              {selectedSource.diagnostic.totalHeadingBlocks !==
              selectedSource.diagnostic.bestLeadBlocks
                ? `, ignored ${
                    selectedSource.diagnostic.totalHeadingBlocks -
                    selectedSource.diagnostic.bestLeadBlocks
                  } non-Best Leads rows`
                : ""}
              {selectedSource.diagnostic.warning ? (
                <span className="ml-2 text-amber-300/80">{selectedSource.diagnostic.warning}</span>
              ) : null}
            </div>
          ) : null}
        </header>

        <main className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 rounded-lg border border-white/10 bg-[#202020]">
            <div className="border-b border-white/10 p-4">
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

              <div className="mt-4 grid gap-2 md:grid-cols-[minmax(240px,1fr)_180px_160px_160px_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, reason, source..."
                  className="h-10 w-full rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
                />
                <select
                  value={leadTypeFilter}
                  onChange={(event) => {
                    setLeadTypeFilter(event.target.value);
                    setSelectedIds(new Set());
                  }}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="all">All lead types</option>
                  {leadTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.count}
                    </option>
                  ))}
                </select>
                <select
                  value={postureFilter}
                  onChange={(event) => {
                    setPostureFilter(event.target.value);
                    setSelectedIds(new Set());
                  }}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="all">All postures</option>
                  {postureOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {formatAction(option.value)} {option.count}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortField)}
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="score">Score</option>
                  <option value="posted">Posted date</option>
                  <option value="source">Source</option>
                  <option value="title">Title</option>
                  <option value="action">Action</option>
                </select>
                <button
                  type="button"
                  onClick={() => downloadCsv(selectedLeads.length ? selectedLeads : visibleRows)}
                  className="h-10 rounded-md border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5"
                >
                  CSV
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="mr-1 text-white/45">
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

            <div className="overflow-x-auto">
              {visibleRows.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center">
                  <div>
                    <h2 className="text-base font-medium">No leads match this view</h2>
                    <p className="mt-2 text-sm text-white/45">
                      Run another scan mode or clear the search filter.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#202020] text-xs uppercase tracking-[0.12em] text-white/40">
                    <tr className="border-b border-white/10">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            visibleRows.length > 0 &&
                            visibleRows.every((lead) => selectedIds.has(stateKey(lead)))
                          }
                          onChange={(event) => {
                            setSelectedIds(
                              event.target.checked
                                ? new Set(visibleRows.map((lead) => stateKey(lead)))
                                : new Set(),
                            );
                          }}
                        />
                      </th>
                      <th className="w-[42%] px-4 py-3">Lead</th>
                      <th className="w-[16%] px-4 py-3">Source</th>
                      <th className="w-[120px] px-4 py-3">Posted</th>
                      <th className="w-[16%] px-4 py-3">Type</th>
                      <th className="w-[150px] px-4 py-3">Action</th>
                      <th className="w-[80px] px-4 py-3">Score</th>
                      <th className="w-[190px] px-4 py-3 text-right">Work</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((lead) => (
                      <tr
                        key={stateKey(lead)}
                        className={`cursor-pointer border-b border-white/10 ${
                          selectedLead?.url === lead.url ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                        }`}
                        onClick={() => setSelectedLeadUrl(lead.url)}
                      >
                        <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(stateKey(lead))}
                            onChange={(event) => {
                              setSelectedIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(stateKey(lead));
                                else next.delete(stateKey(lead));
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="font-medium leading-5">{lead.title}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">
                            {lead.reason}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-white/65">{lead.sourceLabel}</td>
                        <td className="px-4 py-4 align-top text-white/65">
                          {lead.postedDate || <span className="text-amber-300/80">unknown</span>}
                        </td>
                        <td className="px-4 py-4 align-top capitalize text-white/65">
                          <div>{formatLeadType(lead)}</div>
                          {lead.outreachPosture ? (
                            <div className="mt-1 text-xs normal-case text-cyan-200/70">
                              {formatAction(lead.outreachPosture)}
                            </div>
                          ) : null}
                          {lead.freeToPursuePath ? (
                            <div className="mt-1 line-clamp-2 text-xs normal-case text-white/40">
                              {lead.freeToPursuePath}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top">
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
                        <td className="px-4 py-4 align-top">
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
                            {lead.score}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right align-top" onClick={(event) => event.stopPropagation()}>
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
      <aside className="rounded-lg border border-white/10 bg-[#202020] p-6 text-center 2xl:sticky 2xl:top-5">
        <h2 className="text-base font-medium">No lead selected</h2>
        <p className="mt-2 text-sm text-white/45">Select a row to review the source and next action.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-white/10 bg-[#202020] p-5 2xl:sticky 2xl:top-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{lead.sourceLabel}</span>
        <span>{lead.author}</span>
        <span>posted {lead.postedDate || "unknown"}</span>
        {lead.discoveredDate ? <span>found {lead.discoveredDate}</span> : null}
        <span>{formatLeadType(lead)}</span>
        {lead.outreachPosture ? <span>{formatAction(lead.outreachPosture)}</span> : null}
      </div>
      <h2 className="mt-2 text-xl font-semibold leading-7">{lead.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/55">{lead.reason}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailStat label="Score" value={lead.score} />
        <DetailStat label="Posted" value={lead.postedDate || "unknown"} />
        <DetailStat label="Lead type" value={formatLeadType(lead)} />
        <DetailStat label="Vertical" value={formatCategory(lead.vertical || "other")} />
        <DetailStat label="Failure" value={formatCategory(lead.failureMode || "other")} />
        <DetailStat label="Posture" value={formatAction(lead.outreachPosture || "watch")} />
        <DetailStat label="Recommended" value={formatAction(lead.recommendedAction)} />
        <DetailStat label="Queue" value={formatQueue(lead.queue)} />
        <DetailStat label="Action" value={formatAction(lead.action)} />
      </div>

      {lead.freeToPursuePath ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">Free-to-pursue path</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">{lead.freeToPursuePath}</p>
        </section>
      ) : null}

      {lead.commentContext ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">Comment context</h3>
          <p className="mt-2 text-sm leading-6 text-white/65">{lead.commentContext}</p>
        </section>
      ) : null}

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

function preferredSource(data: LeadDashboardData) {
  return (
    data.sources.find((source) => source.id === "automation" && (source.digest?.leads.length ?? 0) > 0) ??
    data.sources.find((source) => (source.digest?.leads.length ?? 0) > 0) ??
    data.sources[0] ??
    null
  );
}

function mergeLeadStates(
  localState: Record<string, LeadState>,
  databaseState: Record<string, LeadState>,
) {
  const merged = { ...localState };
  for (const [key, databaseValue] of Object.entries(databaseState)) {
    const localValue = merged[key];
    if (!localValue || dateValue(databaseValue.updatedAt) >= dateValue(localValue.updatedAt)) {
      merged[key] = databaseValue;
    }
  }
  return merged;
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function filterOptions(leads: RedditLead[], valueForLead: (lead: RedditLead) => string) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const value = valueForLead(lead);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || formatCategory(a[0]).localeCompare(formatCategory(b[0])))
    .map(([value, count]) => ({
      value,
      count,
      label: formatCategory(value),
    }));
}

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
  if (lead.recommendedAction === "ignore") return "dismissed";
  if (lead.recommendedAction === "dm" || lead.recommendedAction === "dm_if_engaged") return "actionable";
  if (lead.recommendedAction === "watch") return "review";
  if (lead.recommendedAction === "comment") return "community_reply";
  if ((Number.parseInt(lead.score, 10) || 0) >= 4) return "actionable";
  return "review";
}

function sortRows(a: EnrichedLead, b: EnrichedLead, sortBy: SortField) {
  if (sortBy === "score") return b.numericScore - a.numericScore || a.title.localeCompare(b.title);
  if (sortBy === "posted") return dateSortKey(b.postedDate) - dateSortKey(a.postedDate) || b.numericScore - a.numericScore;
  if (sortBy === "source") return a.sourceLabel.localeCompare(b.sourceLabel);
  if (sortBy === "action") return a.action.localeCompare(b.action);
  return a.title.localeCompare(b.title);
}

function dateSortKey(date: string) {
  return date ? new Date(`${date}T00:00:00Z`).getTime() || 0 : 0;
}

function leadKey(lead: RedditLead) {
  return lead.url || `${lead.subreddit}:${lead.title}`;
}

function stateKey(lead: RedditLead) {
  return `${lead.sourceKind}:${leadKey(lead)}`;
}

function formatCategory(value: string) {
  return value.replace(/_/g, " ") || "other";
}

function formatLeadType(lead: RedditLead) {
  return formatCategory(lead.leadType || lead.category);
}

function formatQueue(value: LeadQueue) {
  return value.replace(/_/g, " ");
}

function formatAction(value: string) {
  return value.replace(/_/g, " ");
}

function downloadCsv(leads: EnrichedLead[]) {
  const rows = [
    [
      "queue",
      "action",
      "score",
      "source",
      "posted_date",
      "discovered_date",
      "author",
      "title",
      "category",
      "lead_type",
      "vertical",
      "failure_mode",
      "outreach_posture",
      "free_to_pursue_path",
      "comment_context",
      "reason",
      "url",
      "notes",
    ],
    ...leads.map((lead) => [
      lead.queue,
      lead.action,
      lead.score,
      lead.sourceLabel,
      lead.postedDate,
      lead.discoveredDate,
      lead.author,
      lead.title,
      lead.category,
      lead.leadType,
      lead.vertical,
      lead.failureMode,
      lead.outreachPosture,
      lead.freeToPursuePath,
      lead.commentContext,
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
