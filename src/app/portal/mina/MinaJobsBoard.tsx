"use client";

import { useMemo, useState, useTransition } from "react";
import { addMinaJob, setMinaJobState } from "./actions";
import {
  isMinaJobCurrent,
  type MinaJob,
  type MinaJobsData,
  type MinaJobState,
  type MinaJobStatus,
  type MinaRoleFamily,
  type MinaWorkModel,
} from "@/lib/portal/mina/jobs";
import { plainDescription } from "@/lib/portal/mina/text";

type Sort = "best" | "newest" | "salary";
type ScanResponse = {
  ok?: boolean;
  data?: MinaJobsData;
  message?: string;
  error?: string;
};

const STATUS_LABELS: Record<MinaJobStatus, string> = {
  new: "New",
  saved: "Saved",
  preparing: "Saved",
  applied: "Applied",
  recruiter_screen: "Recruiter screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Not for me",
  expired: "Expired",
};

const ROLE_LABELS: Record<MinaRoleFamily, string> = {
  hr_business_partner: "HR business partner",
  recruiting_manager: "Recruiting manager",
  hr_manager: "HR manager",
  people_operations: "People operations",
  other: "Other",
};

const WORK_LABELS: Record<MinaWorkModel, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
  unknown: "Work model unclear",
};

const FRESHNESS_LABELS: Record<MinaJob["freshnessBucket"], string> = {
  hot: "Posted today",
  fresh: "Fresh",
  recent: "Recent",
  aging: "Older",
  archive: "Archived",
  unknown: "Date unverified",
};

const TIER_LABELS: Record<MinaJob["qualityTier"], string> = {
  priority: "Priority",
  strong: "Strong match",
  watch: "Worth a look",
  archive: "Archived",
};

const ACTIVE_APPLICATION_STATUSES: MinaJobStatus[] = [
  "saved",
  "preparing",
  "applied",
  "recruiter_screen",
  "interview",
  "offer",
];

export default function MinaJobsBoard({ initialData }: { initialData: MinaJobsData }) {
  const [jobs, setJobs] = useState(initialData.jobs);
  const [sourceHealth, setSourceHealth] = useState(initialData.sourceHealth);
  const [selectedId, setSelectedId] = useState(initialData.jobs[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("best");
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentJobs = useMemo(
    () => jobs.filter(isMinaJobCurrent),
    [jobs],
  );
  const savedCount = useMemo(
    () => currentJobs.filter((job) => ACTIVE_APPLICATION_STATUSES.includes(job.state.status)).length,
    [currentJobs],
  );

  const visibleJobs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return currentJobs
      .filter((job) => {
        if (!needle) return true;
        return [job.title, job.company, job.location, job.description]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => sortJobs(a, b, sort));
  }, [
    currentJobs,
    search,
    sort,
  ]);

  const selectedJob =
    visibleJobs.find((job) => job.id === selectedId) ?? visibleJobs[0] ?? null;
  const topJobs = visibleJobs;

  function updateState(job: MinaJob, patch: Partial<MinaJobState>, message: string) {
    const previousState = job.state;
    const optimisticState = { ...previousState, ...patch };
    setJobs((current) =>
      current.map((item) =>
        item.id === job.id ? { ...item, state: optimisticState } : item,
      ),
    );
    setNotice(message);
    startTransition(async () => {
      const result = await setMinaJobState(job.id, patch);
      if (!result.ok) {
        setJobs((current) =>
          current.map((item) =>
            item.id === job.id ? { ...item, state: previousState } : item,
          ),
        );
        setNotice(result.error);
      } else {
        setJobs((current) =>
          current.map((item) =>
            item.id === job.id ? { ...item, state: result.data } : item,
          ),
        );
      }
    });
  }

  async function runScan() {
    setIsScanning(true);
    setNotice("");
    try {
      const response = await fetch("/api/portal/mina/scan", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as ScanResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || "The scan could not finish.");
      }
      setJobs(payload.data.jobs);
      setSourceHealth(payload.data.sourceHealth);
      setSelectedId((current) =>
        payload.data?.jobs.some((job) => job.id === current && job.active)
          ? current
          : payload.data?.jobs.find((job) => job.active)?.id ?? "",
      );
      setNotice(payload.message || "Scan complete. Your board is up to date.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The scan could not finish. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12">
      <section className="border-b border-[#d7d9d2] pb-6 sm:pb-8">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[#66756b] uppercase">
              Your search, without the noise
            </p>
            <h1 className="font-display text-3xl leading-tight text-[#263a30] sm:text-5xl">
              {currentJobs.length > 0
                ? `${currentJobs.length} ${currentJobs.length === 1 ? "job" : "jobs"} worth reviewing`
                : "No current jobs yet"}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#5f655e]">
              Ranked for HR leadership scope, your CAD {formatWholeDollars(initialData.profile.targetSalaryCents)} target,
              location, and freshness. Every match shows what is known and what still needs checking.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2.5 sm:w-auto sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={runScan}
              disabled={isScanning || !initialData.configured}
              aria-busy={isScanning}
              className="min-h-11 rounded-md bg-[#315440] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#284735] disabled:cursor-not-allowed disabled:bg-[#8a978e]"
            >
              {isScanning ? "Checking job sources…" : "Check for new jobs"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((current) => !current)}
              className="min-h-11 rounded-md border border-[#aeb5ab] bg-white px-4 py-2.5 text-sm font-medium text-[#34463b] transition hover:border-[#7f8c82] hover:bg-[#f4f6f2]"
            >
              Save a job you found
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" aria-label="Search summary">
          <SummaryPill label="Current jobs" value={currentJobs.length} />
          <SummaryPill label="Saved & applied" value={savedCount} />
          <SummaryPill
            label="Sources checked"
            value={sourceHealth.filter((source) => source.ok).length}
          />
        </div>
      </section>

      {showAddForm ? (
        <ManualJobForm
          onCancel={() => setShowAddForm(false)}
          onAdded={(job) => {
            setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
            setSelectedId(job.id);
            setShowAddForm(false);
            setNotice("Saved to your list.");
          }}
        />
      ) : null}

      {!initialData.configured ? (
        <div className="mt-6 rounded-md border border-[#d8c99c] bg-[#fffaf0] px-5 py-4 text-sm text-[#705f2d]">
          The private job database has not been connected yet. The page is ready, but saves and status changes
          will become durable after the database migration is applied.
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-col gap-4 border-b border-[#d7d9d2] pb-5 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="font-display text-2xl text-[#304538]">Current jobs</h2>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 xl:flex xl:justify-end">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company or title"
              aria-label="Search jobs"
              className="min-w-0 rounded-md border border-[#cfd3cc] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#92978f] focus:border-[#637c6b] focus:ring-2 focus:ring-[#637c6b]/15 xl:min-w-52"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              aria-label="Sort jobs"
              className="min-w-0 rounded-md border border-[#cfd3cc] bg-white px-3 py-2.5 text-sm text-[#50574f]"
            >
              <option value="best">Best opportunity</option>
              <option value="newest">Newest</option>
              <option value="salary">Highest salary</option>
            </select>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-md border border-[#ced9cf] bg-[#f4f8f3] px-4 py-3 text-sm text-[#395744]" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="text-xs underline underline-offset-2">
              Dismiss
            </button>
          </div>
        ) : null}

        {topJobs.length > 0 ? (
          <div className="mt-5 grid gap-6 sm:mt-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
            <div className="divide-y divide-[#dfe1dc] border-y border-[#d6d9d2]">
              {topJobs.map((job) => (
                <div key={job.id}>
                  <JobRow
                    job={job}
                    active={selectedJob?.id === job.id}
                    targetSalaryCents={initialData.profile.targetSalaryCents}
                    onSelect={() => setSelectedId(job.id)}
                  />
                  {selectedJob?.id === job.id ? (
                    <div id={`mobile-job-${job.id}`} className="border-t border-[#dfe1dc] bg-white lg:hidden">
                      <JobDetail
                        job={job}
                        targetSalaryCents={initialData.profile.targetSalaryCents}
                        pending={isPending}
                        variant="mobile"
                        onUpdate={(patch, message) => updateState(job, patch, message)}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {selectedJob ? (
              <div className="hidden lg:block">
                <JobDetail
                  key={selectedJob.id}
                  job={selectedJob}
                  targetSalaryCents={initialData.profile.targetSalaryCents}
                  pending={isPending}
                  variant="desktop"
                  onUpdate={(patch, message) => updateState(selectedJob, patch, message)}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState hasJobs={currentJobs.length > 0} onAdd={() => setShowAddForm(true)} />
        )}
      </section>

      <section className="mt-12 border-t border-[#d7d9d2] pt-6 text-sm text-[#6b716a]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p>
            {sourceSummary({ ...initialData, jobs, sourceHealth })}
          </p>
          {!initialData.profile.profileComplete ? (
            <p className="font-medium text-[#806a2d]">Search profile needs Mina&apos;s resume and preferences for calibrated ranking.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function JobRow({
  job,
  active,
  targetSalaryCents,
  onSelect,
}: {
  job: MinaJob;
  active: boolean;
  targetSalaryCents: number;
  onSelect: () => void;
}) {
  const pay = salaryLabel(job);
  const clearsTarget =
    job.salaryCurrency === "CAD" &&
    job.salaryMinCents !== null &&
    job.salaryMinCents >= targetSalaryCents;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-expanded={active}
      aria-controls={`mobile-job-${job.id}`}
      className={`w-full px-3 py-4 text-left transition sm:px-5 sm:py-5 ${
        active ? "bg-[#eef2ec] shadow-[inset_3px_0_0_#476151]" : "hover:bg-white/70"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#718075] uppercase">{job.company}</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-[#28342c]">{job.title}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#c4cec5] bg-white px-2.5 py-1 text-xs font-semibold text-[#395744]" aria-label={`${job.matchScore} out of 100 opportunity score`}>
          {job.matchScore}
        </span>
      </div>
      <p className="mt-3 text-sm text-[#666c65]">{job.location} · {WORK_LABELS[job.workModel]}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className={clearsTarget ? "font-semibold text-[#326044]" : "text-[#4f554f]"}>{pay}</span>
        <span className="text-[#858a83]">{ageLabel(job.sourcePostedAt)}</span>
        {job.state.status !== "new" ? (
          <span className="font-medium text-[#6d6040]">{STATUS_LABELS[job.state.status]}</span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <JobTag tone={job.qualityTier === "priority" || job.qualityTier === "strong" ? "positive" : "neutral"}>
            {TIER_LABELS[job.qualityTier]}
          </JobTag>
          <JobTag tone={job.freshnessBucket === "hot" || job.freshnessBucket === "fresh" ? "positive" : "neutral"}>
            {FRESHNESS_LABELS[job.freshnessBucket]}
          </JobTag>
        </div>
        <span className="shrink-0 text-xs font-semibold text-[#506457] lg:hidden">
          {active ? "Details open" : "View details"}
        </span>
      </div>
    </button>
  );
}

function JobDetail({
  job,
  targetSalaryCents,
  pending,
  variant,
  onUpdate,
}: {
  job: MinaJob;
  targetSalaryCents: number;
  pending: boolean;
  variant: "mobile" | "desktop";
  onUpdate: (patch: Partial<MinaJobState>, message: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [notes, setNotes] = useState(job.state.notes);
  const payClearsTarget =
    job.salaryCurrency === "CAD" &&
    job.salaryMinCents !== null &&
    job.salaryMinCents >= targetSalaryCents;

  return (
    <article className={variant === "desktop"
      ? "self-start rounded-md border border-[#d5d9d2] bg-white p-7 shadow-[0_14px_40px_rgba(39,50,43,0.06)] lg:sticky lg:top-5"
      : "scroll-mt-20 bg-white px-3 py-5 sm:px-5"
    }>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-[#647267]">{job.company}</p>
          <h2 className={`mt-1 font-display leading-tight text-[#263a30] ${variant === "mobile" ? "text-2xl" : "text-3xl"}`}>{job.title}</h2>
          <p className="mt-2 text-sm text-[#697069]">{job.location} · {WORK_LABELS[job.workModel]}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-2xl font-semibold text-[#344c3c]">{job.matchScore}/100</p>
          <p className="text-xs text-[#848a82]">opportunity score</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <JobTag tone={job.qualityTier === "priority" || job.qualityTier === "strong" ? "positive" : "neutral"}>
          {TIER_LABELS[job.qualityTier]}
        </JobTag>
        <JobTag tone={job.freshnessBucket === "hot" || job.freshnessBucket === "fresh" ? "positive" : "neutral"}>
          {FRESHNESS_LABELS[job.freshnessBucket]}
        </JobTag>
      </div>

      <div className="mt-6 grid gap-3 border-y border-[#e1e3de] py-5 sm:grid-cols-3">
        <DetailFact label="Compensation" value={salaryLabel(job)} strong={payClearsTarget} />
        <DetailFact label="Role family" value={ROLE_LABELS[job.roleFamily]} />
        <DetailFact label="Posted" value={dateLabel(job.sourcePostedAt)} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-[#2f3932]">Why it made the list</h3>
        {job.fitReasons.length ? (
          <ul className="mt-3 space-y-2">
            {job.fitReasons.slice(0, 5).map((reason) => (
              <li key={reason} className="flex gap-2.5 text-sm leading-6 text-[#555d56]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#54705c]" />
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#6d736c]">This job was saved manually. Review the posting before applying.</p>
        )}
      </section>

      {job.flags.length ? (
        <section className="mt-5 rounded-md border border-[#e3d8bd] bg-[#fffbf2] px-4 py-3.5">
          <h3 className="text-xs font-semibold tracking-wide text-[#776535] uppercase">Worth checking</h3>
          <p className="mt-1.5 text-sm leading-6 text-[#6d6245]">{job.flags.join(" · ")}</p>
        </section>
      ) : null}

      {job.description ? (
        <details className="mt-5 border-t border-[#e1e3de] pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#455148]">Posting summary</summary>
          <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-line pr-3 text-sm leading-6 text-[#646b64]">
            {plainDescription(job.description).slice(0, 2200)}
          </p>
        </details>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a
          href={job.applyUrl || job.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          className="col-span-2 flex min-h-11 items-center justify-center rounded-md bg-[#304d3a] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#263f2f] sm:col-auto"
        >
          Open job posting
        </a>
        {["new", "saved", "preparing"].includes(job.state.status) ? (
          <button
            type="button"
            disabled={pending || job.state.status !== "new"}
            onClick={() =>
              onUpdate(
                { status: "saved", favourite: true, nextAction: "Review application requirements" },
                "Saved to your list.",
              )
            }
            className="min-h-11 rounded-md border border-[#b8c0b9] px-4 py-2.5 text-sm font-medium text-[#35473b] transition hover:bg-[#f1f5f0] disabled:cursor-default disabled:bg-[#f1f5f0] disabled:opacity-70"
          >
            {job.state.status === "new" ? "Save" : "Saved"}
          </button>
        ) : null}
        {["new", "saved", "preparing"].includes(job.state.status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              onUpdate(
                { status: "applied", appliedAt: new Date().toISOString(), nextAction: "Follow up in 5 business days" },
                "Marked applied. Nice work.",
              )
            }
            className="min-h-11 rounded-md border border-[#b8c0b9] px-4 py-2.5 text-sm font-medium text-[#35473b] transition hover:bg-[#f1f5f0] disabled:opacity-50"
          >
            Mark applied
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowReject((current) => !current)}
          className="col-span-2 min-h-11 px-2 py-2.5 text-sm text-[#777c76] underline decoration-[#c3c7c1] underline-offset-4 hover:text-[#4e554f] sm:col-auto"
        >
          Not for me
        </button>
      </div>

      {showReject ? (
        <div className="mt-4 rounded-md border border-[#deded8] bg-[#f8f8f5] p-4">
          <p className="text-sm font-medium text-[#4d554e]">What ruled it out?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Pay", "Location", "Title", "Seniority", "Industry", "Company", "Not interested"].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  onUpdate({ status: "rejected", rejectionReason: reason }, `Removed: ${reason.toLowerCase()}.`);
                  setShowReject(false);
                }}
                className="rounded-full border border-[#cfd2cc] bg-white px-3 py-1.5 text-xs text-[#5e655f] hover:border-[#9fa69f]"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {ACTIVE_APPLICATION_STATUSES.includes(job.state.status) ? (
        <div className="mt-6 border-t border-[#e1e3de] pt-5">
          <label htmlFor={`notes-${variant}-${job.id}`} className="text-sm font-semibold text-[#3d4740]">Private notes</label>
          <textarea
            id={`notes-${variant}-${job.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contact, referral, question to ask, or application detail"
            rows={3}
            className="mt-2 w-full resize-y rounded-md border border-[#d1d5cf] bg-[#fbfbf8] px-3 py-2 text-sm outline-none focus:border-[#637c6b] focus:ring-2 focus:ring-[#637c6b]/15"
          />
          <button
            type="button"
            disabled={pending || notes === job.state.notes}
            onClick={() => onUpdate({ notes }, "Notes saved.")}
            className="mt-2 text-xs font-semibold text-[#496252] underline underline-offset-3 disabled:text-[#a1a59f] disabled:no-underline"
          >
            Save notes
          </button>
        </div>
      ) : null}
    </article>
  );
}

function ManualJobForm({
  onCancel,
  onAdded,
}: {
  onCancel: () => void;
  onAdded: (job: MinaJob) => void;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await addMinaJob({
        url: String(formData.get("url") ?? ""),
        title: String(formData.get("title") ?? ""),
        company: String(formData.get("company") ?? ""),
        location: String(formData.get("location") ?? ""),
        workModel: String(formData.get("workModel") ?? "unknown") as MinaWorkModel,
        salaryMin: numberOrNull(formData.get("salaryMin")),
        salaryMax: numberOrNull(formData.get("salaryMax")),
        notes: String(formData.get("notes") ?? ""),
      });
      if (result.ok) onAdded(result.data);
      else setError(result.error);
    });
  }

  return (
    <section className="mt-6 rounded-md border border-[#cfd5ce] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="font-display text-2xl text-[#293b30]">Save a job from anywhere</h2>
          <p className="mt-1 text-sm text-[#697069]">A recruiter message, company page, or posting another source missed.</p>
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-[#737a73] underline underline-offset-3">Close</button>
      </div>
      <form action={submit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Job URL" name="url" type="url" required placeholder="https://…" className="sm:col-span-2" />
        <FormField label="Job title" name="title" required placeholder="Senior HR Business Partner" />
        <FormField label="Company" name="company" required placeholder="Company name" />
        <FormField label="Location" name="location" placeholder="Montréal or Remote Canada" />
        <label className="text-sm text-[#505851]">
          <span className="mb-1.5 block font-medium">Work model</span>
          <select name="workModel" className="w-full rounded-md border border-[#ccd1ca] bg-white px-3 py-2.5">
            <option value="unknown">Not listed</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on_site">On-site</option>
          </select>
        </label>
        <FormField label="Salary minimum (CAD)" name="salaryMin" type="number" placeholder="110000" />
        <FormField label="Salary maximum (CAD)" name="salaryMax" type="number" placeholder="145000" />
        <label className="text-sm text-[#505851] sm:col-span-2 lg:col-span-4">
          <span className="mb-1.5 block font-medium">Notes</span>
          <textarea name="notes" rows={2} placeholder="Referral, recruiter, or first impression" className="w-full rounded-md border border-[#ccd1ca] px-3 py-2.5 outline-none focus:border-[#637c6b] focus:ring-2 focus:ring-[#637c6b]/15" />
        </label>
        {error ? <p className="text-sm text-[#9a3f3f] sm:col-span-2 lg:col-span-4">{error}</p> : null}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button disabled={isPending} className="rounded-md bg-[#304d3a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {isPending ? "Saving…" : "Save to my list"}
          </button>
          <button type="button" onClick={onCancel} className="px-3 py-2.5 text-sm text-[#656d66]">Cancel</button>
        </div>
      </form>
    </section>
  );
}

function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm text-[#505851] ${className}`}>
      <span className="mb-1.5 block font-medium">{label}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="w-full rounded-md border border-[#ccd1ca] px-3 py-2.5 outline-none placeholder:text-[#9ba099] focus:border-[#637c6b] focus:ring-2 focus:ring-[#637c6b]/15" />
    </label>
  );
}

function EmptyState({ hasJobs, onAdd }: { hasJobs: boolean; onAdd: () => void }) {
  const copy = hasJobs
    ? "No current jobs match this search."
    : "No jobs have arrived yet. Save one you found or run the first source scan.";
  return (
    <div className="mt-8 border-y border-[#d7d9d2] py-16 text-center">
      <h2 className="font-display text-2xl text-[#34443a]">A quiet list is better than a bad list.</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#6d736d]">{copy}</p>
      {!hasJobs ? (
        <button type="button" onClick={onAdd} className="mt-5 rounded-md border border-[#adb6ae] bg-white px-4 py-2.5 text-sm font-medium text-[#3d5143]">
          Save the first job
        </button>
      ) : null}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#d5d8d2] bg-[#fbfbf8] px-2 py-2 text-center text-[11px] leading-tight text-[#626a63] sm:rounded-full sm:px-3.5 sm:py-1.5 sm:text-left sm:text-sm">
      <span className="block font-semibold text-[#32453a] sm:inline">{value}</span> {label.toLowerCase()}
    </div>
  );
}

function JobTag({ children, tone }: { children: React.ReactNode; tone: "positive" | "neutral" }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      tone === "positive"
        ? "border-[#bfd0c2] bg-[#f2f7f1] text-[#396048]"
        : "border-[#d4d7d1] bg-[#f8f8f5] text-[#687068]"
    }`}>
      {children}
    </span>
  );
}

function DetailFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-[#858b84] uppercase">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-semibold text-[#2f6545]" : "text-[#4f5750]"}`}>{value}</p>
    </div>
  );
}

function sortJobs(a: MinaJob, b: MinaJob, sort: Sort) {
  if (sort === "newest") return timestamp(b.sourcePostedAt) - timestamp(a.sourcePostedAt);
  if (sort === "salary") {
    if (a.salaryCurrency !== b.salaryCurrency) {
      if (a.salaryCurrency === "CAD") return -1;
      if (b.salaryCurrency === "CAD") return 1;
    }
    return (b.salaryMaxCents ?? b.salaryMinCents ?? 0) - (a.salaryMaxCents ?? a.salaryMinCents ?? 0);
  }
  return b.matchScore - a.matchScore || timestamp(b.sourcePostedAt) - timestamp(a.sourcePostedAt);
}

function salaryLabel(job: MinaJob) {
  if (job.salaryMinCents === null && job.salaryMaxCents === null) return "Salary not posted";
  const suffix = job.salaryIsEstimated ? " estimated" : "";
  if (job.salaryMinCents !== null && job.salaryMaxCents !== null) {
    return `${job.salaryCurrency} $${formatWholeDollars(job.salaryMinCents)}–$${formatWholeDollars(job.salaryMaxCents)}${suffix}`;
  }
  const value = job.salaryMinCents ?? job.salaryMaxCents ?? 0;
  return `${job.salaryCurrency} $${formatWholeDollars(value)}${job.salaryMinCents ? "+" : " max"}${suffix}`;
}

function formatWholeDollars(cents: number) {
  return Math.round(cents / 100).toLocaleString("en-CA");
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function dateLabel(value: string) {
  if (!value) return "Date not listed";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function ageLabel(value: string) {
  if (!value) return "Date not listed";
  const days = Math.max(0, Math.floor((Date.now() - timestamp(value)) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function sourceSummary(data: MinaJobsData) {
  if (!data.sourceHealth.length) return "No automated source scan has run yet. Manual saves are available now.";
  const latest = data.sourceHealth.reduce((best, source) =>
    timestamp(source.lastRunAt) > timestamp(best.lastRunAt) ? source : best,
  );
  const current = data.jobs.filter(isMinaJobCurrent).length;
  return `Sources last checked ${ageLabel(latest.lastRunAt).toLowerCase()}. ${current} current jobs in the private list.`;
}
