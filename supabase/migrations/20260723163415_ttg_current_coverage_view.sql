create or replace view ttg_reporting.source_coverage_current
with (security_invoker = true)
as
select distinct on (coverage.kind)
  coverage.*
from ttg_reporting.source_coverage coverage
join ttg_reporting.import_runs runs on runs.id = coverage.import_id
where runs.rolled_back_at is null
order by coverage.kind, runs.created_at desc, coverage.import_id desc;

revoke all on ttg_reporting.source_coverage_current from public, anon, authenticated;
grant all on ttg_reporting.source_coverage_current to service_role;
