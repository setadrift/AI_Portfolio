-- Broaden Mina's production scan with public ATS feeds that require no paid API.

insert into public.mina_source_configs
  (id, source_family, source_type, source_name, employer, board_identifier, priority, expected_cadence_minutes, expected_minimum_job_count, validation_notes)
values
  ('greenhouse:faire', 'direct_ats', 'greenhouse', 'Faire Greenhouse', 'Faire', 'faire', 75, 120, 0, 'Public Greenhouse employer board.'),
  ('greenhouse:workleap', 'direct_ats', 'greenhouse', 'Workleap Greenhouse', 'Workleap', 'workleap', 90, 120, 0, 'Public Greenhouse board for a Montréal-based Canadian business.'),
  ('ashby:wealthsimple', 'direct_ats', 'ashby', 'Wealthsimple Ashby', 'Wealthsimple', 'wealthsimple', 85, 120, 0, 'Public Ashby board for a Canadian employer.'),
  ('ashby:lightspeed', 'direct_ats', 'ashby', 'Lightspeed Ashby', 'Lightspeed', 'lightspeed', 90, 120, 0, 'Public Ashby board for a Montréal-based Canadian employer.'),
  ('lever:plusgrade', 'direct_ats', 'lever', 'Plusgrade Lever', 'Plusgrade', 'plusgrade', 90, 120, 0, 'Public Lever board for a Montréal-based Canadian employer.'),
  ('workday:cae', 'direct_ats', 'workday', 'CAE Workday', 'CAE', '{"id":"cae","company":"CAE","host":"cae.wd3.myworkdayjobs.com","tenant":"cae","site":"career"}', 95, 120, 0, 'Public Workday CXS feed.'),
  ('workday:atkinsrealis', 'direct_ats', 'workday', 'AtkinsRéalis Workday', 'AtkinsRéalis', '{"id":"atkinsrealis","company":"AtkinsRéalis","host":"slihrms.wd3.myworkdayjobs.com","tenant":"slihrms","site":"Careers"}', 95, 120, 0, 'Public Workday CXS feed.'),
  ('workday:intelcom', 'direct_ats', 'workday', 'Intelcom Workday', 'Intelcom | Dragonfly', '{"id":"intelcom","company":"Intelcom | Dragonfly","host":"intelcomgroup.wd3.myworkdayjobs.com","tenant":"intelcomgroup","site":"Intelcom"}', 90, 120, 0, 'Public Workday CXS feed.'),
  ('workday:air-liquide', 'direct_ats', 'workday', 'Air Liquide Workday', 'Air Liquide', '{"id":"air-liquide","company":"Air Liquide","host":"airliquidehr.wd3.myworkdayjobs.com","tenant":"airliquidehr","site":"AirLiquideExternalCareer"}', 95, 120, 0, 'Public Workday CXS feed.'),
  ('workday:canada-goose', 'direct_ats', 'workday', 'Canada Goose Workday', 'Canada Goose', '{"id":"canada-goose","company":"Canada Goose","host":"canadagoose.wd3.myworkdayjobs.com","tenant":"canadagoose","site":"CanadaGooseCareers"}', 90, 120, 0, 'Public Workday CXS feed for a preferred fashion employer.'),
  ('workday:canadian-tire', 'direct_ats', 'workday', 'Canadian Tire Workday', 'Canadian Tire', '{"id":"canadian-tire","company":"Canadian Tire","host":"canadiantirecorporation.wd3.myworkdayjobs.com","tenant":"canadiantirecorporation","site":"Enterprise_External_Careers_Site"}', 85, 120, 0, 'Public Workday CXS feed for a Canadian consumer employer.'),
  ('workday:xbox-gaming', 'direct_ats', 'workday', 'Xbox Gaming Workday', 'Xbox Gaming', '{"id":"xbox-gaming","company":"Xbox Gaming","host":"xboxgaming.wd1.myworkdayjobs.com","tenant":"xboxgaming","site":"External"}', 85, 120, 0, 'Public Workday CXS feed with Montréal studio roles.'),
  ('workday:labatt', 'direct_ats', 'workday', 'Labatt Workday', 'Labatt Breweries of Canada', '{"id":"labatt","company":"Labatt Breweries of Canada","host":"abinbev.wd1.myworkdayjobs.com","tenant":"abinbev","site":"CAN"}', 85, 120, 0, 'Public Workday CXS feed for a Canadian consumer employer.'),
  ('workday:international-schools', 'direct_ats', 'workday', 'International Schools Partnership Workday', 'International Schools Partnership', '{"id":"international-schools","company":"International Schools Partnership","host":"internationalschools.wd3.myworkdayjobs.com","tenant":"internationalschools","site":"ISPCareers"}', 70, 120, 0, 'Public Workday CXS feed with Canada-based global roles.'),
  ('workday:aritzia', 'direct_ats', 'workday', 'Aritzia Workday', 'Aritzia', '{"id":"aritzia","company":"Aritzia","host":"aritzia.wd3.myworkdayjobs.com","tenant":"aritzia","site":"External"}', 90, 120, 0, 'Public Workday CXS feed for a preferred fashion employer.'),
  ('workday:mcgill', 'direct_ats', 'workday', 'McGill Workday', 'McGill University', '{"id":"mcgill","company":"McGill University","host":"mcgill.wd3.myworkdayjobs.com","tenant":"mcgill","site":"McGill_Careers"}', 85, 120, 0, 'Public Workday CXS feed for a Montréal institution.'),
  ('smartrecruiters:SGS', 'direct_ats', 'smartrecruiters', 'SGS SmartRecruiters', 'SGS', 'SGS', 85, 120, 0, 'Public SmartRecruiters employer API.'),
  ('smartrecruiters:Vention', 'direct_ats', 'smartrecruiters', 'Vention SmartRecruiters', 'Vention', 'Vention', 90, 120, 0, 'Public SmartRecruiters API for a Montréal employer.'),
  ('smartrecruiters:NBCUniversal3', 'direct_ats', 'smartrecruiters', 'NBCUniversal SmartRecruiters', 'NBCUniversal', 'NBCUniversal3', 85, 120, 0, 'Public SmartRecruiters employer API.'),
  ('smartrecruiters:AmericanIronandMetal', 'direct_ats', 'smartrecruiters', 'American Iron & Metal SmartRecruiters', 'American Iron & Metal', 'AmericanIronandMetal', 85, 120, 0, 'Public SmartRecruiters API for a Montréal employer.'),
  ('smartrecruiters:Ubisoft2', 'direct_ats', 'smartrecruiters', 'Ubisoft SmartRecruiters', 'Ubisoft', 'Ubisoft2', 90, 120, 0, 'Public SmartRecruiters API for a Montréal employer.'),
  ('smartrecruiters:ReitmansCanadaLteLtd', 'direct_ats', 'smartrecruiters', 'Reitmans SmartRecruiters', 'Reitmans Canada', 'ReitmansCanadaLteLtd', 95, 120, 0, 'Public SmartRecruiters API for a preferred Canadian fashion employer.'),
  ('smartrecruiters:Gameloft', 'direct_ats', 'smartrecruiters', 'Gameloft SmartRecruiters', 'Gameloft', 'Gameloft', 75, 120, 0, 'Public SmartRecruiters API with Montréal roles.'),
  ('workable:flinks', 'direct_ats', 'workable', 'Flinks Workable', 'Flinks', 'flinks', 70, 120, 0, 'Public Workable employer feed.'),
  ('workable:ghgsat', 'direct_ats', 'workable', 'GHGSat Workable', 'GHGSat', 'ghgsat', 80, 120, 0, 'Public Workable feed for a Montréal employer.'),
  ('duckduckgo:public-web', 'whole_web', 'duckduckgo_html', 'DuckDuckGo public web', null, null, 80, 360, 0, 'Free best-effort search; canonical employer or ATS verification remains required.')
on conflict (id) do update set
  source_family = excluded.source_family,
  source_type = excluded.source_type,
  source_name = excluded.source_name,
  employer = excluded.employer,
  board_identifier = excluded.board_identifier,
  priority = excluded.priority,
  expected_cadence_minutes = excluded.expected_cadence_minutes,
  expected_minimum_job_count = excluded.expected_minimum_job_count,
  validation_notes = excluded.validation_notes,
  enabled = true,
  updated_at = now();

update public.mina_search_queries
set freshness_request = 'month', provider = 'duckduckgo', updated_at = now(), config_version = config_version + 1
where id in (
  'en-montreal-hrbp', 'fr-montreal-hrbp', 'en-canada-ta', 'fr-montreal-ta',
  'en-consumer-hr', 'fr-quebec-hr', 'en-people-leadership', 'en-global-recruiting',
  'fr-recruiting-lead', 'en-fashion-beauty-hr', 'en-athletic-consumer-hr',
  'en-canadian-business-hr', 'site-workday-hr', 'site-icims-jibe-hr',
  'site-smartrecruiters-hr', 'fr-quebec-specialist-boards', 'en-canadian-direct-indexes',
  'fr-public-institutions', 'en-montreal-recruiters', 'en-fashionjobs-canada'
);
