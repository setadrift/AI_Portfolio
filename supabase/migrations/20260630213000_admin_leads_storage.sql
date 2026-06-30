create table if not exists public.admin_lead_sources (
  id text primary key,
  label text not null,
  description text not null default '',
  file_name text not null default '',
  markdown text not null default '',
  status jsonb,
  diagnostic jsonb,
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_leads (
  source_id text not null references public.admin_lead_sources(id) on delete cascade,
  lead_key text not null,
  score integer,
  score_label text not null default '',
  source_label text not null default '',
  source_kind text not null default '',
  posted_date date,
  discovered_date date,
  title text not null default '',
  url text not null default '',
  author text not null default '',
  category text not null default '',
  recommended_action text not null default '',
  reason text not null default '',
  suggested_comment text not null default '',
  suggested_dm text not null default '',
  payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active boolean not null default true,
  primary key (source_id, lead_key)
);

create table if not exists public.admin_lead_states (
  source_id text not null,
  lead_key text not null,
  queue text not null default 'actionable',
  action text not null default 'new',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (source_id, lead_key),
  foreign key (source_id, lead_key)
    references public.admin_leads(source_id, lead_key)
    on delete cascade
);

create index if not exists admin_leads_source_posted_idx
  on public.admin_leads (source_id, posted_date desc nulls last, last_seen_at desc);

create index if not exists admin_leads_category_idx
  on public.admin_leads (category);

create index if not exists admin_leads_action_idx
  on public.admin_leads (recommended_action);

alter table public.admin_lead_sources enable row level security;
alter table public.admin_leads enable row level security;
alter table public.admin_lead_states enable row level security;

drop trigger if exists admin_lead_sources_set_updated_at on public.admin_lead_sources;
drop trigger if exists admin_lead_states_set_updated_at on public.admin_lead_states;

create or replace function public.admin_leads_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_lead_sources_set_updated_at
before update on public.admin_lead_sources
for each row execute function public.admin_leads_set_updated_at();

create trigger admin_lead_states_set_updated_at
before update on public.admin_lead_states
for each row execute function public.admin_leads_set_updated_at();
