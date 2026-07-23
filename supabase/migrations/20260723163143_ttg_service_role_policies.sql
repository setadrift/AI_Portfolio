do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'staged_refreshes',
    'import_runs',
    'source_coverage',
    'analytics_daily',
    'retention_cohorts',
    'monthly_metrics',
    'therapist_metrics',
    'expense_metrics',
    'quality_checks',
    'appointment_facts',
    'transaction_facts',
    'sales_facts',
    'collection_facts',
    'marketing_campaigns',
    'custom_dashboards',
    'custom_widgets'
  ]
  loop
    execute format(
      'create policy %I on ttg_reporting.%I for all to service_role using (true) with check (true)',
      table_name || '_service_role_only',
      table_name
    );
  end loop;
end
$$;
