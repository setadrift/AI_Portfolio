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
import { isLeadReadyToPursue } from "@/lib/portal/admin/lead-publish-policy";
import {
  OPPORTUNITY_TYPES,
  type ConsultingOfferRecord,
  type OpportunityType,
} from "@/lib/portal/admin/acquisition";

type SortField =
  | "priority"
  | "score"
  | "posted"
  | "source"
  | "title"
  | "status";
type BoardStage = "all" | "ready" | "review" | "pursued" | "closed";
type SourceFilter = LeadSourceId | "all";

type LeadState = StoredLeadState;
type ScanEvent =
  | { type: "log"; message: string }
  | { type: "done"; ok: boolean; stdout: string; stderr: string }
  | { type: "error"; message: string; stdout: string; stderr: string };

const STORAGE_KEY = "ai-portfolio-admin-lead-state-v1";

const STAGES: Array<{
  value: BoardStage;
  label: string;
  description: string;
}> = [
  { value: "all", label: "All", description: "Every current lead." },
  {
    value: "ready",
    label: "Ready",
    description: "Good enough to pursue now.",
  },
  {
    value: "review",
    label: "Review",
    description: "Needs a quick fit or eligibility check.",
  },
  {
    value: "pursued",
    label: "Pursued",
    description: "Application, email, reply, or message already sent.",
  },
  {
    value: "closed",
    label: "Closed",
    description: "Not a fit, stale, duplicate, or no longer active.",
  },
];

const queueButtonClass =
  "rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:border-white/25 hover:bg-white/5 hover:text-white";

export default function LeadsDashboard({
  initialData,
  offers,
  promotedLeadKeys,
}: {
  initialData: LeadDashboardData;
  offers: ConsultingOfferRecord[];
  promotedLeadKeys: string[];
}) {
  const router = useRouter();
  const [selectedScanMode, setSelectedScanMode] = useState(
    initialData.scanModes[0]?.id ?? "broad-buyer-intent",
  );
  const [selectedSourceId, setSelectedSourceId] =
    useState<SourceFilter>("all");
  const [selectedStage, setSelectedStage] = useState<BoardStage>("ready");
  const [selectedLeadUrl, setSelectedLeadUrl] = useState("");
  const [search, setSearch] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortField>("priority");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [leadState, setLeadState] = useState<Record<string, LeadState>>(
    initialData.leadStates,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState("");
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [scanElapsedSeconds, setScanElapsedSeconds] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLeadState((current) =>
          mergeLeadStates(
            JSON.parse(raw) as Record<string, LeadState>,
            current,
          ),
        );
      }
    } catch {
      setLeadState(initialData.leadStates);
    }
  }, [initialData.leadStates]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leadState));
  }, [leadState]);

  useEffect(() => {
    if (!isRunning || !scanStartedAt) return;
    const timer = window.setInterval(() => {
      setScanElapsedSeconds(Math.floor((Date.now() - scanStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, scanStartedAt]);

  const selectedSource =
    selectedSourceId === "all"
      ? null
      : (initialData.sources.find(
          (source) => source.id === selectedSourceId,
        ) ?? null);

  const rows = useMemo(
    () => {
      const sources =
        selectedSourceId === "all"
          ? initialData.sources
          : initialData.sources.filter(
              (source) => source.id === selectedSourceId,
            );
      const enriched = sources.flatMap((source) =>
        (source.digest?.leads ?? []).map((lead) =>
          enrichLead(
            lead,
            leadState[stateKey(lead)] ?? leadState[leadKey(lead)],
          ),
        ),
      );
      return dedupeLeadRows(enriched);
    },
    [initialData.sources, leadState, selectedSourceId],
  );

  const counts = useMemo(() => {
    return STAGES.reduce(
      (acc, stage) => ({
        ...acc,
        [stage.value]: rows.filter((lead) =>
          leadMatchesStage(lead, stage.value),
        ).length,
      }),
      {} as Record<BoardStage, number>,
    );
  }, [rows]);
  const allPipelineCount = useMemo(
    () =>
      new Set(
        initialData.sources.flatMap((source) =>
          (source.digest?.leads ?? []).map((lead) =>
            normalizeLeadUrl(lead.url),
          ),
        ),
      ).size,
    [initialData.sources],
  );

  const leadTypeOptions = useMemo(
    () =>
      filterOptions(rows, (lead) => lead.leadType || lead.category || "other"),
    [rows],
  );
  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((lead) => leadMatchesStage(lead, selectedStage))
      .filter(
        (lead) =>
          leadTypeFilter === "all" ||
          (lead.leadType || lead.category || "other") === leadTypeFilter,
      )
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
          lead.sourceFamily,
          lead.buyerSituation,
          lead.offerMatch,
          lead.evidenceSummary,
          lead.ownershipQuote,
          lead.askQuote,
          lead.replyAngle,
          lead.whyNow,
          lead.speaker,
          lead.intent,
          lead.consultingFit,
          lead.rejectionReason,
          lead.sourceQuoteOrSnippet,
          lead.evidenceUrl,
          lead.missingEvidence,
          lead.nextStep,
          lead.relatedSources,
          lead.commentContext,
          lead.matchedLeadTypes,
          lead.matchEvidence,
          lead.reason,
          lead.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => sortRows(a, b, sortBy));
  }, [leadTypeFilter, rows, search, selectedStage, sortBy]);

  const selectedLead =
    visibleRows.find((lead) => lead.url === selectedLeadUrl) ?? null;

  const selectedLeads = rows.filter((lead) => selectedIds.has(stateKey(lead)));
  const currentStage =
    STAGES.find((stage) => stage.value === selectedStage) ?? STAGES[0];
  const selectedStatus = selectedSource?.status ?? null;
  const automationSource = initialData.sources.find(
    (source) => source.id === "automation",
  );

  async function runScan() {
    setIsRunning(true);
    setRunMessage("Starting Reddit scan...");
    setScanLog(["Starting Reddit scan..."]);
    setScanProgress(5);
    setScanStartedAt(Date.now());
    setScanElapsedSeconds(0);
    try {
      const response = await fetch("/api/portal/admin/leads/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedScanMode }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "Scan failed");
      }

      if (!response.body) {
        throw new Error("Scan response did not include a progress stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      let scanError = "";

      while (!completed) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const errorMessage = handleScanEvent(line);
            if (errorMessage) scanError = errorMessage;
          }
        }
        completed = done;
      }
      if (buffer.trim()) {
        const errorMessage = handleScanEvent(buffer);
        if (errorMessage) scanError = errorMessage;
      }

      if (scanError) {
        throw new Error(scanError);
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      setRunMessage(message);
      appendScanLog(message);
    } finally {
      setIsRunning(false);
    }
  }

  function handleScanEvent(line: string) {
    if (!line.trim()) return "";
    const event = JSON.parse(line) as ScanEvent;
    if (event.type === "log") {
      appendScanLog(event.message);
      setRunMessage(event.message);
      setScanProgress((current) =>
        Math.max(current, progressForMessage(event.message)),
      );
      return "";
    }
    if (event.type === "done") {
      setScanProgress(100);
      setRunMessage("Scan complete. Results loaded.");
      appendScanLog("Scan complete. Results loaded.");
      return "";
    }
    setScanProgress(100);
    setRunMessage(event.message || "Scan failed.");
    appendScanLog(event.stderr || event.message || "Scan failed.");
    return event.stderr || event.message || "Scan failed.";
  }

  function appendScanLog(message: string) {
    setScanLog((current) => [...current, message].slice(-12));
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

      setRunMessage(result.message || "Published research refreshed.");
      router.refresh();
    } catch (error) {
      setRunMessage(
        error instanceof Error ? error.message : "Automation scan failed",
      );
    } finally {
      setIsRunning(false);
    }
  }

  function updateLead(
    lead: RedditLead,
    patch: Partial<LeadState>,
    persist = true,
  ) {
    const key = stateKey(lead);
    const currentState = leadState[key] ?? leadState[leadKey(lead)];
    const currentQueue = queueForLead(lead, currentState);
    const nextState = {
      queue: currentQueue,
      action: currentState?.action ?? "new",
      commented:
        currentState?.commented ?? currentState?.action === "commented",
      dmSent: currentState?.dmSent ?? currentState?.action === "dm_sent",
      dismissed:
        currentState?.dismissed ?? currentState?.action === "dismissed",
      notes: currentState?.notes ?? "",
      updatedAt: new Date().toISOString(),
      ...patch,
    };
    nextState.action = actionForState(nextState);

    setLeadState((current) => ({
      ...current,
      [key]: nextState,
    }));
    if (persist) {
      void persistLeadStateUpdates([
        {
          lead,
          state: nextState,
        },
      ]);
    }
  }

  function setLeadStage(lead: RedditLead, stage: Exclude<BoardStage, "all">) {
    updateLead(lead, statePatchForStage(stage));
  }

  function bulkSetStage(stage: Exclude<BoardStage, "all">) {
    const nextSelected = selectedLeads.length ? selectedLeads : visibleRows;
    const updates = nextSelected.map((lead) => {
      const key = stateKey(lead);
      const currentState = leadState[key] ?? leadState[leadKey(lead)];
      const patch = statePatchForStage(stage);
      const nextState = {
        queue: currentState?.queue ?? queueForLead(lead, currentState),
        action: currentState?.action ?? "new",
        commented: currentState?.commented ?? false,
        dmSent: currentState?.dmSent ?? false,
        dismissed: currentState?.dismissed ?? false,
        notes: currentState?.notes ?? "",
        updatedAt: new Date().toISOString(),
        ...patch,
      };
      nextState.action = actionForState(nextState);
      return {
        lead,
        state: nextState,
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
            commented: state.commented,
            dmSent: state.dmSent,
            dismissed: state.dismissed,
            notes: state.notes,
          })),
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setRunMessage(
          result.error ??
            "Lead state saved locally, but Supabase persistence failed.",
        );
      }
    } catch {
      setRunMessage(
        "Lead state saved locally, but Supabase persistence failed.",
      );
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
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Leads
              </h1>
              <p className="mt-1 text-sm text-white/50">
                Work the best current leads first. Run scans only when the queue
                needs refreshing.
              </p>
              <p className="mt-2 text-xs text-white/40">
                {counts.ready} ready to act on
                {automationSource?.digest?.generatedAt
                  ? ` · Research published ${formatPublishedAt(automationSource.digest.generatedAt)}`
                  : " · No published automation research"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <details className="relative">
                <summary className="flex h-9 cursor-pointer list-none items-center rounded-md border border-white/10 px-3 text-sm text-white/65 hover:bg-white/5">
                  Scan settings
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-white/10 bg-[#202020] p-3 shadow-xl">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-white/40">
                    Reddit scan mode
                  </p>
                <select
                  value={selectedScanMode}
                  onChange={(event) => setSelectedScanMode(event.target.value)}
                  title={
                    initialData.scanModes.find(
                      (mode) => mode.id === selectedScanMode,
                    )?.description
                  }
                  className="h-9 w-full rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  {initialData.scanModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                </div>
              </details>
                <button
                  type="button"
                  onClick={runScan}
                  disabled={isRunning}
                  className="h-9 rounded-md border border-white/10 px-3 text-sm text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunning ? "Working..." : "Scan Reddit"}
                </button>
                <button
                  type="button"
                  onClick={runAutomationScan}
                  disabled={isRunning}
                  className="h-9 rounded-md bg-[#f3f0e8] px-3 text-sm font-medium text-[#151515] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  title="Refreshes the latest research already published by the daily Codex automation."
                >
                  {isRunning ? "Working..." : "Refresh published leads"}
                </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSourceId("all");
                setSelectedStage("ready");
                setLeadTypeFilter("all");
                setSelectedIds(new Set());
                setSelectedLeadUrl("");
              }}
              className={`rounded-md px-3 py-2 text-sm transition ${
                selectedSourceId === "all"
                  ? "bg-white text-[#151515]"
                  : "bg-white/5 text-white/65 hover:bg-white/10"
              }`}
            >
              All pipelines {allPipelineCount}
            </button>
            {initialData.sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => {
                  setSelectedSourceId(source.id);
                  setSelectedStage("ready");
                  setLeadTypeFilter("all");
                  setSelectedIds(new Set());
                  setSelectedLeadUrl("");
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

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-sm">
            <SummaryCount label="Current" value={counts.all} />
            <SummaryCount label="Ready" value={counts.ready} />
            <SummaryCount label="Review" value={counts.review} />
            <SummaryCount label="Pursued" value={counts.pursued} />
            <SummaryCount label="Closed" value={counts.closed} />
          </div>

          <details className="mt-3 text-xs text-white/45">
            <summary className="cursor-pointer select-none text-white/55">
              Run details{runMessage ? ` - ${runMessage}` : ""}
            </summary>
            <div className="mt-2 space-y-1">
              <p>
                {selectedStatus ? (
                  selectedSourceId === "reddit" ? (
                    <>
                      Last run: {selectedStatus.message}{" "}
                      {selectedStatus.successfulFeeds}/
                      {selectedStatus.totalFeeds} feeds,{" "}
                      {selectedStatus.fetchedPosts} posts,{" "}
                      {selectedStatus.candidatesScored} scored.
                    </>
                  ) : (
                    <>
                      Last run: {selectedStatus.message}{" "}
                      {selectedStatus.successfulFeeds}/
                      {selectedStatus.totalFeeds} sources,{" "}
                      {selectedStatus.fetchedPosts} candidates,{" "}
                      {selectedStatus.candidatesScored} scored,{" "}
                      {selectedStatus.leadsIncluded} loaded.
                    </>
                  )
                ) : selectedSource?.digest ? (
                  <>
                    Source: {selectedSource.description} Generated{" "}
                    {selectedSource.digest.generatedAt || "unknown"},{" "}
                    {selectedSource.digest.leads.length} leads loaded.
                  </>
                ) : selectedSourceId === "all" ? (
                  "Select a pipeline to see its run diagnostics."
                ) : (
                  "No lead source data found."
                )}
              </p>
              {selectedSource?.diagnostic ? (
                <p>
                  Rows: {selectedSource.diagnostic.parsedLeads}; file{" "}
                  {selectedSource.diagnostic.fileName || "unknown"}; posted
                  dates {selectedSource.diagnostic.postedDateCount}/
                  {selectedSource.diagnostic.parsedLeads}.
                  {selectedSource.diagnostic.warning ? (
                    <span className="ml-2 text-amber-300/80">
                      {selectedSource.diagnostic.warning}
                    </span>
                  ) : null}
                </p>
              ) : null}
              {selectedStatus?.sourceFamilyDiagnostics ? (
                <p>
                  Source families:{" "}
                  {formatStatusCounts(
                    selectedStatus.sourceFamilyDiagnostics
                      .activeLeadCountBySourceFamily,
                  )}
                  ; candidates{" "}
                  {formatStatusCounts(
                    selectedStatus.sourceFamilyDiagnostics
                      .candidateCountBySourceFamily,
                  )}
                  ; duplicates removed{" "}
                  {formatStatusCounts(
                    selectedStatus.sourceFamilyDiagnostics.duplicatesRemoved,
                  )}
                  .
                </p>
              ) : null}
              {selectedStatus?.rejectCounts ? (
                <p>
                  Rejects: {formatStatusCounts(selectedStatus.rejectCounts)}
                </p>
              ) : null}
              {selectedStatus?.queryDiagnostics?.length ? (
                <p>
                  Queries:{" "}
                  {selectedStatus.queryDiagnostics
                    .slice(0, 4)
                    .map(
                      (query) =>
                        `${query.id ?? query.query}: ${query.surfaced ?? query.replyable ?? 0}/${query.fetchedPosts} surfaced`,
                    )
                    .join("; ")}
                </p>
              ) : null}
              {selectedStatus?.sourceHealth?.length ? (
                <p>
                  Source health:{" "}
                  {selectedStatus.sourceHealth
                    .slice(0, 4)
                    .map(
                      (source) =>
                        `${source.source} ${(source.precision * 100).toFixed(0)}%${source.quarantined ? " quarantined" : ""}`,
                    )
                    .join("; ")}
                </p>
              ) : null}
            </div>
          </details>
          {(isRunning || scanLog.length > 0) &&
          (selectedSourceId === "reddit" || selectedSourceId === "all") ? (
            <div className="mt-4 rounded-md border border-white/10 bg-[#151515] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">
                    {isRunning ? "Reddit scan running" : "Latest scan log"}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {isRunning
                      ? `Elapsed ${formatElapsed(scanElapsedSeconds)}. You can leave this page open while posts are fetched and scored.`
                      : "The next run will replace the cleared Reddit queue."}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-white/45">
                  {Math.round(scanProgress)}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                  style={{
                    width: `${Math.max(5, Math.min(100, scanProgress))}%`,
                  }}
                />
              </div>
              <div className="mt-3 max-h-36 overflow-auto rounded-md border border-white/10 bg-black/20 p-2 font-mono text-xs leading-5 text-white/55">
                {scanLog.map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <main className="space-y-4">
          <section className="min-w-0 rounded-lg border border-white/10 bg-[#202020]">
            <div className="border-b border-white/10 p-4">
              <div className="flex flex-wrap gap-2">
                {STAGES.map((stage) => (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => {
                      setSelectedStage(stage.value);
                      setSelectedIds(new Set());
                      setSelectedLeadUrl("");
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      selectedStage === stage.value
                        ? "bg-white text-[#151515]"
                        : "bg-white/5 text-white/65 hover:bg-white/10"
                    }`}
                    title={stage.description}
                  >
                    {stage.label} {counts[stage.value]}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search opportunities..."
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
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortField)
                  }
                  className="h-10 rounded-md border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="priority">Priority</option>
                  <option value="score">Score</option>
                  <option value="posted">Posted date</option>
                  <option value="source">Source</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      selectedLeads.length ? selectedLeads : visibleRows,
                    )
                  }
                  className="h-10 rounded-md border border-white/10 px-4 text-sm text-white/70 hover:bg-white/5"
                >
                  CSV
                </button>
              </div>

              <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2 text-sm">
                <span className="mr-1 text-white/45">
                  {selectedIds.size
                    ? `${selectedIds.size} selected`
                    : `${visibleRows.length} ${visibleRows.length === 1 ? "lead" : "leads"} in ${currentStage.label}`}
                </span>
                {selectedIds.size ? (
                  <>
                    <button
                      type="button"
                      onClick={() => bulkSetStage("ready")}
                      className={queueButtonClass}
                    >
                      Ready
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetStage("review")}
                      className={queueButtonClass}
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetStage("pursued")}
                      className={queueButtonClass}
                    >
                      Mark pursued
                    </button>
                    <button
                      type="button"
                      onClick={() => bulkSetStage("closed")}
                      className={queueButtonClass}
                    >
                      Close
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              {visibleRows.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center px-6 text-center">
                  <div>
                    <h2 className="text-base font-medium">
                      No leads match this view
                    </h2>
                    <p className="mt-2 text-sm text-white/45">
                      Run another scan mode or clear the search filter.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[#202020] text-xs uppercase tracking-[0.12em] text-white/40">
                    <tr className="border-b border-white/10">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            visibleRows.length > 0 &&
                            visibleRows.every((lead) =>
                              selectedIds.has(stateKey(lead)),
                            )
                          }
                          onChange={(event) => {
                            setSelectedIds(
                              event.target.checked
                                ? new Set(
                                    visibleRows.map((lead) => stateKey(lead)),
                                  )
                                : new Set(),
                            );
                          }}
                        />
                      </th>
                      <th className="w-[34%] px-4 py-3">Opportunity</th>
                      <th className="w-[16%] px-4 py-3">Source</th>
                      <th className="w-[120px] px-4 py-3">Posted</th>
                      <th className="w-[130px] px-4 py-3">Engagement</th>
                      <th className="w-[155px] px-4 py-3">How to pursue</th>
                      <th className="w-[135px] px-4 py-3">Status</th>
                      <th className="w-[70px] px-4 py-3">Fit</th>
                      <th className="w-[120px] px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((lead) => (
                      <tr
                        key={stateKey(lead)}
                        className={`cursor-pointer border-b border-white/10 ${
                          selectedLead?.url === lead.url
                            ? "bg-white/[0.08]"
                            : "hover:bg-white/[0.04]"
                        }`}
                        onClick={() => setSelectedLeadUrl(lead.url)}
                      >
                        <td
                          className="px-3 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(stateKey(lead))}
                            onChange={(event) => {
                              setSelectedIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked)
                                  next.add(stateKey(lead));
                                else next.delete(stateKey(lead));
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium leading-5 text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white"
                            aria-label={`Open ${lead.title} in a new tab`}
                          >
                            {lead.title}
                          </a>
                          <div className="mt-1 line-clamp-1 text-xs leading-5 text-white/45">
                            {lead.ownershipQuote
                              ? lead.ownershipQuote
                              : `${lead.buyerSituation ? `${formatCategory(lead.buyerSituation)} - ` : ""}${lead.evidenceSummary || lead.reason}`}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-white/65">
                          <div>{lead.sourceLabel}</div>
                          <div className="mt-1 text-xs capitalize text-white/35">
                            {lead.sourceKind} pipeline
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-white/65">
                          {lead.postedDate || (
                            <span className="text-amber-300/80">unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-white/65">
                          <div>{engagementLabel(lead)}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-white/70">
                          {pursuitMethod(lead)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <select
                            value={stageForLead(lead)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              setLeadStage(
                                lead,
                                event.target.value as Exclude<
                                  BoardStage,
                                  "all"
                                >,
                              );
                            }}
                            className="h-8 rounded-md border border-white/10 bg-[#151515] px-2 text-xs text-white outline-none"
                          >
                            {STAGES.filter(
                              (stage) => stage.value !== "all",
                            ).map((stage) => (
                              <option key={stage.value} value={stage.value}>
                                {stage.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="font-medium tabular-nums text-white/80">
                            {lead.score}
                          </span>
                        </td>
                        <td
                          className="px-4 py-4 align-top"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex flex-col items-end gap-2">
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-[#151515] transition hover:bg-[#f3f0e8]"
                              aria-label={`Open ${lead.title} in a new tab`}
                            >
                              Open lead
                            </a>
                            <button
                              type="button"
                              onClick={() => setSelectedLeadUrl(lead.url)}
                              className="text-xs text-white/50 transition hover:text-white"
                            >
                              View details
                            </button>
                          </div>
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
            persistLead={(lead) => {
              const state =
                leadState[stateKey(lead)] ?? leadState[leadKey(lead)];
              if (state) void persistLeadStateUpdates([{ lead, state }]);
            }}
            offers={offers}
            promoted={
              selectedLead
                ? promotedLeadKeys.includes(stateKey(selectedLead)) ||
                  selectedLead.action === "converted"
                : false
            }
          />
        </main>
      </div>
    </div>
  );
}

function SummaryCount({ label, value }: { label: string; value: number }) {
  return (
    <p className="text-white/45">
      {label} <span className="ml-1 font-medium tabular-nums text-white">{value}</span>
    </p>
  );
}

function LeadDetail({
  lead,
  updateLead,
  persistLead,
  offers,
  promoted,
}: {
  lead: EnrichedLead | null;
  updateLead: (
    lead: RedditLead,
    patch: Partial<LeadState>,
    persist?: boolean,
  ) => void;
  persistLead: (lead: RedditLead) => void;
  offers: ConsultingOfferRecord[];
  promoted: boolean;
}) {
  if (!lead) return null;

  return (
    <aside className="rounded-lg border border-white/10 bg-[#202020] p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{lead.sourceLabel}</span>
        <span>{lead.author}</span>
        <span>posted {lead.postedDate || "unknown"}</span>
        {lead.discoveredDate ? <span>found {lead.discoveredDate}</span> : null}
        <span>{formatLeadType(lead)}</span>
      </div>
      <h2 className="mt-2 text-xl font-semibold leading-7">{lead.title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/55">{lead.reason}</p>

      <PromotionPanel
        lead={lead}
        offers={offers}
        promoted={promoted}
        onPromoted={() =>
          updateLead(lead, { action: "converted", dismissed: false })
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <DetailStat label="Score" value={lead.score} />
        <DetailStat label="Posted" value={lead.postedDate || "unknown"} />
        <DetailStat label="Lead type" value={formatLeadType(lead)} />
        <DetailStat
          label="Situation"
          value={formatCategory(
            lead.intent || lead.buyerSituation || "unknown",
          )}
        />
        <DetailStat
          label="Offer"
          value={formatCategory(lead.offerMatch || "unknown")}
        />
        <DetailStat
          label="Vertical"
          value={formatCategory(lead.vertical || "other")}
        />
        <DetailStat
          label="Failure"
          value={formatCategory(lead.failureMode || "other")}
        />
        <DetailStat label="Status" value={formatCategory(stageForLead(lead))} />
        <DetailStat label="How to pursue" value={pursuitMethod(lead)} />
      </div>

      {lead.ownershipQuote ||
      lead.askQuote ||
      lead.replyAngle ||
      lead.whyNow ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">
            Verified evidence
          </h3>
          {lead.ownershipQuote ? (
            <blockquote className="mt-3 border-l border-white/15 pl-3 text-sm leading-6 text-white/70">
              {lead.ownershipQuote}
            </blockquote>
          ) : null}
          {lead.askQuote ? (
            <blockquote className="mt-3 border-l border-white/15 pl-3 text-sm leading-6 text-white/70">
              {lead.askQuote}
            </blockquote>
          ) : null}
          <div className="mt-3 grid gap-2 text-xs text-white/45">
            {lead.whyNow ? (
              <p>
                <span className="text-white/60">Why now:</span> {lead.whyNow}
              </p>
            ) : null}
            {lead.replyAngle ? (
              <p>
                <span className="text-white/60">Reply angle:</span>{" "}
                {lead.replyAngle}
              </p>
            ) : null}
            {lead.speaker ? (
              <p>
                <span className="text-white/60">Speaker:</span>{" "}
                {formatCategory(lead.speaker)}
              </p>
            ) : null}
            {lead.intent ? (
              <p>
                <span className="text-white/60">Intent:</span>{" "}
                {formatCategory(lead.intent)}
              </p>
            ) : null}
            {lead.consultingFit ? (
              <p>
                <span className="text-white/60">Fit:</span>{" "}
                {formatCategory(lead.consultingFit)}
              </p>
            ) : null}
            {lead.rejectionReason ? (
              <p>
                <span className="text-white/60">Reject:</span>{" "}
                {formatCategory(lead.rejectionReason)}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {lead.evidenceSummary || lead.missingEvidence || lead.nextStep ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">
            Buyer evidence
          </h3>
          {lead.evidenceSummary ? (
            <p className="mt-2 text-sm leading-6 text-white/65">
              {lead.evidenceSummary}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 text-xs text-white/45">
            {lead.nextStep ? (
              <p>
                <span className="text-white/60">Next:</span> {lead.nextStep}
              </p>
            ) : null}
            {lead.responsePath ? (
              <p>
                <span className="text-white/60">Path:</span> {lead.responsePath}
              </p>
            ) : null}
            {lead.missingEvidence ? (
              <p>
                <span className="text-white/60">Missing:</span>{" "}
                {lead.missingEvidence}
              </p>
            ) : null}
            {lead.sourceQuoteOrSnippet ? (
              <p>
                <span className="text-white/60">Source:</span>{" "}
                {lead.sourceQuoteOrSnippet}
              </p>
            ) : null}
            {lead.relatedSources && lead.relatedSources !== "none" ? (
              <p>
                <span className="text-white/60">Related:</span>{" "}
                {lead.relatedSources}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {lead.businessMaturityScore ||
      lead.aiLeverageScore ||
      lead.commercialFitScore ||
      lead.confidenceScore ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">
            Fit scores
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55">
            <FitScore label="Business" value={lead.businessMaturityScore} />
            <FitScore label="Pain" value={lead.painSeverityScore} />
            <FitScore label="Hiring" value={lead.hiringLikelihoodScore} />
            <FitScore label="AI leverage" value={lead.aiLeverageScore} />
            <FitScore label="Commercial" value={lead.commercialFitScore} />
            <FitScore label="Duncan fit" value={lead.duncanFitScore} />
            <FitScore label="Reach" value={lead.reachabilityScore} />
            <FitScore label="Freshness" value={lead.freshnessScore} />
            <FitScore label="Confidence" value={lead.confidenceScore} />
          </div>
        </section>
      ) : null}

      {lead.commentContext ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">
            Comment context
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {lead.commentContext}
          </p>
        </section>
      ) : null}

      {lead.sourceQuery ? (
        <section className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-xs uppercase tracking-[0.16em] text-white/35">
            Search source
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {lead.sourceQuery}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/40">
            {lead.sourcePatternFamily ? (
              <span>{formatCategory(lead.sourcePatternFamily)}</span>
            ) : null}
            {lead.sourceVertical ? (
              <span>{formatCategory(lead.sourceVertical)}</span>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            updateLead(lead, {
              notes: decisionNote(lead.notes, "good_lead"),
              dismissed: false,
            })
          }
          className={queueButtonClass}
        >
          Good lead
        </button>
        {[
          "not_operator",
          "no_real_ask",
          "bad_fit",
          "stale",
          "seller",
          "other",
        ].map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() =>
              updateLead(lead, {
                queue: "dismissed",
                dismissed: true,
                notes: decisionNote(lead.notes, `bad_lead:${reason}`),
              })
            }
            className={queueButtonClass}
          >
            Bad: {formatCategory(reason)}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            updateLead(lead, {
              notes: decisionNote(
                lead.notes,
                `blocklist_author:${lead.author}`,
              ),
            })
          }
          className={queueButtonClass}
        >
          Blocklist author
        </button>
        <button
          type="button"
          onClick={() =>
            updateLead(lead, {
              notes: decisionNote(
                lead.notes,
                `quarantine_source:${lead.sourceQuery ? `query:${lead.sourceQuery}` : `subreddit:${lead.subreddit}`}`,
              ),
            })
          }
          className={queueButtonClass}
        >
          Quarantine source
        </button>
        {(["ready", "review", "pursued"] as const).map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => updateLead(lead, statePatchForStage(stage))}
            className={queueButtonClass}
          >
            {stage === "pursued" ? "Mark pursued" : formatCategory(stage)}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            updateLead(
              lead,
              statePatchForStage(lead.dismissed ? "review" : "closed"),
            )
          }
          className={queueButtonClass}
        >
          {lead.dismissed ? "Reopen" : "Close"}
        </button>
      </div>

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-[0.16em] text-white/35">
          Notes
        </span>
        <textarea
          value={lead.notes}
          onChange={(event) =>
            updateLead(lead, { notes: event.target.value }, false)
          }
          onBlur={() => persistLead(lead)}
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

function PromotionPanel({
  lead,
  offers,
  promoted,
  onPromoted,
}: {
  lead: EnrichedLead;
  offers: ConsultingOfferRecord[];
  promoted: boolean;
  onPromoted: () => void;
}) {
  const router = useRouter();
  const [defaultDue] = useState(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const matchedOffer = offers.find(
    (offer) =>
      offer.slug === lead.offerMatch ||
      offer.name.toLowerCase().replace(/\s+/g, "_") === lead.offerMatch,
  );
  const [opportunityType, setOpportunityType] = useState<OpportunityType>(
    lead.buyerSituation?.includes("partner")
      ? "partner_overflow"
      : "direct_client",
  );
  const [offerId, setOfferId] = useState(
    matchedOffer?.id ||
      offers.find((offer) => offer.slug === "custom-scope")?.id ||
      "",
  );
  const [nextAction, setNextAction] = useState(
    lead.nextStep ||
      lead.recommendedAction ||
      "Send a useful, tailored response",
  );
  const [dueAt, setDueAt] = useState(defaultDue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function promote() {
    setBusy(true);
    setMessage("");
    const response = await fetch(
      "/api/portal/admin/consulting/opportunities/promote-lead",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: lead.sourceKind,
          leadKey: leadKey(lead),
          opportunityType,
          nextAction,
          nextActionDueAt: new Date(`${dueAt}T17:00:00`).toISOString(),
          primaryOfferId: offerId || null,
        }),
      },
    );
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Promotion failed.");
      return;
    }
    setMessage(
      "Added to the consulting pipeline with its source evidence intact.",
    );
    onPromoted();
    router.refresh();
  }

  if (promoted)
    return (
      <section className="mt-5 rounded-md border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
        <p className="text-sm font-medium text-emerald-200">
          Already in pipeline
        </p>
        <p className="mt-1 text-xs text-white/45">
          This discovery row remains here as the original source record.
        </p>
      </section>
    );
  return (
    <section className="mt-5 rounded-md border border-amber-300/20 bg-amber-300/[0.04] p-3">
      <h3 className="text-xs uppercase tracking-[0.16em] text-amber-200/70">
        Promote to pipeline
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/45">
          Opportunity type
          <select
            value={opportunityType}
            onChange={(e) =>
              setOpportunityType(e.target.value as OpportunityType)
            }
            className="mt-1 w-full rounded border border-white/10 bg-[#151515] p-2 text-sm text-white"
          >
            {OPPORTUNITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatCategory(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/45">
          Primary offer
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-[#151515] p-2 text-sm text-white"
          >
            {offers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-white/45 sm:col-span-2">
          Confirmed next action
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-[#151515] p-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-white/45">
          Due date
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-[#151515] p-2 text-sm text-white"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy || !nextAction.trim() || !dueAt}
        onClick={promote}
        className="mt-3 rounded bg-amber-200 px-3 py-2 text-sm font-semibold text-[#151515] disabled:opacity-50"
      >
        {busy ? "Promoting…" : "Promote to pipeline"}
      </button>
      {message ? <p className="mt-2 text-xs text-white/55">{message}</p> : null}
    </section>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-white">{value}</p>
    </div>
  );
}

function FitScore({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-white/10 px-2 py-1">
      <span>{label}</span>
      <span className="text-white/80">{value || "-"}</span>
    </div>
  );
}

type EnrichedLead = RedditLead &
  LeadState & {
    numericScore: number;
  };

function mergeLeadStates(
  localState: Record<string, LeadState>,
  databaseState: Record<string, LeadState>,
) {
  const merged = Object.fromEntries(
    Object.entries(localState).map(([key, value]) => [
      key,
      normalizeStoredState(value),
    ]),
  ) as Record<string, LeadState>;
  for (const [key, databaseValue] of Object.entries(databaseState)) {
    const localValue = merged[key];
    if (
      !localValue ||
      dateValue(databaseValue.updatedAt) >= dateValue(localValue.updatedAt)
    ) {
      merged[key] = normalizeStoredState(databaseValue);
    }
  }
  return merged;
}

function normalizeStoredState(state: LeadState): LeadState {
  return {
    ...state,
    commented: state.commented ?? state.action === "commented",
    dmSent: state.dmSent ?? state.action === "dm_sent",
    dismissed:
      state.dismissed ??
      (state.action === "dismissed" || state.queue === "dismissed"),
  };
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function progressForMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("starting")) return 8;
  if (normalized.includes("authenticating")) return 12;
  if (normalized.includes("fetching subreddit")) return 18;
  if (normalized.includes("subreddit ")) return 35;
  if (normalized.includes("fetching reddit search")) return 45;
  if (normalized.includes("search ")) return 58;
  if (normalized.includes("filtering")) return 65;
  if (normalized.includes("comment context")) return 72;
  if (normalized.includes("scoring complete")) return 92;
  if (normalized.includes("scoring ")) return 78;
  if (normalized.includes("scored ")) return 88;
  if (normalized.includes("wrote digest")) return 96;
  if (normalized.includes("publishing")) return 98;
  if (normalized.includes("published")) return 100;
  return 10;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

function formatPublishedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "at an unknown time";
  return `${parsed.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function filterOptions(
  leads: RedditLead[],
  valueForLead: (lead: RedditLead) => string,
) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const value = valueForLead(lead);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1] || formatCategory(a[0]).localeCompare(formatCategory(b[0])),
    )
    .map(([value, count]) => ({
      value,
      count,
      label: formatCategory(value),
    }));
}

function enrichLead(lead: RedditLead, state?: LeadState): EnrichedLead {
  const normalizedState = state ? normalizeStoredState(state) : undefined;
  const queue = queueForLead(lead, state);
  const commented = normalizedState?.commented ?? false;
  const dmSent = normalizedState?.dmSent ?? false;
  const dismissed = normalizedState?.dismissed ?? queue === "dismissed";
  return {
    ...lead,
    queue,
    action: actionForState({
      queue,
      action: normalizedState?.action ?? "new",
      commented,
      dmSent,
      dismissed,
    }),
    commented,
    dmSent,
    dismissed,
    notes: normalizedState?.notes ?? "",
    updatedAt: normalizedState?.updatedAt ?? "",
    numericScore: Number.parseInt(lead.score, 10) || 0,
  };
}

function queueForLead(lead: RedditLead, state?: LeadState): LeadQueue {
  const normalizedState = state ? normalizeStoredState(state) : undefined;
  if (normalizedState?.dismissed) return "dismissed";
  if (normalizedState?.queue) return normalizedState.queue;
  if (isLeadReadyToPursue(lead)) return "actionable";
  if (lead.buyerQueue === "warm_reply") return "community_reply";
  if (lead.buyerQueue === "company_signal") return "review";
  if (lead.buyerQueue === "market_intelligence") return "review";
  if (lead.buyerQueue === "reject") return "dismissed";
  if (lead.recommendedAction === "ignore") return "dismissed";
  if (lead.recommendedAction === "watch") return "review";
  if (lead.recommendedAction === "comment") return "review";
  return "review";
}

function stageForLead(lead: EnrichedLead): Exclude<BoardStage, "all"> {
  if (lead.dismissed || lead.queue === "dismissed") return "closed";
  if (
    lead.commented ||
    lead.dmSent ||
    lead.queue === "commented" ||
    lead.queue === "dm_sent" ||
    lead.action === "converted"
  ) {
    return "pursued";
  }
  if (lead.queue === "review") return "review";
  if (lead.queue === "community_reply") return "review";
  return "ready";
}

function leadMatchesStage(lead: EnrichedLead, stage: BoardStage) {
  return stage === "all" || stageForLead(lead) === stage;
}

function statePatchForStage(
  stage: Exclude<BoardStage, "all">,
): Partial<LeadState> {
  if (stage === "ready") {
    return {
      queue: "actionable",
      action: "new",
      commented: false,
      dmSent: false,
      dismissed: false,
    };
  }
  if (stage === "review") {
    return {
      queue: "review",
      action: "new",
      commented: false,
      dmSent: false,
      dismissed: false,
    };
  }
  if (stage === "pursued") {
    // dm_sent remains the backward-compatible persisted flag. The board now
    // presents the channel-neutral concept and derives the actual pursuit path.
    return {
      queue: "dm_sent",
      action: "dm_sent",
      dmSent: true,
      dismissed: false,
    };
  }
  return {
    queue: "dismissed",
    action: "dismissed",
    dismissed: true,
  };
}

function actionForState(
  state: Pick<
    LeadState,
    "queue" | "action" | "commented" | "dmSent" | "dismissed"
  >,
): LeadAction {
  if (state.dismissed || state.queue === "dismissed") return "dismissed";
  if (state.dmSent) return "dm_sent";
  if (state.commented) return "commented";
  if (state.action === "converted" || state.action === "opened")
    return state.action;
  return "new";
}

function sortRows(a: EnrichedLead, b: EnrichedLead, sortBy: SortField) {
  if (sortBy === "priority")
    return leadPriority(b) - leadPriority(a) || a.title.localeCompare(b.title);
  if (sortBy === "score")
    return b.numericScore - a.numericScore || a.title.localeCompare(b.title);
  if (sortBy === "posted")
    return (
      dateSortKey(b.postedDate) - dateSortKey(a.postedDate) ||
      b.numericScore - a.numericScore
    );
  if (sortBy === "source") return a.sourceLabel.localeCompare(b.sourceLabel);
  if (sortBy === "status")
    return stageForLead(a).localeCompare(stageForLead(b));
  return a.title.localeCompare(b.title);
}

function leadPriority(lead: EnrichedLead) {
  const stageWeight = {
    ready: 400,
    review: 300,
    pursued: 100,
    closed: 0,
  }[stageForLead(lead)];
  const directBuyerWeight =
    lead.leadType === "direct_client" || lead.buyerQueue === "active_lead"
      ? 35
      : 0;
  const explicitContractWeight =
    /\b(contract|consult|freelance|fractional|temporary|rfp|paid)\b/i.test(
      [
        lead.engagementModel,
        lead.reason,
        lead.evidenceSummary,
        lead.askQuote,
      ].join(" "),
    )
      ? 20
      : 0;
  return (
    stageWeight +
    directBuyerWeight +
    explicitContractWeight +
    lead.numericScore * 5 +
    Math.floor(dateSortKey(lead.postedDate) / 86_400_000_000)
  );
}

function dedupeLeadRows(leads: EnrichedLead[]) {
  const byLead = new Map<string, EnrichedLead>();
  for (const lead of leads) {
    const key = normalizeLeadUrl(lead.url) || lead.title.toLowerCase();
    const existing = byLead.get(key);
    if (
      !existing ||
      (lead.sourceKind === "automation" && existing.sourceKind !== "automation")
    ) {
      byLead.set(key, lead);
    }
  }
  return [...byLead.values()];
}

function normalizeLeadUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
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

function engagementLabel(lead: RedditLead) {
  if (lead.engagementModel) return formatCategory(lead.engagementModel);
  if (lead.leadType === "direct_client") return "Client project";
  if (lead.leadType === "job_board") return "Role";
  if (lead.leadType === "partner_overflow") return "Partner work";
  if (lead.leadType === "watch") return "Warm signal";
  return formatLeadType(lead);
}

function pursuitMethod(lead: RedditLead) {
  const path = [
    lead.responsePath,
    lead.freeToPursuePath,
    lead.recommendedAction,
    lead.sourceLabel,
  ].join(" ");
  if (/\b(email|e-mail|mailto)\b/i.test(path)) return "Email";
  if (/\b(apply|application|career|job page|job board)\b/i.test(path))
    return "Apply";
  if (/\b(contact form|website contact)\b/i.test(path)) return "Contact form";
  if (/\b(comment|reply|community)\b/i.test(path)) return "Community reply";
  if (/\b(dm|direct message|message)\b/i.test(path)) return "Direct message";
  if (lead.leadType === "job_board") return "Apply";
  if (lead.sourceKind === "reddit") return "Community reply";
  return "Open source";
}

function formatStatusCounts(counts?: Record<string, number>) {
  const entries = Object.entries(counts ?? {});
  if (!entries.length) return "none";
  return entries
    .map(([key, value]) => `${formatCategory(key)} ${value}`)
    .join(", ");
}

function decisionNote(current: string, marker: string) {
  const stamp = new Date().toISOString();
  const line = `[reddit-v2-feedback ${stamp}] ${marker}`;
  return [line, current].filter(Boolean).join("\n");
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
      "buyer_situation",
      "buyer_queue",
      "offer_match",
      "source_family",
      "vertical",
      "failure_mode",
      "commercial_fit_score",
      "freshness_score",
      "confidence_score",
      "evidence_summary",
      "ownership_quote",
      "ask_quote",
      "reply_angle",
      "why_now",
      "speaker",
      "intent",
      "consulting_fit",
      "rejection_reason",
      "source_quote_or_snippet",
      "evidence_url",
      "missing_evidence",
      "next_step",
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
      lead.buyerSituation,
      lead.buyerQueue,
      lead.offerMatch,
      lead.sourceFamily,
      lead.vertical,
      lead.failureMode,
      lead.commercialFitScore,
      lead.freshnessScore,
      lead.confidenceScore,
      lead.evidenceSummary,
      lead.ownershipQuote ?? "",
      lead.askQuote ?? "",
      lead.replyAngle ?? "",
      lead.whyNow ?? "",
      lead.speaker ?? "",
      lead.intent ?? "",
      lead.consultingFit ?? "",
      lead.rejectionReason ?? "",
      lead.sourceQuoteOrSnippet,
      lead.evidenceUrl,
      lead.missingEvidence,
      lead.nextStep,
      lead.commentContext,
      lead.reason,
      lead.url,
      lead.notes,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
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
