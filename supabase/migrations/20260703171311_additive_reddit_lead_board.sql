alter table public.admin_leads
  add column if not exists first_seen_scan_mode text,
  add column if not exists last_seen_scan_mode text,
  add column if not exists last_seen_scan_batch text;

create index if not exists admin_leads_source_active_posted_idx
  on public.admin_leads (source_id, active, posted_date desc nulls last, last_seen_at desc);

create index if not exists admin_leads_last_seen_scan_mode_idx
  on public.admin_leads (last_seen_scan_mode);
