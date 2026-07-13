create extension if not exists pgcrypto;

create table if not exists public.consulting_offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  buyer text not null default '',
  outcome text not null default '',
  deliverables jsonb not null default '[]'::jsonb,
  duration_text text not null default '',
  pricing_model text not null default 'configurable',
  price_cents bigint,
  currency_code text,
  conversion_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_offers_price_nonnegative check (price_cents is null or price_cents >= 0)
);

create table if not exists public.consulting_opportunities (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  opportunity_type text not null default 'direct_client',
  stage text not null default 'new',
  name text not null,
  organization text not null default '',
  contact_email text,
  contact_url text,
  pain_point text not null default '',
  evidence_summary text not null default '',
  source_family text not null default 'manual',
  source_id text,
  source_lead_key text,
  primary_offer_id uuid references public.consulting_offers(id) on delete set null,
  estimated_value_cents bigint,
  currency_code text,
  probability_percent integer,
  next_action text,
  next_action_due_at timestamptz,
  last_contact_at timestamptz,
  discovery_at timestamptz,
  proposal_sent_at timestamptz,
  closed_at timestamptz,
  loss_reason text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_opportunity_value_nonnegative check (estimated_value_cents is null or estimated_value_cents >= 0),
  constraint consulting_opportunity_probability_range check (probability_percent is null or probability_percent between 0 and 100),
  constraint consulting_opportunity_source_pair check (
    (source_id is null and source_lead_key is null) or
    (source_id is not null and source_lead_key is not null)
  )
);

create unique index if not exists consulting_opportunities_source_lead_unique
  on public.consulting_opportunities (source_id, source_lead_key)
  where source_id is not null and source_lead_key is not null;

create index if not exists consulting_opportunities_stage_due_idx
  on public.consulting_opportunities (stage, next_action_due_at nulls first);

create table if not exists public.consulting_partners (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  organization text not null default '',
  category text not null default 'independent_specialist',
  relationship_stage text not null default 'research',
  geography text not null default '',
  client_focus text not null default '',
  complementary_capabilities text not null default '',
  overflow_angle text not null default '',
  contact_url text,
  contact_email text,
  relationship_strength integer not null default 1,
  last_contact_at timestamptz,
  next_action text,
  next_action_due_at timestamptz,
  referrals_given integer not null default 0,
  referrals_received integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_partner_strength_range check (relationship_strength between 1 and 5)
);

create table if not exists public.consulting_proof_assets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text not null,
  asset_type text not null default 'case_study',
  stage text not null default 'idea',
  intended_buyer text not null default '',
  buyer_decision text not null default '',
  scenario_label text not null default '',
  business_problem text not null default '',
  current_process_cost text not null default '',
  proposed_workflow text not null default '',
  controls_and_review text not null default '',
  expected_outcome text not null default '',
  primary_offer_id uuid references public.consulting_offers(id) on delete set null,
  public_url text,
  repository_reference text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consulting_activities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.consulting_opportunities(id) on delete cascade,
  partner_id uuid references public.consulting_partners(id) on delete cascade,
  activity_type text not null,
  channel text,
  occurred_at timestamptz not null default now(),
  summary text not null,
  outcome text,
  external_reference text,
  created_by text not null default 'duncan',
  created_at timestamptz not null default now(),
  constraint consulting_activity_relation check (opportunity_id is not null or partner_id is not null)
);

create index if not exists consulting_activities_opportunity_time_idx
  on public.consulting_activities (opportunity_id, occurred_at desc);

create table if not exists public.consulting_commitments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  opportunity_id uuid references public.consulting_opportunities(id) on delete cascade,
  partner_id uuid references public.consulting_partners(id) on delete cascade,
  asset_id uuid references public.consulting_proof_assets(id) on delete cascade,
  commitment_type text not null,
  title text not null,
  due_at timestamptz not null,
  status text not null default 'todo',
  sequence_step integer,
  completed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_commitment_relation check (
    opportunity_id is not null or partner_id is not null or asset_id is not null
  ),
  constraint consulting_commitment_sequence check (sequence_step is null or sequence_step in (0, 3, 7, 14))
);

create index if not exists consulting_commitments_status_due_idx
  on public.consulting_commitments (status, due_at);

create table if not exists public.consulting_asset_uses (
  asset_id uuid not null references public.consulting_proof_assets(id) on delete cascade,
  opportunity_id uuid not null references public.consulting_opportunities(id) on delete cascade,
  used_at timestamptz not null default now(),
  notes text not null default '',
  primary key (asset_id, opportunity_id)
);

create table if not exists public.consulting_platform_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  official_url text not null,
  status text not null default 'research',
  eligibility_requirements text not null default '',
  evidence_required text not null default '',
  completed_milestones jsonb not null default '[]'::jsonb,
  next_action text,
  next_action_due_at timestamptz,
  application_at timestamptz,
  decision text,
  verified_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consulting_projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  opportunity_id uuid references public.consulting_opportunities(id) on delete set null,
  client text not null,
  project text not null,
  status text not null,
  phase text not null default '',
  fee_cents bigint not null default 0,
  currency_code text,
  value_estimate text,
  payment_status text not null default 'Not Invoiced',
  started_at date not null,
  target_date date,
  next_action text not null default '',
  scope text not null default '',
  success_criteria jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_project_fee_nonnegative check (fee_cents >= 0)
);

alter table public.consulting_commitments
  add column if not exists project_id uuid references public.consulting_projects(id) on delete cascade;

alter table public.consulting_commitments
  drop constraint if exists consulting_commitment_relation;

alter table public.consulting_commitments
  add constraint consulting_commitment_relation check (
    opportunity_id is not null or partner_id is not null or asset_id is not null or project_id is not null
  );

create table if not exists public.consulting_weekly_snapshots (
  week_start date primary key,
  metrics jsonb not null default '{}'::jsonb,
  lesson text not null default '',
  generated_at timestamptz not null default now()
);

create or replace function public.consulting_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'consulting_offers',
    'consulting_opportunities',
    'consulting_partners',
    'consulting_proof_assets',
    'consulting_commitments',
    'consulting_platform_programs',
    'consulting_projects'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.consulting_set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end $$;

alter table public.consulting_offers enable row level security;
alter table public.consulting_opportunities enable row level security;
alter table public.consulting_partners enable row level security;
alter table public.consulting_proof_assets enable row level security;
alter table public.consulting_activities enable row level security;
alter table public.consulting_commitments enable row level security;
alter table public.consulting_asset_uses enable row level security;
alter table public.consulting_platform_programs enable row level security;
alter table public.consulting_projects enable row level security;
alter table public.consulting_weekly_snapshots enable row level security;

insert into public.consulting_offers
  (slug, name, buyer, outcome, deliverables, duration_text, pricing_model, conversion_path)
values
  ('workflow-diagnostic', 'Workflow Diagnostic', 'Operator who knows a process is painful but needs scope and priorities', 'Current-state map, risk review, opportunity shortlist, and a recommended first implementation', '["Current-state map", "Risk and control review", "Prioritized opportunity shortlist", "First implementation recommendation"]'::jsonb, 'Configurable', 'configurable', 'Automation Sprint'),
  ('automation-sprint', 'Automation Sprint', 'Team with one clearly bounded workflow', 'Working implementation with exceptions, test evidence, documentation, and handoff', '["Working implementation", "Exception paths", "Test evidence", "Documentation and handoff"]'::jsonb, 'Configurable', 'fixed_fee_or_estimate', 'Ongoing Improvement Support'),
  ('automation-rescue', 'Automation Rescue', 'Team with a broken or unreliable automation', 'Diagnosis, bounded repair, monitoring, and recovery documentation', '["Failure diagnosis", "Repair plan", "Bounded fix", "Monitoring and recovery notes"]'::jsonb, 'Configurable', 'fixed_fee_or_estimate', 'Ongoing Improvement Support'),
  ('ongoing-improvement-support', 'Ongoing Improvement Support', 'Existing client with recurring maintenance or expansion needs', 'Prioritized support capacity and incremental delivery', '["Support capacity", "Monitoring", "Prioritization", "Incremental improvements"]'::jsonb, 'Ongoing', 'retainer_or_day_rate', 'Next workflow')
on conflict (slug) do update set
  name = excluded.name,
  buyer = excluded.buyer,
  outcome = excluded.outcome,
  deliverables = excluded.deliverables,
  conversion_path = excluded.conversion_path;

insert into public.consulting_platform_programs
  (slug, name, official_url, status, eligibility_requirements, evidence_required, next_action, notes)
values
  ('make-partner', 'Make Partner Program', 'https://www.make.com/en/partners-directory', 'preparing', 'Complete relevant technical and partner training and show credible Make delivery proof.', 'Training milestones, buyer-facing Make case studies, and implementation references.', 'Complete Make technical and partner training; identify the next directory-readiness requirement.', 'Requirements can change. Verify against the official source before applying.'),
  ('zapier-solution-partner', 'Zapier Solution Partner Program', 'https://zapier.com/l/partners', 'ready_to_apply', 'Professional services or consultancy delivering automation implementation or managed services.', 'Consulting positioning, implementation examples, and service model.', 'Review the current application and prepare a concise evidence package.', 'Requirements can change. Verify against the official source before applying.'),
  ('n8n-expert-partner', 'n8n Expert Partner Program', 'https://n8n.io/expert-partners/', 'not_yet_eligible', 'Current pilot asks for an automation-focused services business with at least three active n8n customers and community involvement.', 'Three active customer implementations, references, and community participation.', 'Win and document three active n8n customer implementations before applying.', 'Do not treat the three-customer prerequisite as permanent truth; reverify it before application.')
on conflict (slug) do update set
  name = excluded.name,
  official_url = excluded.official_url,
  eligibility_requirements = excluded.eligibility_requirements,
  evidence_required = excluded.evidence_required,
  next_action = excluded.next_action,
  notes = excluded.notes;
