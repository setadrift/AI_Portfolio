delete from public.mina_source_configs
where id in ('himalayas-canada', 'reddit-global', 'serpapi-google-jobs', 'adzuna-canada', 'codex-public-web');

insert into public.mina_source_configs
  (id, source_family, source_type, source_name, employer, board_identifier, canonical_careers_url, priority, industry_tags, location_scope, expected_cadence_minutes, credential_ref, expected_minimum_job_count, validation_notes)
values
  ('greenhouse:stackadapt', 'direct_ats', 'greenhouse', 'StackAdapt Greenhouse', 'StackAdapt', 'stackadapt', 'https://www.stackadapt.com/careers', 95, '["Canadian business", "Technology"]', '["Canada remote"]', 120, null, 1, 'Public Greenhouse board; API listing is canonical open-status evidence.'),
  ('greenhouse:hootsuite', 'direct_ats', 'greenhouse', 'Hootsuite Greenhouse', 'Hootsuite', 'hootsuite', 'https://careers.hootsuite.com/', 80, '["Canadian business", "Technology"]', '["Canada"]', 120, null, 1, 'Public Greenhouse board.'),
  ('ashby:koho', 'direct_ats', 'ashby', 'KOHO Ashby', 'KOHO', 'koho', 'https://www.koho.ca/careers/', 85, '["Canadian business", "Financial services"]', '["Canada"]', 120, null, 1, 'Public Ashby board.'),
  ('ashby:cohere', 'direct_ats', 'ashby', 'Cohere Ashby', 'Cohere', 'cohere', 'https://cohere.com/careers', 80, '["Canadian business", "Technology"]', '["Canada"]', 120, null, 1, 'Public Ashby board.'),
  ('ashby:beaconsoftware', 'direct_ats', 'ashby', 'Beacon Software Ashby', 'Beacon Software', 'beaconsoftware', null, 60, '[]', '["Canada"]', 120, null, 0, 'Public Ashby board.'),
  ('ashby:homebase', 'direct_ats', 'ashby', 'Homebase Ashby', 'Homebase', 'homebase', null, 60, '[]', '["Canada"]', 120, null, 0, 'Public Ashby board.'),
  ('ashby:ignition', 'direct_ats', 'ashby', 'Ignition Ashby', 'Ignition', 'ignition', null, 55, '[]', '["Canada"]', 120, null, 0, 'Public Ashby board.'),
  ('ashby:semperis', 'direct_ats', 'ashby', 'Semperis Ashby', 'Semperis', 'semperis', null, 55, '[]', '["Canada"]', 120, null, 0, 'Public Ashby board.'),
  ('ashby:1password', 'direct_ats', 'ashby', '1Password Ashby', '1Password', '1password', 'https://1password.com/jobs', 75, '["Canadian business", "Technology"]', '["Canada remote"]', 120, null, 1, 'Public Ashby board.'),
  ('lever:knix', 'direct_ats', 'lever', 'Knix Lever', 'Knix', 'knix', 'https://knix.ca/pages/careers', 95, '["Canadian business", "Fashion", "Athletic wear"]', '["Canada"]', 120, null, 1, 'Public Lever board and preferred sector.'),
  ('lever:eqbank', 'direct_ats', 'lever', 'EQ Bank Lever', 'EQ Bank', 'eqbank', null, 70, '["Canadian business", "Financial services"]', '["Canada"]', 120, null, 1, 'Public Lever board.'),
  ('lever:dulcedo', 'direct_ats', 'lever', 'Dulcedo Lever', 'Dulcedo Management', 'dulcedo', null, 85, '["Canadian business", "Fashion", "Consumer brands"]', '["Montréal Island"]', 120, null, 0, 'Public Lever board and preferred sector.'),
  ('lever:pointclickcare', 'direct_ats', 'lever', 'PointClickCare Lever', 'PointClickCare', 'pointclickcare', null, 65, '["Canadian business", "Healthcare technology"]', '["Canada"]', 120, null, 1, 'Public Lever board.'),
  ('himalayas:canada-hr', 'structured_api', 'himalayas', 'Himalayas Canada HR', null, null, 'https://himalayas.app/jobs', 90, '[]', '["Canada remote"]', 120, null, 1, 'Free structured API; canonical page still required before alert.'),
  ('remotive:hr', 'structured_api', 'remotive', 'Remotive HR feed', null, null, 'https://remotive.com/remote-jobs/hr', 45, '[]', '["Remote"]', 120, null, 0, 'Public feed is delayed by about 24 hours and cannot independently establish Hot status.'),
  ('jooble:canada', 'structured_api', 'jooble', 'Jooble Canada', null, null, null, 60, '[]', '["Canada"]', 360, 'JOOBLE_API_KEY', 0, 'Jooble updated time is discovery evidence only; employer date must be verified.'),
  ('adzuna:canada', 'structured_api', 'adzuna', 'Adzuna Canada', null, null, null, 60, '[]', '["Canada"]', 360, 'MINA_ADZUNA_APP_ID', 0, 'Optional keyed API.'),
  ('serpapi:google-jobs', 'whole_web', 'serpapi', 'SerpApi Google Jobs', null, null, null, 80, '[]', '["Canada", "Montréal Island"]', 360, 'SERPAPI_API_KEY', 0, 'Optional 14-day comparison; strict query budget.'),
  ('reddit:global-search', 'social', 'reddit_oauth', 'Reddit global search', null, null, 'https://www.reddit.com/search/', 35, '[]', '["Canada", "Montréal Island"]', 120, 'REDDIT_CLIENT_ID', 0, 'Supplemental discovery only; Reddit timestamp never becomes employer posted date.'),
  ('codex:public-web', 'codex_research', 'codex', 'Codex public-web research', null, null, null, 85, '[]', '["Canada", "Montréal Island"]', 240, null, 0, 'Independent four-times-daily public-web research lane with deterministic publisher gates.')
on conflict (id) do update set
  source_family = excluded.source_family,
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  employer = excluded.employer,
  board_identifier = excluded.board_identifier,
  canonical_careers_url = excluded.canonical_careers_url,
  priority = excluded.priority,
  industry_tags = excluded.industry_tags,
  location_scope = excluded.location_scope,
  expected_cadence_minutes = excluded.expected_cadence_minutes,
  credential_ref = excluded.credential_ref,
  expected_minimum_job_count = excluded.expected_minimum_job_count,
  validation_notes = excluded.validation_notes,
  updated_at = now();
