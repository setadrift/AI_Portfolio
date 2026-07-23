create or replace view ttg_reporting.marketing_new_clients_current
with (security_invoker = true)
as
with qualifying as (
  select
    patient_key,
    date,
    occurred_at,
    row_number() over (
      partition by patient_key
      order by occurred_at, record_key
    ) as visit_order
  from ttg_reporting.appointment_facts_current
  where patient_key is not null
    and state in ('arrived', 'completed')
    and consultation is false
)
select
  date,
  'organic'::text as channel,
  count(*)::integer as new_clients
from qualifying
where visit_order = 1
group by date;

revoke all on ttg_reporting.marketing_new_clients_current from anon, authenticated;
grant select on ttg_reporting.marketing_new_clients_current to service_role;
