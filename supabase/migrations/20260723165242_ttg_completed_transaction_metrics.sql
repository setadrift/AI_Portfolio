alter table ttg_reporting.analytics_daily
  add column if not exists completed_transactions double precision not null default 0,
  add column if not exists completed_transaction_value double precision not null default 0;
