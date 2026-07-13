"use client";

import { useMemo, useState, useTransition } from "react";
import { addMinaJob, setMinaJobState } from "./actions";
import type {
  MinaJob,
  MinaJobsData,
  MinaJobState,
  MinaJobStatus,
  MinaRoleFamily,
  MinaWorkModel,
} from "@/lib/portal/mina/jobs";

type View = "today" | "all" | "applications";
type Sort = "best" | "newest" | "salary";

const STATUS_LABELS: Record<MinaJobStatus, string> = {
  new: "New",
  saved: "Saved",
  preparing: "Preparing",
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
  const [view, setView] = useState<View>("today");
  const [selectedId, setSelectedId] = useState(initialData.jobs[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<MinaRoleFamily | "all">("all");
  const [workModel, setWorkModel] = useState<MinaWorkModel | "all">("all");
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("best");
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeJobs = useMemo(() => jobs.filter((job) => job.active), [jobs]);
  const pipelineCount = useMemo(
    () => jobs.filter((job) => ACTIVE_APPLICATION_STATUSES.includes(job.state.status)).length,
    [jobs],
  );
  const todayCount = useMemo(
    () =>
      activeJobs.filter(
        (job) => job.state.status === "new" && job.matchScore >= 60,
      ).length,
    [activeJobs],
  );

  const visibleJobs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return activeJobs
      .filter((job) => {
        if (view === "today") return job.state.status === "new" && job.matchScore >= 60;
        if (view === "applications")
          return ACTIVE_APPLICATION_STATUSES.includes(job.state.status);
        return !["rejected", "expired"].includes(job.state.status);
      })
      .filter((job) => role === "all" || job.roleFamily === role)
      .filter((job) => workModel === "all" || job.workModel === workModel)
      .filter(
        (job) =>
          !salaryOnly ||
          (job.salaryCurrency === initialData.profile.salaryCurrency &&
            job.salaryMinCents !== null &&
            job.salaryMinCents >= initialData.profile.targetSalaryCents),
      )
      .filter((job) => {
        if (!needle) return true;
        return [job.title, job.company, job.location, job.description]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => sortJobs(a, b, sort));
  }, [
    activeJobs,
    initialData.profile.salaryCurrency,
    initialData.profile.targetSalaryCents,
    role,
    salaryOnly,
    search,
    sort,
    view,
    workModel,
  ]);

  const selectedJob =
    visibleJobs.find((job) => job.id === selectedId) ?? visibleJobs[0] ?? null;
  const topJobs = view === "today" ? visibleJobs.slice(0, 5) : visibleJobs;

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

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <section className="border-b border-[#d7d9d2] pb-8">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-[#66756b] uppercase">
              Your search, without the noise
            </p>
            <h1 className="font-display text-4xl leading-tight text-[#263a30] sm:text-5xl">
              {todayCount > 0
                ? `${todayCount} promising ${todayCount === 1 ? "role" : "roles"} to look at`
                : "Nothing urgent. That’s useful too."}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#5f655e]">
              Ranked for HR leadership scope, your CAD {formatWholeDollars(initialData.profile.targetSalaryCents)} target,
              location, and freshness. Every match shows what is known and what still needs checking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm((current) => !current)}
              className="rounded-md border border-[#aeb5ab] bg-white px-4 py-2.5 text-sm font-medium text-[#34463b] transition hover:border-[#7f8c82] hover:bg-[#f4f6f2]"
            >
              Save a job you found
            </button>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-2" aria-label="Search summary">
          <SummaryPill label="New matches" value={todayCount} />
          <SummaryPill label="In progress" value={pipelineCount} />
          <SummaryPill
            label="Sources checked"
            value={initialData.sourceHealth.filter((source) => source.ok).length}
          />
        </div>
      </section>

      {showAddForm ? (
        <ManualJobForm
          onCancel={() => setShowAddForm(false)}
          onAdded={(job) => {
            setJobs((current) => [job, ...current.filter((item) => item.id !== job.id)]);
            setSelectedId(job.id);
            setView("applications");
            setShowAddForm(false);
            setNotice("Saved. It is now in your application list.");
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
          <div className="flex gap-1 rounded-md bg-[#e9ebe5] p-1" role="tablist" aria-label="Job views">
            <ViewButton active={view === "today"} count={todayCount} onClick={() => setView("today")}>
              Today
            </ViewButton>
            <ViewButton active={view === "all"} count={activeJobs.length} onClick={() => setView("all")}>
              Find jobs
            </ViewButton>
            <ViewButton active={view === "applications"} count={pipelineCount} onClick={() => setView("applications")}>
              Applications
            </ViewButton>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company or title"
              aria-label="Search jobs"
              className="min-w-52 rounded-md border border-[#cfd3cc] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#92978f] focus:border-[#637c6b] focus:ring-2 focus:ring-[#637c6b]/15"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as MinaRoleFamily | "all")}
              aria-label="Filter by role"
              className="rounded-md border border-[#cfd3cc] bg-white px-3 py-2 text-sm text-[#50574f]"
            >
              <option value="all">All target roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={workModel}
              onChange={(event) => setWorkModel(event.target.value as MinaWorkModel | "all")}
              aria-label="Filter by work model"
              className="rounded-md border border-[#cfd3cc] bg-white px-3 py-2 text-sm text-[#50574f]"
            >
              <option value="all">Any work model</option>
              {Object.entries(WORK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              aria-label="Sort jobs"
              className="rounded-md border border-[#cfd3cc] bg-white px-3 py-2 text-sm text-[#50574f]"
            >
              <option value="best">Best opportunity</option>
              <option value="newest">Newest</option>
              <option value="salary">Highest salary</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#cfd3cc] bg-white px-3 py-2 text-sm text-[#50574f]">
              <input
                type="checkbox"
                checked={salaryOnly}
                onChange={(event) => setSalaryOnly(event.target.checked)}
                className="accent-[#395744]"
              />
              {`Meets $${formatWholeDollars(initialData.profile.targetSalaryCents)} target`}
            </label>
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
            <div className="divide-y divide-[#dfe1dc] border-y border-[#d6d9d2]">
              {topJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  active={selectedJob?.id === job.id}
                  targetSalaryCents={initialData.profile.targetSalaryCents}
                  onSelect={() => setSelectedId(job.id)}
                />
              ))}
            </div>
            {selectedJob ? (
              <JobDetail
                key={selectedJob.id}
                job={selectedJob}
                targetSalaryCents={initialData.profile.targetSalaryCents}
                pending={isPending}
                onUpdate={(patch, message) => updateState(selectedJob, patch, message)}
              />
            ) : null}
          </div>
        ) : (
          <EmptyState view={view} hasJobs={activeJobs.length > 0} onAdd={() => setShowAddForm(true)} />
        )}
      </section>

      <section className="mt-12 border-t border-[#d7d9d2] pt-6 text-sm text-[#6b716a]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p>
            {sourceSummary(initialData)}
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
      className={`w-full px-4 py-5 text-left transition sm:px-5 ${
        active ? "bg-[#eef2ec] shadow-[inset_3px_0_0_#476151]" : "hover:bg-white/70"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-[#718075] uppercase">{job.company}</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-[#28342c]">{job.title}</h2>
        </div>
        <span className="shrink-0 rounded-full border border-[#c4cec5] bg-white px-2.5 py-1 text-xs font-semibold text-[#395744]">
          {job.matchScore}
        </span>
      </div>
      <p className="mt-3 text-sm text-[#666c65]">{job.location} · {WORK_LABELS[job.workModel]}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className={clearsTarget ? "font-semibold text-[#326044]" : "text-[#4f554f]"}>{pay}</span>
        <span className="text-[#858a83]">{ageLabel(job.postedAt || job.firstSeenAt)}</span>
        {job.state.status !== "new" ? (
          <span className="font-medium text-[#6d6040]">{STATUS_LABELS[job.state.status]}</span>
        ) : null}
      </div>
    </button>
  );
}

function JobDetail({
  job,
  targetSalaryCents,
  pending,
  onUpdate,
}: {
  job: MinaJob;
  targetSalaryCents: number;
  pending: boolean;
  onUpdate: (patch: Partial<MinaJobState>, message: string) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [notes, setNotes] = useState(job.state.notes);
  const payClearsTarget =
    job.salaryCurrency === "CAD" &&
    job.salaryMinCents !== null &&
    job.salaryMinCents >= targetSalaryCents;

  return (
    <article className="self-start rounded-md border border-[#d5d9d2] bg-white p-5 shadow-[0_14px_40px_rgba(39,50,43,0.06)] sm:p-7 lg:sticky lg:top-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-[#647267]">{job.company}</p>
          <h2 className="mt-1 font-display text-3xl leading-tight text-[#263a30]">{job.title}</h2>
          <p className="mt-2 text-sm text-[#697069]">{job.location} · {WORK_LABELS[job.workModel]}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-2xl font-semibold text-[#344c3c]">{job.matchScore}/100</p>
          <p className="text-xs text-[#848a82]">opportunity score</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 border-y border-[#e1e3de] py-5 sm:grid-cols-3">
        <DetailFact label="Compensation" value={salaryLabel(job)} strong={payClearsTarget} />
        <DetailFact label="Role family" value={ROLE_LABELS[job.roleFamily]} />
        <DetailFact label="Posted" value={dateLabel(job.postedAt || job.firstSeenAt)} />
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

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={job.applyUrl || job.canonicalUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            if (job.state.status === "new")
              onUpdate({ status: "preparing", nextAction: "Review and submit application" }, "Moved to Preparing.");
          }}
          className="rounded-md bg-[#304d3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263f2f]"
        >
          Review and apply
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onUpdate(
              { status: "saved", favourite: true, nextAction: "Prepare application" },
              "Saved for application prep.",
            )
          }
          className="rounded-md border border-[#b8c0b9] px-4 py-2.5 text-sm font-medium text-[#35473b] transition hover:bg-[#f1f5f0] disabled:opacity-50"
        >
          Save
        </button>
        {job.state.status !== "applied" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              onUpdate(
                { status: "applied", appliedAt: new Date().toISOString(), nextAction: "Follow up in 5 business days" },
                "Marked applied. Nice work.",
              )
            }
            className="rounded-md border border-[#b8c0b9] px-4 py-2.5 text-sm font-medium text-[#35473b] transition hover:bg-[#f1f5f0] disabled:opacity-50"
          >
            Mark applied
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowReject((current) => !current)}
          className="px-2 py-2.5 text-sm text-[#777c76] underline decoration-[#c3c7c1] underline-offset-4 hover:text-[#4e554f]"
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
          <label htmlFor={`notes-${job.id}`} className="text-sm font-semibold text-[#3d4740]">Private notes</label>
          <textarea
            id={`notes-${job.id}`}
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

function EmptyState({ view, hasJobs, onAdd }: { view: View; hasJobs: boolean; onAdd: () => void }) {
  const copy =
    view === "today"
      ? hasJobs
        ? "No new high-confidence matches survived today's filters. Try Find jobs for the wider list."
        : "No jobs have arrived yet. Save one you found or run the first source scan."
      : view === "applications"
        ? "Nothing is in progress yet. Save a promising job when you are ready."
        : "No current jobs match these filters.";
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

function ViewButton({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded px-3 py-2 text-sm font-medium transition ${active ? "bg-white text-[#304538] shadow-sm" : "text-[#697069] hover:text-[#354239]"}`}
    >
      {children} <span className="ml-1 text-xs text-[#8a9189]">{count}</span>
    </button>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-[#d5d8d2] bg-[#fbfbf8] px-3.5 py-1.5 text-sm text-[#626a63]">
      <span className="font-semibold text-[#32453a]">{value}</span> {label.toLowerCase()}
    </div>
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
  if (sort === "newest") return timestamp(b.postedAt || b.firstSeenAt) - timestamp(a.postedAt || a.firstSeenAt);
  if (sort === "salary") {
    if (a.salaryCurrency !== b.salaryCurrency) {
      if (a.salaryCurrency === "CAD") return -1;
      if (b.salaryCurrency === "CAD") return 1;
    }
    return (b.salaryMaxCents ?? b.salaryMinCents ?? 0) - (a.salaryMaxCents ?? a.salaryMinCents ?? 0);
  }
  return b.matchScore - a.matchScore || timestamp(b.postedAt || b.firstSeenAt) - timestamp(a.postedAt || a.firstSeenAt);
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

function plainDescription(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
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
  return `Sources last checked ${ageLabel(latest.lastRunAt).toLowerCase()}. ${data.jobs.filter((job) => job.active).length} current jobs in the private list.`;
}
