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

revoke all on ttg_reporting.analytics_daily_current from public, anon, authenticated;
grant all on ttg_reporting.analytics_daily_current to service_role;
