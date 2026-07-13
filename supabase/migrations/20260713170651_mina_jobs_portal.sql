create table if not exists public.mina_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_job_id text,
  canonical_url text not null,
  apply_url text,
  job_fingerprint text not null,
  title text not null,
  company text not null,
  location text,
  work_model text not null default 'unknown'
    check (work_model in ('remote', 'hybrid', 'on_site', 'unknown')),
  employment_type text,
  description text,
  role_family text not null default 'other'
    check (role_family in ('hr_business_partner', 'recruiting_manager', 'hr_manager', 'people_operations', 'other')),
  company_size text,
  posted_at timestamptz,
  closes_at timestamptz,
  salary_min_cents bigint,
  salary_max_cents bigint,
  salary_currency text not null default 'CAD',
  salary_period text not null default 'year'
    check (salary_period in ('year', 'hour', 'unknown')),
  salary_is_estimated boolean not null default false,
  match_score integer not null default 0 check (match_score between 0 and 100),
  fit_reasons jsonb not null default '[]'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  source_evidence jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_fingerprint)
);

create unique index if not exists mina_jobs_source_job_unique
  on public.mina_jobs (source, source_job_id)
  where source_job_id is not null;

create index if not exists mina_jobs_active_score_idx
  on public.mina_jobs (active, match_score desc, posted_at desc nulls last);

create index if not exists mina_jobs_role_family_idx
  on public.mina_jobs (role_family, active, posted_at desc nulls last);

create table if not exists public.mina_job_states (
  job_id uuid primary key references public.mina_jobs(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new', 'saved', 'preparing', 'applied', 'recruiter_screen', 'interview', 'offer', 'rejected', 'expired')),
  favourite boolean not null default false,
  rejection_reason text,
  notes text,
  next_action text,
  next_action_at timestamptz,
  applied_at timestamptz,
  resume_variant text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mina_job_states_status_action_idx
  on public.mina_job_states (status, next_action_at nulls last);

create table if not exists public.mina_search_profiles (
  id text primary key,
  name text not null,
  target_salary_cents bigint not null default 11000000,
  salary_currency text not null default 'CAD',
  salary_is_hard_floor boolean not null default false,
  target_roles jsonb not null default '[]'::jsonb,
  title_aliases jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  work_models jsonb not null default '[]'::jsonb,
  preferred_industries jsonb not null default '[]'::jsonb,
  excluded_industries jsonb not null default '[]'::jsonb,
  target_employers jsonb not null default '[]'::jsonb,
  excluded_employers jsonb not null default '[]'::jsonb,
  profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.mina_search_profiles (
  id,
  name,
  target_salary_cents,
  salary_currency,
  salary_is_hard_floor,
  target_roles,
  title_aliases,
  locations,
  work_models,
  profile_complete
)
values (
  'mina',
  'Mina',
  11000000,
  'CAD',
  false,
  '["HR Business Partner", "Recruiting Manager", "HR Manager"]'::jsonb,
  '["Senior HR Business Partner", "People Partner", "People Operations Manager", "Talent Acquisition Manager", "Recruitment Manager", "People & Culture Manager"]'::jsonb,
  '["Montréal Island", "Remote Canada"]'::jsonb,
  '["remote", "hybrid", "on_site"]'::jsonb,
  true
)
on conflict (id) do nothing;

create table if not exists public.mina_profile_evidence (
  id text primary key,
  category text not null,
  label text not null,
  detail text not null,
  keywords jsonb not null default '[]'::jsonb,
  strength integer not null default 3 check (strength between 1 and 5),
  source_ref text not null default 'Mina CV - July 2026',
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.mina_profile_evidence (id, category, label, detail, keywords, strength)
values
  ('bilingual', 'language', 'Bilingual English and French', 'Fluent in English and French, with additional Persian and Turkish.', '["bilingual", "english", "french", "français"]', 5),
  ('hr-advisory', 'business_partnering', 'Leader and employee HR advisory', 'Advises leaders and employees on policies, leave, benefits, accommodations, employee lifecycle matters, and practical people solutions.', '["employee relations", "employee lifecycle", "policy", "benefits", "leave", "accommodation", "leader coaching"]', 5),
  ('complex-matters', 'employee_relations', 'Complex employee matters', 'Partners with Legal, Payroll, Benefits, and employee-relations stakeholders on sensitive matters, risk, and compliance.', '["employee relations", "investigations", "legal", "risk", "compliance", "sensitive matters"]', 5),
  ('workforce-planning', 'strategy', 'Workforce and talent strategy', 'Partnered with senior leaders on workforce planning, talent acquisition strategy, compensation, immigration considerations, and market trends.', '["workforce planning", "talent strategy", "compensation", "immigration", "organizational change"]', 5),
  ('coe-leadership', 'leadership', 'Built a national bilingual recruitment Centre of Excellence', 'Developed and implemented EY Canada''s national bilingual recruitment Centre of Excellence, standardizing processes and driving change.', '["centre of excellence", "process standardization", "change management", "recruitment leadership"]', 5),
  ('hr-technology', 'systems', 'HR technology transformation', 'Contributed to SuccessFactors and ServiceNow implementations and led HRIS enhancement and process-optimization work.', '["successfactors", "servicenow", "workday", "salesforce", "hris", "implementation"]', 4),
  ('staffing-growth', 'achievement', 'Grew West Island staffing activity', 'As the sole West Island staffing manager, increased weekly billable staffing hours from 150 to 800 and mentored three peers.', '["staffing", "business development", "west island", "mentoring", "growth"]', 5),
  ('recruiting-volume', 'achievement', 'High-volume recruiting delivery', 'Delivered target-based recruiting with a KPI of at least 40 placements per month and 30-plus daily phone interviews.', '["high volume", "mass recruiting", "kpi", "talent acquisition"]', 4),
  ('education', 'education', 'McGill HR Management graduate diploma', 'Completed a Human Resources Management graduate diploma at McGill University.', '["human resources management", "mcgill", "graduate diploma"]', 4),
  ('quebec-context', 'compliance', 'Québec employment context', 'Applies employment legislation and has experience supporting compliance initiatives including Québec language requirements.', '["quebec", "québec", "bill 96", "employment legislation", "language law"]', 5)
on conflict (id) do update set
  category = excluded.category,
  label = excluded.label,
  detail = excluded.detail,
  keywords = excluded.keywords,
  strength = excluded.strength,
  updated_at = now();

create table if not exists public.mina_source_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default false,
  fetched_count integer not null default 0,
  matched_count integer not null default 0,
  upserted_count integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists mina_source_runs_source_started_idx
  on public.mina_source_runs (source, started_at desc);

alter table public.mina_jobs enable row level security;
alter table public.mina_job_states enable row level security;
alter table public.mina_search_profiles enable row level security;
alter table public.mina_profile_evidence enable row level security;
alter table public.mina_source_runs enable row level security;

revoke all on table public.mina_jobs from anon, authenticated;
revoke all on table public.mina_job_states from anon, authenticated;
revoke all on table public.mina_search_profiles from anon, authenticated;
revoke all on table public.mina_profile_evidence from anon, authenticated;
revoke all on table public.mina_source_runs from anon, authenticated;

comment on table public.mina_jobs is 'Canonical job postings for Mina portal; server-side service-role access only.';
comment on table public.mina_job_states is 'Mina review and application workflow state; server-side service-role access only.';
comment on table public.mina_search_profiles is 'Mina job-search preferences and calibration settings; server-side service-role access only.';
comment on table public.mina_profile_evidence is 'Approved CV facts used for evidence-grounded job matching; contact details are intentionally excluded.';
comment on table public.mina_source_runs is 'Job source freshness and ingestion receipts; server-side service-role access only.';
