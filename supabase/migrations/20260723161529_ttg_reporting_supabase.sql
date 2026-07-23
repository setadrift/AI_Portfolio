create schema if not exists ttg_reporting;

comment on schema ttg_reporting is
  'Private, server-only reporting store for the Trauma Therapy Group dashboard.';

revoke all on schema ttg_reporting from public, anon, authenticated;
grant usage on schema ttg_reporting to service_role;

create table if not exists ttg_reporting.staged_refreshes (
  id uuid primary key default gen_random_uuid(),
  prepared_by text not null,
  payload jsonb not null,
  payload_sha256 text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint staged_refreshes_expiry_check check (expires_at > created_at)
);

create index if not exists staged_refreshes_expiry_idx
  on ttg_reporting.staged_refreshes (expires_at)
  where consumed_at is null;

create table if not exists ttg_reporting.import_runs (
  id uuid primary key,
  created_at timestamptz not null default now(),
  refreshed_by text not null,
  refresh_type text not null check (refresh_type in ('jane', 'full')),
  period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  period_label text not null,
  period_start date not null,
  period_end date not null,
  period_status text not null check (period_status in ('Complete', 'Partial')),
  analytics_start date,
  analytics_end date,
  status text not null check (status in ('PASS', 'WARNING', 'FAIL')),
  file_summaries jsonb not null default '[]'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  checks jsonb not null default '[]'::jsonb,
  bank_rows integer not null default 0 check (bank_rows >= 0),
  bank_coverage text not null default '',
  payload_meta jsonb not null default '{}'::jsonb,
  rolled_back_at timestamptz,
  rolled_back_by text,
  constraint import_runs_period_check check (period_end >= period_start),
  constraint import_runs_analytics_check check (
    analytics_start is null
    or analytics_end is null
    or analytics_end >= analytics_start
  )
);

create index if not exists import_runs_created_idx
  on ttg_reporting.import_runs (created_at desc);

create index if not exists import_runs_period_idx
  on ttg_reporting.import_runs (period_key, created_at desc)
  where rolled_back_at is null;

create table if not exists ttg_reporting.source_coverage (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  kind text not null,
  label text not null,
  role text not null check (role in ('core', 'supplemental')),
  coverage_start date,
  coverage_end date,
  status text not null check (status in ('complete', 'partial', 'missing')),
  note text not null default '',
  primary key (import_id, kind),
  constraint source_coverage_range_check check (
    coverage_start is null
    or coverage_end is null
    or coverage_end >= coverage_start
  )
);

create index if not exists source_coverage_kind_range_idx
  on ttg_reporting.source_coverage (kind, coverage_start, coverage_end);

create table if not exists ttg_reporting.analytics_daily (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  date date not null,
  entity text not null check (
    entity in (
      'clinic',
      'practitioner',
      'service',
      'payer',
      'payment_method',
      'booking_source',
      'hour'
    )
  ),
  name text not null,
  appointments double precision not null default 0,
  completed double precision not null default 0,
  cancelled double precision not null default 0,
  no_shows double precision not null default 0,
  pending double precision not null default 0,
  invoiced double precision not null default 0,
  collected double precision not null default 0,
  processed double precision not null default 0,
  outstanding double precision not null default 0,
  commission double precision not null default 0,
  transactions double precision not null default 0,
  completed_transactions double precision not null default 0,
  completed_transaction_value double precision not null default 0,
  fees double precision not null default 0,
  refunds double precision not null default 0,
  patients double precision not null default 0,
  new_patients double precision not null default 0,
  consultations double precision not null default 0,
  first_visits double precision not null default 0,
  subsequent_visits double precision not null default 0,
  booked_minutes double precision not null default 0,
  recovered double precision not null default 0,
  payment_lag_days double precision not null default 0,
  payment_lag_samples double precision not null default 0,
  primary key (import_id, date, entity, name)
);

create index if not exists analytics_daily_date_entity_idx
  on ttg_reporting.analytics_daily (date, entity, name);

create table if not exists ttg_reporting.retention_cohorts (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  cohort_month date not null,
  entity text not null check (entity in ('clinic', 'practitioner', 'service')),
  name text not null,
  cohort_size integer not null default 0 check (cohort_size >= 0),
  eligible_30 integer not null default 0 check (eligible_30 >= 0),
  retained_30 integer not null default 0 check (retained_30 >= 0),
  eligible_60 integer not null default 0 check (eligible_60 >= 0),
  retained_60 integer not null default 0 check (retained_60 >= 0),
  eligible_90 integer not null default 0 check (eligible_90 >= 0),
  retained_90 integer not null default 0 check (retained_90 >= 0),
  repeat_patients integer not null default 0 check (repeat_patients >= 0),
  visit_gap_days double precision not null default 0,
  visit_gap_samples integer not null default 0 check (visit_gap_samples >= 0),
  primary key (import_id, cohort_month, entity, name)
);

create index if not exists retention_cohorts_month_entity_idx
  on ttg_reporting.retention_cohorts (cohort_month, entity, name);

create table if not exists ttg_reporting.monthly_metrics (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  status text not null check (status in ('Complete', 'Partial')),
  data_through date not null,
  gross_revenue double precision not null default 0,
  collected_revenue double precision not null default 0,
  collection_rate double precision not null default 0,
  outstanding_balance double precision not null default 0,
  operating_expenses double precision not null default 0,
  operating_profit double precision not null default 0,
  profit_margin double precision not null default 0,
  net_cash_flow double precision not null default 0,
  marketing_spend double precision not null default 0,
  marketing_ratio double precision not null default 0,
  uncategorized_expenses double precision not null default 0,
  primary key (import_id, period_key)
);

create index if not exists monthly_metrics_period_idx
  on ttg_reporting.monthly_metrics (period_key);

create table if not exists ttg_reporting.therapist_metrics (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  name text not null,
  owner boolean not null default false,
  invoices integer not null default 0,
  invoiced double precision not null default 0,
  collected double precision not null default 0,
  scheduled_hours double precision not null default 0,
  booked_hours double precision not null default 0,
  bookings integer not null default 0,
  compensation double precision not null default 0,
  primary key (import_id, period_key, name)
);

create index if not exists therapist_metrics_period_name_idx
  on ttg_reporting.therapist_metrics (period_key, name);

create table if not exists ttg_reporting.expense_metrics (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  category text not null,
  amount double precision not null default 0,
  primary key (import_id, period_key, category)
);

create table if not exists ttg_reporting.quality_checks (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  ordinal integer not null,
  check_name text not null,
  actual double precision not null default 0,
  expected double precision not null default 0,
  difference double precision not null default 0,
  tolerance double precision not null default 0,
  status text not null check (status in ('PASS', 'WARNING', 'FAIL')),
  notes text not null default '',
  primary key (import_id, ordinal)
);

create table if not exists ttg_reporting.appointment_facts (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  record_key text not null,
  occurred_at timestamptz not null,
  date date not null,
  service text not null,
  practitioner text not null,
  state text not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  booking_source text not null,
  patient_key text,
  first_visit boolean not null default false,
  consultation boolean not null default false,
  recovered boolean not null default false,
  primary key (import_id, record_key)
);

create index if not exists appointment_facts_date_practitioner_idx
  on ttg_reporting.appointment_facts (date, practitioner);

create index if not exists appointment_facts_patient_date_idx
  on ttg_reporting.appointment_facts (patient_key, date)
  where patient_key is not null;

create table if not exists ttg_reporting.transaction_facts (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  record_key text not null,
  date date not null,
  practitioner text not null,
  service text not null,
  revenue double precision not null default 0,
  collected double precision not null default 0,
  commission double precision not null default 0,
  payment_method text not null,
  status text not null,
  patient_key text,
  primary key (import_id, record_key)
);

create index if not exists transaction_facts_date_practitioner_idx
  on ttg_reporting.transaction_facts (date, practitioner);

create table if not exists ttg_reporting.sales_facts (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  record_key text not null,
  date date not null,
  invoice_key text not null,
  item text not null,
  practitioner text not null,
  payer_category text not null,
  status text not null,
  subtotal double precision not null default 0,
  total double precision not null default 0,
  collected double precision not null default 0,
  outstanding double precision not null default 0,
  primary key (import_id, record_key)
);

create index if not exists sales_facts_date_practitioner_idx
  on ttg_reporting.sales_facts (date, practitioner);

create index if not exists sales_facts_invoice_idx
  on ttg_reporting.sales_facts (invoice_key);

create table if not exists ttg_reporting.collection_facts (
  import_id uuid not null references ttg_reporting.import_runs(id) on delete cascade,
  record_key text not null,
  date date not null,
  method text not null,
  amount double precision not null default 0,
  transaction_count integer not null default 0 check (transaction_count >= 0),
  primary key (import_id, record_key)
);

create index if not exists collection_facts_date_method_idx
  on ttg_reporting.collection_facts (date, method);

create table if not exists ttg_reporting.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  status text not null default 'completed',
  start_date date not null,
  end_date date not null,
  spend double precision not null default 0,
  impressions integer,
  clicks integer,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint marketing_campaigns_range_check check (end_date >= start_date)
);

create index if not exists marketing_campaigns_dates_idx
  on ttg_reporting.marketing_campaigns (start_date, end_date)
  where archived_at is null;

create table if not exists ttg_reporting.custom_dashboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_default boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists ttg_reporting.custom_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references ttg_reporting.custom_dashboards(id) on delete cascade,
  position integer not null check (position >= 0),
  widget_type text not null,
  title text not null,
  metric_key text,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id, position)
);

insert into ttg_reporting.custom_dashboards (name, description, is_default)
select 'Main Sheets', 'Custom dashboard widgets and performance metrics', true
where not exists (
  select 1
  from ttg_reporting.custom_dashboards
  where name = 'Main Sheets' and deleted_at is null
);

insert into ttg_reporting.custom_widgets (
  dashboard_id,
  position,
  widget_type,
  title,
  metric_key
)
select dashboard.id, widget.position, 'kpi', widget.title, widget.metric_key
from ttg_reporting.custom_dashboards dashboard
cross join (
  values
    (0, 'Total Revenue', 'total_revenue'),
    (1, 'Total Commission', 'total_commission'),
    (2, 'New KPI Card', null),
    (3, 'Avg Revenue per Practitioner', 'avg_revenue_per_practitioner')
) as widget(position, title, metric_key)
where dashboard.name = 'Main Sheets'
  and dashboard.deleted_at is null
  and not exists (
    select 1
    from ttg_reporting.custom_widgets existing
    where existing.dashboard_id = dashboard.id
  );

create or replace view ttg_reporting.analytics_daily_current
with (security_invoker = true)
as
with dates as (
  select distinct date from ttg_reporting.analytics_daily
),
latest_run as (
  select
    dates.date,
    (
      select runs.id
      from ttg_reporting.import_runs runs
      where runs.rolled_back_at is null
        and runs.analytics_start is not null
        and dates.date between runs.analytics_start and runs.analytics_end
      order by runs.created_at desc, runs.id desc
      limit 1
    ) as import_id
  from dates
)
select rows.*
from ttg_reporting.analytics_daily rows
join latest_run
  on latest_run.date = rows.date
 and latest_run.import_id = rows.import_id;

create or replace view ttg_reporting.retention_cohorts_current
with (security_invoker = true)
as
select distinct on (rows.cohort_month, rows.entity, rows.name)
  rows.*
from ttg_reporting.retention_cohorts rows
join ttg_reporting.import_runs runs on runs.id = rows.import_id
where runs.rolled_back_at is null
order by
  rows.cohort_month,
  rows.entity,
  rows.name,
  runs.created_at desc,
  rows.import_id desc;

create or replace view ttg_reporting.monthly_metrics_current
with (security_invoker = true)
as
select distinct on (rows.period_key)
  rows.*
from ttg_reporting.monthly_metrics rows
join ttg_reporting.import_runs runs on runs.id = rows.import_id
where runs.rolled_back_at is null
order by rows.period_key, runs.created_at desc, rows.import_id desc;

create or replace view ttg_reporting.therapist_metrics_current
with (security_invoker = true)
as
select distinct on (rows.period_key, rows.name)
  rows.*
from ttg_reporting.therapist_metrics rows
join ttg_reporting.import_runs runs on runs.id = rows.import_id
where runs.rolled_back_at is null
order by rows.period_key, rows.name, runs.created_at desc, rows.import_id desc;

create or replace view ttg_reporting.expense_metrics_current
with (security_invoker = true)
as
select distinct on (rows.period_key, rows.category)
  rows.*
from ttg_reporting.expense_metrics rows
join ttg_reporting.import_runs runs on runs.id = rows.import_id
where runs.rolled_back_at is null
order by rows.period_key, rows.category, runs.created_at desc, rows.import_id desc;

create or replace function ttg_reporting.latest_import_for_date(
  p_kind text,
  p_date date
)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select runs.id
  from ttg_reporting.import_runs runs
  join ttg_reporting.source_coverage coverage
    on coverage.import_id = runs.id
   and coverage.kind = p_kind
  where runs.rolled_back_at is null
    and coverage.coverage_start is not null
    and p_date between coverage.coverage_start and coverage.coverage_end
  order by runs.created_at desc, runs.id desc
  limit 1;
$$;

create or replace view ttg_reporting.appointment_facts_current
with (security_invoker = true)
as
select facts.*
from ttg_reporting.appointment_facts facts
where facts.import_id = ttg_reporting.latest_import_for_date('appointments', facts.date);

create or replace view ttg_reporting.transaction_facts_current
with (security_invoker = true)
as
select facts.*
from ttg_reporting.transaction_facts facts
where facts.import_id = ttg_reporting.latest_import_for_date('compensation', facts.date);

create or replace view ttg_reporting.sales_facts_current
with (security_invoker = true)
as
select facts.*
from ttg_reporting.sales_facts facts
where facts.import_id = ttg_reporting.latest_import_for_date('sales', facts.date);

create or replace view ttg_reporting.collection_facts_current
with (security_invoker = true)
as
select facts.*
from ttg_reporting.collection_facts facts
where facts.import_id = ttg_reporting.latest_import_for_date('payments', facts.date);

alter table ttg_reporting.staged_refreshes enable row level security;
alter table ttg_reporting.import_runs enable row level security;
alter table ttg_reporting.source_coverage enable row level security;
alter table ttg_reporting.analytics_daily enable row level security;
alter table ttg_reporting.retention_cohorts enable row level security;
alter table ttg_reporting.monthly_metrics enable row level security;
alter table ttg_reporting.therapist_metrics enable row level security;
alter table ttg_reporting.expense_metrics enable row level security;
alter table ttg_reporting.quality_checks enable row level security;
alter table ttg_reporting.appointment_facts enable row level security;
alter table ttg_reporting.transaction_facts enable row level security;
alter table ttg_reporting.sales_facts enable row level security;
alter table ttg_reporting.collection_facts enable row level security;
alter table ttg_reporting.marketing_campaigns enable row level security;
alter table ttg_reporting.custom_dashboards enable row level security;
alter table ttg_reporting.custom_widgets enable row level security;

revoke all on all tables in schema ttg_reporting from public, anon, authenticated;
revoke all on all functions in schema ttg_reporting from public, anon, authenticated;
revoke all on all sequences in schema ttg_reporting from public, anon, authenticated;

grant all on all tables in schema ttg_reporting to service_role;
grant execute on all functions in schema ttg_reporting to service_role;
grant usage, select on all sequences in schema ttg_reporting to service_role;

alter default privileges in schema ttg_reporting
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema ttg_reporting
  revoke all on functions from public, anon, authenticated;
alter default privileges in schema ttg_reporting
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema ttg_reporting
  grant all on tables to service_role;
alter default privileges in schema ttg_reporting
  grant execute on functions to service_role;
alter default privileges in schema ttg_reporting
  grant usage, select on sequences to service_role;

alter role authenticator set pgrst.db_schemas =
  'public, storage, graphql_public, ttg_reporting';

notify pgrst, 'reload config';
