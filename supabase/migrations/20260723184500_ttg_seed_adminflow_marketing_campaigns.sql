insert into ttg_reporting.marketing_campaigns (
  name,
  channel,
  status,
  start_date,
  end_date,
  spend,
  source
)
select
  campaign.name,
  'Google Ads',
  'completed',
  campaign.start_date::date,
  campaign.end_date::date,
  campaign.spend,
  'adminflow-migration'
from (
  values
    ('Google Ads - June', '2026-05-31', '2026-06-29', 4410::double precision),
    ('Google Ads - May', '2026-04-30', '2026-05-30', 3607::double precision),
    ('Google Ads - April', '2026-03-31', '2026-04-29', 2833::double precision),
    ('Google Ads - March', '2026-02-28', '2026-03-30', 2906::double precision),
    ('Google Ads Februrary', '2026-01-31', '2026-02-27', 2458::double precision),
    ('January Campaign', '2025-12-31', '2026-01-30', 2238::double precision)
) as campaign(name, start_date, end_date, spend)
where not exists (
  select 1
  from ttg_reporting.marketing_campaigns existing
  where existing.name = campaign.name
    and existing.start_date = campaign.start_date::date
    and existing.end_date = campaign.end_date::date
);
