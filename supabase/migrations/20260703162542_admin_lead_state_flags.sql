alter table public.admin_lead_states
  add column if not exists commented_at timestamptz,
  add column if not exists dm_sent_at timestamptz,
  add column if not exists dismissed_at timestamptz;

update public.admin_lead_states
set commented_at = coalesce(commented_at, updated_at)
where action = 'commented'
  and commented_at is null;

update public.admin_lead_states
set dm_sent_at = coalesce(dm_sent_at, updated_at)
where action = 'dm_sent'
  and dm_sent_at is null;

update public.admin_lead_states
set dismissed_at = coalesce(dismissed_at, updated_at)
where action = 'dismissed'
  and dismissed_at is null;
