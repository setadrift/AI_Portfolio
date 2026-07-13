create index if not exists mina_jobs_canonical_job_id_idx
  on public.mina_jobs (canonical_job_id)
  where canonical_job_id is not null;

create index if not exists mina_discovery_candidates_promoted_job_idx
  on public.mina_discovery_candidates (promoted_job_id)
  where promoted_job_id is not null;

create index if not exists mina_job_sources_query_id_idx
  on public.mina_job_sources (query_id)
  where query_id is not null;

create index if not exists mina_job_notifications_job_id_idx
  on public.mina_job_notifications (job_id);
