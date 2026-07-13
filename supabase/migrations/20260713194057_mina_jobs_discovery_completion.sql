-- Keep the checked-in public-search query pack and its database registry aligned.
-- This migration intentionally adds no alert inbox, health-alert, learned-source,
-- custom ATS, or provider-experiment infrastructure.

insert into public.mina_search_queries
  (id, query_family, query_text, language, location_model, freshness_request, provider, source_family, cadence_minutes, priority, expected_signal, false_positive_notes)
values
  ('en-people-leadership', 'people_leadership', '("People Operations Manager" OR "People & Culture Manager" OR "Head of People") Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 85, 'People leadership roles', 'Reject junior and US-only roles'),
  ('en-global-recruiting', 'global_recruiting', '("Global Talent Acquisition Manager" OR "International Recruitment Manager" OR "Global Recruiting Lead") Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 95, 'Canada-based global recruiting leadership', 'Confirm Canada work location'),
  ('fr-recruiting-lead', 'recruiting_leadership', '("responsable recrutement" OR "chef acquisition de talents" OR "direction recrutement") Montreal', 'fr', 'montreal_island', 'week', 'public_search', 'whole_web', 720, 90, 'French recruiting leadership', 'Reject individual-contributor recruiter roles'),
  ('en-fashion-beauty-hr', 'preferred_sector', '("HR Business Partner" OR "HR Manager" OR "Talent Acquisition Manager") (fashion OR apparel OR beauty OR cosmetics OR luxury OR retail) Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 90, 'Fashion and beauty HR leadership', 'Verify management scope'),
  ('en-athletic-consumer-hr', 'preferred_sector', '("HR Manager" OR "People Partner") (sportswear OR athletic wear OR consumer brand) Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 85, 'Athletic-wear and consumer-brand HR', 'Verify management scope'),
  ('en-canadian-business-hr', 'canadian_business', '("HR Business Partner" OR "HR Manager" OR "Recruiting Manager") ("Canadian company" OR Canada)', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 75, 'Canadian-business HR roles', 'Canada mention alone is not proof of Canadian ownership'),
  ('site-workday-hr', 'ats_discovery', 'site:myworkdayjobs.com ("HR Business Partner" OR "Talent Acquisition Manager") Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 90, 'Workday-hosted employer jobs', 'Prefer canonical employer tenant URL'),
  ('site-icims-jibe-hr', 'ats_discovery', '(site:icims.com OR site:jobs.*.com) ("HR Business Partner" OR "Recruitment Manager") Montreal Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 85, 'iCIMS and Jibe-hosted employer jobs', 'Avoid generic board mirrors'),
  ('site-smartrecruiters-hr', 'ats_discovery', 'site:jobs.smartrecruiters.com ("HR Manager" OR "People Partner" OR "Talent Acquisition Manager") Canada', 'en', 'canada', 'week', 'public_search', 'whole_web', 720, 85, 'SmartRecruiters employer jobs', 'Verify employer and Canada eligibility'),
  ('fr-quebec-specialist-boards', 'quebec_specialist', '(site:emploicrha.org OR site:emploisrh.ca OR site:jobboom.com OR site:jobillico.com) (gestionnaire OR partenaire OR acquisition) Montreal', 'fr', 'montreal_island', 'week', 'public_search', 'quebec_specialist', 720, 90, 'Quebec specialist-board roles', 'Canonical employer page required'),
  ('en-canadian-direct-indexes', 'canadian_job_index', '(site:eluta.ca OR site:jobbank.gc.ca) ("HR Business Partner" OR "HR Manager" OR "Recruiting Manager") Montreal Canada', 'en', 'canada', 'week', 'public_search', 'quebec_specialist', 720, 80, 'Canadian index and Job Bank results', 'Canonical employer page required'),
  ('fr-public-institutions', 'government_institutional', '(site:quebec.ca OR site:montreal.ca OR site:mcgill.ca OR site:concordia.ca OR site:umontreal.ca OR site:uqam.ca) (ressources humaines OR acquisition de talents) Montreal', 'fr', 'montreal_island', 'week', 'public_search', 'quebec_specialist', 720, 85, 'Government and institutional roles', 'Reject roles outside target seniority'),
  ('en-montreal-recruiters', 'recruiter', '(site:randstad.ca OR site:hays.ca OR site:michaelpage.ca OR site:roberthalf.com) ("HR Manager" OR "Talent Acquisition Manager") Montreal', 'en', 'montreal_island', 'week', 'public_search', 'quebec_specialist', 720, 70, 'Recruiter-posted Montreal roles', 'Canonical employer page preferred'),
  ('en-fashionjobs-canada', 'preferred_sector', 'site:fashionjobs.com Canada (human resources OR talent acquisition OR people manager)', 'en', 'canada', 'week', 'public_search', 'quebec_specialist', 720, 85, 'FashionJobs Canada HR roles', 'Canonical employer page required')
on conflict (id) do update set
  query_family = excluded.query_family,
  query_text = excluded.query_text,
  language = excluded.language,
  location_model = excluded.location_model,
  freshness_request = excluded.freshness_request,
  provider = excluded.provider,
  source_family = excluded.source_family,
  cadence_minutes = excluded.cadence_minutes,
  priority = excluded.priority,
  expected_signal = excluded.expected_signal,
  false_positive_notes = excluded.false_positive_notes,
  config_version = public.mina_search_queries.config_version + 1,
  updated_at = now();
