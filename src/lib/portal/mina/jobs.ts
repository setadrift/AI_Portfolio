import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MINA_JOB_STATUSES = [
  "new",
  "saved",
  "preparing",
  "applied",
  "recruiter_screen",
  "interview",
  "offer",
  "rejected",
  "expired",
] as const;

export type MinaJobStatus = (typeof MINA_JOB_STATUSES)[number];
const RETAINED_MINA_JOB_STATUSES: MinaJobStatus[] = [
  "saved",
  "preparing",
  "applied",
  "recruiter_screen",
  "interview",
  "offer",
];
export type MinaWorkModel = "remote" | "hybrid" | "on_site" | "unknown";
export type MinaFreshnessBucket = "hot" | "fresh" | "recent" | "aging" | "archive" | "unknown";
export type MinaQualityTier = "priority" | "strong" | "watch" | "archive";
export type MinaRoleFamily =
  | "hr_business_partner"
  | "recruiting_manager"
  | "hr_manager"
  | "people_operations"
  | "other";

export interface MinaJobState {
  status: MinaJobStatus;
  favourite: boolean;
  rejectionReason: string;
  notes: string;
  nextAction: string;
  nextActionAt: string;
  appliedAt: string;
  resumeVariant: string;
}

export interface MinaJob {
  id: string;
  source: string;
  sourceJobId: string;
  canonicalUrl: string;
  applyUrl: string;
  title: string;
  company: string;
  location: string;
  workModel: MinaWorkModel;
  employmentType: string;
  description: string;
  roleFamily: MinaRoleFamily;
  companySize: string;
  postedAt: string;
  sourcePostedAt: string;
  lastVerifiedAt: string;
  canonicalStatus: "open" | "closed" | "unverified" | "error";
  freshnessBucket: MinaFreshnessBucket;
  freshnessConfidence: "high" | "medium" | "low";
  qualityTier: MinaQualityTier;
  closesAt: string;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  salaryCurrency: string;
  salaryPeriod: "year" | "hour" | "unknown";
  salaryIsEstimated: boolean;
  matchScore: number;
  fitReasons: string[];
  flags: string[];
  requirements: string[];
  active: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  state: MinaJobState;
}

export interface MinaSearchProfile {
  name: string;
  targetSalaryCents: number;
  salaryCurrency: string;
  salaryIsHardFloor: boolean;
  targetRoles: string[];
  titleAliases: string[];
  locations: string[];
  workModels: MinaWorkModel[];
  preferredIndustries: string[];
  excludedIndustries: string[];
  targetEmployers: string[];
  excludedEmployers: string[];
  profileComplete: boolean;
}

export interface MinaSourceHealth {
  source: string;
  lastRunAt: string;
  ok: boolean;
  fetchedCount: number;
  matchedCount: number;
  error: string;
}

export interface MinaJobsData {
  configured: boolean;
  jobs: MinaJob[];
  profile: MinaSearchProfile;
  sourceHealth: MinaSourceHealth[];
}

export interface ManualMinaJobInput {
  url: string;
  title: string;
  company: string;
  location?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  workModel?: MinaWorkModel;
  notes?: string;
}

export function isMinaJobCurrent(job: MinaJob) {
  return !["rejected", "expired"].includes(job.state.status) &&
    (job.active || RETAINED_MINA_JOB_STATUSES.includes(job.state.status));
}

export type MinaMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

let cachedClient: SupabaseClient | null = null;

function adminClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";
  if (!process.env.SUPABASE_URL || !key) return null;
  cachedClient ??= createClient(process.env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function readMinaJobsData(): Promise<MinaJobsData> {
  const db = adminClient();
  if (!db) return emptyData(false);

  const [jobsResult, statesResult, profileResult, runsResult] = await Promise.all([
    db
      .from("mina_jobs")
      .select("*")
      .order("match_score", { ascending: false })
      .order("posted_at", { ascending: false, nullsFirst: false }),
    db.from("mina_job_states").select("*"),
    db.from("mina_search_profiles").select("*").eq("id", "mina").maybeSingle(),
    db
      .from("mina_source_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  const results = [jobsResult, statesResult, profileResult, runsResult];
  const schemaMissing = results.some(
    (result) => result.error?.code === "42P01" || result.error?.code === "PGRST205",
  );
  if (schemaMissing) return emptyData(false);
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(`Failed to read Mina jobs: ${error.message}`);

  const states = new Map(
    (statesResult.data ?? []).map((row) => [String(row.job_id), mapState(row)]),
  );

  return {
    configured: true,
    jobs: (jobsResult.data ?? []).map((row) =>
      mapJob(row, states.get(String(row.id)) ?? emptyState()),
    ),
    profile: profileResult.data ? mapProfile(profileResult.data) : defaultProfile(),
    sourceHealth: latestSourceRuns(runsResult.data ?? []),
  };
}

export async function createManualMinaJob(
  input: ManualMinaJobInput,
): Promise<MinaMutationResult<MinaJob>> {
  const db = adminClient();
  if (!db) return notConfigured();

  const title = cleanText(input.title);
  const company = cleanText(input.company);
  const location = cleanText(input.location ?? "");
  const canonicalUrl = validHttpUrl(input.url);
  if (!title || !company || !canonicalUrl) {
    return {
      ok: false,
      error: "Add a valid job URL, title, and company.",
      status: 400,
    };
  }

  const roleFamily = classifyRole(title);
  const salaryMinCents = dollarsToCents(input.salaryMin);
  const salaryMaxCents = dollarsToCents(input.salaryMax);
  const reasons = ["Saved directly by Mina"];
  if (salaryMinCents && salaryMinCents >= 11_000_000) {
    reasons.push("Posted salary floor meets the CAD 110k target");
  } else if (salaryMinCents && salaryMinCents >= 10_700_000) {
    reasons.push("Posted salary is within Mina's acceptable range");
  }
  if (roleFamily !== "other") reasons.push("Matches a target role family");

  const row = {
    source: "manual",
    source_job_id: null,
    canonical_url: canonicalUrl,
    apply_url: canonicalUrl,
    job_fingerprint: fingerprint(company, title, location),
    title,
    company,
    location,
    work_model: input.workModel ?? "unknown",
    role_family: roleFamily,
    salary_min_cents: salaryMinCents,
    salary_max_cents: salaryMaxCents,
    salary_currency: "CAD",
    salary_period: "year",
    salary_is_estimated: false,
    match_score: manualScore(roleFamily, salaryMinCents),
    fit_reasons: reasons,
    flags: salaryMinCents
      ? salaryMinCents < 10_700_000
        ? ["Posted salary appears below CAD 107k"]
        : []
      : ["Salary not posted"],
    source_evidence: { capturedBy: "mina", capturedAt: new Date().toISOString() },
    canonical_status: "unverified",
    freshness_bucket: "unknown",
    freshness_confidence: "low",
    quality_tier: "watch",
    active: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("mina_jobs")
    .upsert(row, { onConflict: "job_fingerprint" })
    .select("*")
    .single();
  if (error) return databaseError(error.message);

  const state = {
    status: "saved" as const,
    favourite: true,
    notes: cleanText(input.notes ?? ""),
  };
  const { error: stateError } = await db
    .from("mina_job_states")
    .upsert({
      job_id: data.id,
      status: state.status,
      favourite: state.favourite,
      notes: state.notes,
      updated_at: new Date().toISOString(),
    });
  if (stateError) return databaseError(stateError.message);

  return {
    ok: true,
    data: mapJob(data, { ...emptyState(), ...state }),
  };
}

export async function updateMinaJobState(
  jobId: string,
  patch: Partial<MinaJobState>,
): Promise<MinaMutationResult<MinaJobState>> {
  const db = adminClient();
  if (!db) return notConfigured();
  if (!jobId) return { ok: false, error: "Missing job id.", status: 400 };
  if (patch.status && !MINA_JOB_STATUSES.includes(patch.status)) {
    return { ok: false, error: "Invalid job status.", status: 400 };
  }

  const row: Record<string, unknown> = {
    job_id: jobId,
    updated_at: new Date().toISOString(),
  };
  if (patch.status) row.status = patch.status;
  if (typeof patch.favourite === "boolean") row.favourite = patch.favourite;
  if (patch.rejectionReason !== undefined)
    row.rejection_reason = cleanText(patch.rejectionReason);
  if (patch.notes !== undefined) row.notes = cleanText(patch.notes);
  if (patch.nextAction !== undefined) row.next_action = cleanText(patch.nextAction);
  if (patch.nextActionAt !== undefined) row.next_action_at = patch.nextActionAt || null;
  if (patch.appliedAt !== undefined) row.applied_at = patch.appliedAt || null;
  if (patch.resumeVariant !== undefined)
    row.resume_variant = cleanText(patch.resumeVariant);

  const { data, error } = await db
    .from("mina_job_states")
    .upsert(row)
    .select("*")
    .single();
  if (error) return databaseError(error.message);
  return { ok: true, data: mapState(data) };
}

function mapJob(row: Record<string, unknown>, state: MinaJobState): MinaJob {
  return {
    id: String(row.id),
    source: String(row.source ?? "unknown"),
    sourceJobId: String(row.source_job_id ?? ""),
    canonicalUrl: String(row.canonical_url ?? ""),
    applyUrl: String(row.apply_url ?? row.canonical_url ?? ""),
    title: String(row.title ?? "Untitled role"),
    company: String(row.company ?? "Unknown company"),
    location: String(row.location ?? "Location not listed"),
    workModel: asWorkModel(row.work_model),
    employmentType: String(row.employment_type ?? ""),
    description: String(row.description ?? ""),
    roleFamily: asRoleFamily(row.role_family),
    companySize: String(row.company_size ?? ""),
    postedAt: String(row.posted_at ?? ""),
    sourcePostedAt: String(row.source_posted_at ?? row.posted_at ?? ""),
    lastVerifiedAt: String(row.last_verified_at ?? ""),
    canonicalStatus: asCanonicalStatus(row.canonical_status),
    freshnessBucket: asFreshnessBucket(row.freshness_bucket, row.source_posted_at ?? row.posted_at),
    freshnessConfidence: asFreshnessConfidence(row.freshness_confidence),
    qualityTier: asQualityTier(row.quality_tier),
    closesAt: String(row.closes_at ?? ""),
    salaryMinCents: nullableNumber(row.salary_min_cents),
    salaryMaxCents: nullableNumber(row.salary_max_cents),
    salaryCurrency: String(row.salary_currency ?? "CAD"),
    salaryPeriod: asSalaryPeriod(row.salary_period),
    salaryIsEstimated: Boolean(row.salary_is_estimated),
    matchScore: Number(row.match_score ?? 0),
    fitReasons: stringArray(row.fit_reasons),
    flags: stringArray(row.flags),
    requirements: stringArray(row.requirements),
    active: Boolean(row.active),
    firstSeenAt: String(row.first_seen_at ?? ""),
    lastSeenAt: String(row.last_seen_at ?? ""),
    state,
  };
}

function mapState(row: Record<string, unknown>): MinaJobState {
  return {
    status: MINA_JOB_STATUSES.includes(row.status as MinaJobStatus)
      ? (row.status as MinaJobStatus)
      : "new",
    favourite: Boolean(row.favourite),
    rejectionReason: String(row.rejection_reason ?? ""),
    notes: String(row.notes ?? ""),
    nextAction: String(row.next_action ?? ""),
    nextActionAt: String(row.next_action_at ?? ""),
    appliedAt: String(row.applied_at ?? ""),
    resumeVariant: String(row.resume_variant ?? ""),
  };
}

function mapProfile(row: Record<string, unknown>): MinaSearchProfile {
  return {
    name: String(row.name ?? "Mina"),
    targetSalaryCents: Number(row.target_salary_cents ?? 11_000_000),
    salaryCurrency: String(row.salary_currency ?? "CAD"),
    salaryIsHardFloor: Boolean(row.salary_is_hard_floor),
    targetRoles: stringArray(row.target_roles),
    titleAliases: stringArray(row.title_aliases),
    locations: stringArray(row.locations),
    workModels: stringArray(row.work_models).map(asWorkModel),
    preferredIndustries: stringArray(row.preferred_industries),
    excludedIndustries: stringArray(row.excluded_industries),
    targetEmployers: stringArray(row.target_employers),
    excludedEmployers: stringArray(row.excluded_employers),
    profileComplete: Boolean(row.profile_complete),
  };
}

function latestSourceRuns(rows: Record<string, unknown>[]): MinaSourceHealth[] {
  const seen = new Set<string>();
  const result: MinaSourceHealth[] = [];
  for (const row of rows) {
    const source = String(row.source ?? "unknown");
    if (seen.has(source)) continue;
    seen.add(source);
    result.push({
      source,
      lastRunAt: String(row.finished_at ?? row.started_at ?? ""),
      ok: Boolean(row.ok),
      fetchedCount: Number(row.fetched_count ?? 0),
      matchedCount: Number(row.matched_count ?? 0),
      error: String(row.error ?? ""),
    });
  }
  return result;
}

function defaultProfile(): MinaSearchProfile {
  return {
    name: "Mina",
    targetSalaryCents: 11_000_000,
    salaryCurrency: "CAD",
    salaryIsHardFloor: false,
    targetRoles: [
      "HR Business Partner",
      "Recruiting Manager",
      "HR Manager",
      "Global Talent Acquisition Manager",
      "International Recruitment & HR Manager",
    ],
    titleAliases: [
      "Senior HR Business Partner",
      "People Partner",
      "People Operations Manager",
      "Talent Acquisition Manager",
      "Recruitment Manager",
      "People & Culture Manager",
      "Global Talent Acquisition Lead",
      "International Recruitment Manager",
      "Global Recruiting Manager",
      "Gestionnaire, acquisition de talents",
      "Partenaire d'affaires, ressources humaines",
      "Gestionnaire des ressources humaines",
    ],
    locations: ["Montréal Island", "Remote Canada"],
    workModels: ["remote", "hybrid", "on_site"],
    preferredIndustries: [
      "Fashion",
      "Cosmetics and beauty",
      "Athletic wear and sportswear",
      "Consumer brands",
      "Canadian businesses",
    ],
    excludedIndustries: [],
    targetEmployers: [],
    excludedEmployers: [],
    profileComplete: true,
  };
}

function emptyData(configured: boolean): MinaJobsData {
  return { configured, jobs: [], profile: defaultProfile(), sourceHealth: [] };
}

function emptyState(): MinaJobState {
  return {
    status: "new",
    favourite: false,
    rejectionReason: "",
    notes: "",
    nextAction: "",
    nextActionAt: "",
    appliedAt: "",
    resumeVariant: "",
  };
}

function classifyRole(title: string): MinaRoleFamily {
  if (/recruit(ing|ment)(?:\s*(?:&|and)\s*(?:hr|human resources))? (?:manager|lead)|talent acquisition (?:manager|lead)|(?:manager|lead),?\s*(?:global\s+)?(?:talent acquisition|recruiting|recruitment)|(?:gestionnaire|responsable|chef)(?:\s+de\s+l['’])?,?\s+acquisition\s+de\s+talents|responsable\s+(?:du\s+)?recrutement/i.test(title))
    return "recruiting_manager";
  if (/hr business partner|human resources business partner|people partner|partenaire\s+d['’]affaires,?\s+(?:ressources humaines|rh)/i.test(title))
    return "hr_business_partner";
  if (/people operations|people & culture|people and culture|head of people/i.test(title))
    return "people_operations";
  if (/human resources manager|hr manager|gestionnaire\s+(?:des\s+)?ressources humaines|directeur(?:trice)?\s+(?:des\s+)?ressources humaines/i.test(title)) return "hr_manager";
  return "other";
}

function manualScore(roleFamily: MinaRoleFamily, salaryMinCents: number | null) {
  let score = roleFamily === "other" ? 45 : 68;
  if (salaryMinCents && salaryMinCents >= 11_000_000) score += 18;
  else if (salaryMinCents && salaryMinCents >= 10_700_000) score += 13;
  else if (salaryMinCents && salaryMinCents < 10_000_000) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function fingerprint(company: string, title: string, location: string) {
  return createHash("sha256")
    .update([company, title, location].join("|").toLowerCase())
    .digest("hex");
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 10_000);
}

function dollarsToCents(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 100)
    : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function asWorkModel(value: unknown): MinaWorkModel {
  return ["remote", "hybrid", "on_site"].includes(String(value))
    ? (String(value) as MinaWorkModel)
    : "unknown";
}

function asRoleFamily(value: unknown): MinaRoleFamily {
  return [
    "hr_business_partner",
    "recruiting_manager",
    "hr_manager",
    "people_operations",
  ].includes(String(value))
    ? (String(value) as MinaRoleFamily)
    : "other";
}

function asSalaryPeriod(value: unknown): "year" | "hour" | "unknown" {
  return ["year", "hour"].includes(String(value))
    ? (String(value) as "year" | "hour")
    : "unknown";
}

function asCanonicalStatus(value: unknown): "open" | "closed" | "unverified" | "error" {
  return ["open", "closed", "error"].includes(String(value))
    ? (String(value) as "open" | "closed" | "error")
    : "unverified";
}

function asFreshnessBucket(value: unknown, postedAt: unknown): MinaFreshnessBucket {
  if (["hot", "fresh", "recent", "aging", "archive"].includes(String(value))) return String(value) as MinaFreshnessBucket;
  const posted = Date.parse(String(postedAt || ""));
  if (Number.isNaN(posted)) return "unknown";
  const hours = Math.max(0, (Date.now() - posted) / 3_600_000);
  if (hours <= 24) return "hot";
  if (hours <= 72) return "fresh";
  if (hours <= 168) return "recent";
  if (hours <= 336) return "aging";
  return "archive";
}

function asFreshnessConfidence(value: unknown): "high" | "medium" | "low" {
  return ["high", "medium"].includes(String(value)) ? String(value) as "high" | "medium" : "low";
}

function asQualityTier(value: unknown): MinaQualityTier {
  return ["priority", "strong", "archive"].includes(String(value)) ? String(value) as MinaQualityTier : "watch";
}

function notConfigured<T>(): MinaMutationResult<T> {
  return {
    ok: false,
    error: "Mina's job database is not configured yet.",
    status: 503,
  };
}

function databaseError<T>(message: string): MinaMutationResult<T> {
  return { ok: false, error: `Database error: ${message}`, status: 500 };
}
