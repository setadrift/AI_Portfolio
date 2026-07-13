alter table public.mina_jobs
  add column if not exists source_posted_at timestamptz,
  add column if not exists source_updated_at timestamptz,
  add column if not exists last_verified_at timestamptz,
  add column if not exists canonical_status text not null default 'unverified'
    check (canonical_status in ('open', 'closed', 'unverified', 'error')),
  add column if not exists freshness_bucket text not null default 'unknown'
    check (freshness_bucket in ('hot', 'fresh', 'recent', 'aging', 'archive', 'unknown')),
  add column if not exists freshness_confidence text not null default 'low'
    check (freshness_confidence in ('high', 'medium', 'low')),
  add column if not exists date_evidence jsonb not null default '{}'::jsonb,
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists quality_tier text not null default 'watch'
    check (quality_tier in ('priority', 'strong', 'watch', 'archive')),
  add column if not exists canonical_job_id uuid references public.mina_jobs(id) on delete set null,
  add column if not exists materially_updated_at timestamptz;

update public.mina_jobs
set
  source_posted_at = coalesce(source_posted_at, posted_at),
  freshness_bucket = case
    when posted_at is null then 'unknown'
    when posted_at >= now() - interval '24 hours' then 'hot'
    when posted_at >= now() - interval '72 hours' then 'fresh'
    when posted_at >= now() - interval '7 days' then 'recent'
    when posted_at >= now() - interval '14 days' then 'aging'
    else 'archive'
  end,
  freshness_confidence = case when posted_at is null then 'low' else 'high' end,
  quality_tier = case
    when posted_at is not null and posted_at < now() - interval '14 days' then 'archive'
    else 'watch'
  end,
  active = case
    when posted_at is not null and posted_at < now() - interval '14 days'
      and not exists (
        select 1 from public.mina_job_states state
        where state.job_id = mina_jobs.id
          and state.status in ('saved', 'preparing', 'applied', 'recruiter_screen', 'interview', 'offer')
      ) then false
    else active
  end
where source_posted_at is null;

create index if not exists mina_jobs_fresh_queue_idx
  on public.mina_jobs (active, freshness_bucket, quality_tier, source_posted_at desc nulls last);

create table if not exists public.mina_source_configs (
  id text primary key,
  source_family text not null,
  source_type text not null,
  source_name text not null,
  employer text,
  board_identifier text,
  canonical_careers_url text,
  priority integer not null default 50,
  industry_tags jsonb not null default '[]'::jsonb,
  location_scope jsonb not null default '[]'::jsonb,
  expected_cadence_minutes integer not null default 120,
  enabled boolean not null default true,
  credential_ref text,
  expected_minimum_job_count integer not null default 0,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  consecutive_failure_count integer not null default 0,
  validation_notes text,
  owner text not null default 'duncan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mina_search_queries (
  id text primary key,
  query_family text not null,
  query_text text not null,
  language text not null default 'en',
  location_model text not null,
  freshness_request text not null default 'week',
  provider text not null,
  source_family text not null,
  cadence_minutes integer not null default 720,
  priority integer not null default 50,
  enabled boolean not null default true,
  query_cost_weight integer not null default 1,
  expected_signal text,
  false_positive_notes text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_result_at timestamptz,
  last_verified_job_at timestamptz,
  last_priority_strong_at timestamptz,
  fetched_count bigint not null default 0,
  admitted_count bigint not null default 0,
  verified_count bigint not null default 0,
  included_count bigint not null default 0,
  stale_count bigint not null default 0,
  duplicate_count bigint not null default 0,
  rejected_count bigint not null default 0,
  observed_median_posting_age_hours numeric,
  accepted_yield_rate numeric,
  config_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mina_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_fingerprint text not null unique,
  source_family text not null,
  source_name text not null,
  source_result_id text,
  query_id text references public.mina_search_queries(id) on delete set null,
  discovery_run_id uuid,
  raw_title text,
  raw_company text,
  raw_location text,
  raw_snippet text,
  source_url text not null,
  displayed_date text,
  source_timestamp timestamptz,
  discovered_at timestamptz not null default now(),
  source_rank integer,
  canonical_url text,
  employer_ats_id text,
  raw_evidence jsonb not null default '{}'::jsonb,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'verified', 'partial', 'failed')),
  eligibility_status text not null default 'pending'
    check (eligibility_status in ('pending', 'accepted', 'watch', 'rejected', 'duplicate')),
  rejection_gate text,
  rejection_reason text,
  duplicate_key text,
  promoted_job_id uuid references public.mina_jobs(id) on delete set null,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mina_discovery_candidates_status_idx
  on public.mina_discovery_candidates (eligibility_status, discovered_at desc);
create index if not exists mina_discovery_candidates_query_idx
  on public.mina_discovery_candidates (query_id, discovered_at desc);

create table if not exists public.mina_job_sources (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.mina_jobs(id) on delete cascade,
  source_family text not null,
  source_name text not null,
  source_result_id text,
  source_url text not null,
  query_id text references public.mina_search_queries(id) on delete set null,
  discovery_run_id uuid,
  source_posted_at timestamptz,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  unique (job_id, source_family, source_name, source_url)
);

create table if not exists public.mina_job_notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.mina_jobs(id) on delete cascade,
  channel text not null,
  recipient_ref text not null,
  alert_kind text not null default 'first_seen',
  reason text not null,
  dedupe_key text not null unique,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mina_source_runs
  add column if not exists duration_ms integer,
  add column if not exists http_status integer,
  add column if not exists created_count integer not null default 0,
  add column if not exists updated_count integer not null default 0,
  add column if not exists expired_count integer not null default 0,
  add column if not exists duplicate_count integer not null default 0,
  add column if not exists rejected_count integer not null default 0,
  add column if not exists oldest_posted_at timestamptz,
  add column if not exists newest_posted_at timestamptz,
  add column if not exists error_category text,
  add column if not exists diagnostic_message text,
  add column if not exists partial_coverage boolean not null default false,
  add column if not exists configured_family_count integer not null default 0,
  add column if not exists successful_family_count integer not null default 0,
  add column if not exists query_count integer not null default 0,
  add column if not exists provider text,
  add column if not exists rejection_breakdown jsonb not null default '{}'::jsonb;

insert into public.mina_source_configs
  (id, source_family, source_type, source_name, employer, board_identifier, priority, expected_cadence_minutes, credential_ref)
values
  ('himalayas-canada', 'structured_api', 'himalayas', 'Himalayas Canada HR', null, null, 90, 120, null),
  ('reddit-global', 'social', 'reddit_oauth', 'Reddit global search', null, null, 35, 120, 'REDDIT_CLIENT_ID'),
  ('serpapi-google-jobs', 'whole_web', 'serpapi', 'SerpApi Google Jobs', null, null, 80, 360, 'SERPAPI_API_KEY'),
  ('adzuna-canada', 'structured_api', 'adzuna', 'Adzuna Canada', null, null, 60, 360, 'MINA_ADZUNA_APP_ID'),
  ('codex-public-web', 'codex_research', 'codex', 'Codex public-web research', null, null, 85, 240, null)
on conflict (id) do update set
  source_family = excluded.source_family,
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  priority = excluded.priority,
  expected_cadence_minutes = excluded.expected_cadence_minutes,
  credential_ref = excluded.credential_ref,
  updated_at = now();

insert into public.mina_search_queries
  (id, query_family, query_text, language, location_model, freshness_request, provider, source_family, cadence_minutes, priority, expected_signal, false_positive_notes)
values
  ('en-montreal-hrbp', 'core_hrbp', '("HR Business Partner" OR "People Partner") Montreal', 'en', 'montreal_island', 'week', 'serpapi', 'whole_web', 720, 100, 'Senior HRBP roles in Montreal', 'Exclude junior and coordinator roles'),
  ('fr-montreal-hrbp', 'core_hrbp', '("partenaire d''affaires RH" OR "partenaire d''affaires ressources humaines") Montreal', 'fr', 'montreal_island', 'week', 'serpapi', 'whole_web', 720, 95, 'French HRBP roles in Montreal', 'Exclude generic consulting results'),
  ('en-canada-ta', 'recruiting_leadership', '("Talent Acquisition Manager" OR "Recruiting Manager" OR "Global Recruiting Manager") Canada remote', 'en', 'remote_canada', 'week', 'serpapi', 'whole_web', 720, 95, 'Canada-based recruiting leadership', 'Reject US-only remote roles'),
  ('fr-montreal-ta', 'recruiting_leadership', '("gestionnaire acquisition de talents" OR "responsable acquisition de talents") Montreal', 'fr', 'montreal_island', 'week', 'serpapi', 'whole_web', 720, 90, 'French talent acquisition leadership', 'Reject individual-contributor recruiters'),
  ('en-consumer-hr', 'preferred_sector', '(HR manager OR People manager) (fashion OR beauty OR cosmetics OR apparel OR sportswear) Canada', 'en', 'canada', 'week', 'serpapi', 'whole_web', 720, 80, 'Consumer-brand HR leadership', 'Verify employer and management scope'),
  ('fr-quebec-hr', 'quebec_specialist', '(gestionnaire RH OR directrice RH OR directeur RH) Montreal', 'fr', 'montreal_island', 'week', 'serpapi', 'whole_web', 720, 85, 'Quebec HR leadership', 'Director titles may exceed target seniority')
on conflict (id) do update set
  query_text = excluded.query_text,
  query_family = excluded.query_family,
  language = excluded.language,
  location_model = excluded.location_model,
  freshness_request = excluded.freshness_request,
  provider = excluded.provider,
  source_family = excluded.source_family,
  cadence_minutes = excluded.cadence_minutes,
  priority = excluded.priority,
  expected_signal = excluded.expected_signal,
  false_positive_notes = excluded.false_positive_notes,
  config_version = public.mina_search_queries.config_version + 1,
  updated_at = now();

alter table public.mina_source_configs enable row level security;
alter table public.mina_search_queries enable row level security;
alter table public.mina_discovery_candidates enable row level security;
alter table public.mina_job_sources enable row level security;
alter table public.mina_job_notifications enable row level security;

revoke all on table public.mina_source_configs from anon, authenticated;
revoke all on table public.mina_search_queries from anon, authenticated;
revoke all on table public.mina_discovery_candidates from anon, authenticated;
revoke all on table public.mina_job_sources from anon, authenticated;
revoke all on table public.mina_job_notifications from anon, authenticated;

grant all on table public.mina_jobs to service_role;
grant all on table public.mina_job_states to service_role;
grant all on table public.mina_search_profiles to service_role;
grant all on table public.mina_profile_evidence to service_role;
grant all on table public.mina_source_runs to service_role;
grant all on table public.mina_source_configs to service_role;
grant all on table public.mina_search_queries to service_role;
grant all on table public.mina_discovery_candidates to service_role;
grant all on table public.mina_job_sources to service_role;
grant all on table public.mina_job_notifications to service_role;
grant usage, select on all sequences in schema public to service_role;

comment on table public.mina_discovery_candidates is 'Untrusted raw Mina job discoveries staged before deterministic eligibility and canonical verification.';
comment on table public.mina_job_sources is 'Per-source provenance for canonical Mina jobs.';
comment on table public.mina_job_notifications is 'Idempotent job alert delivery receipts.';
