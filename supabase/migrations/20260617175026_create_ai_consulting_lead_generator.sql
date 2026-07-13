create extension if not exists pgcrypto;

create table public.lead_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text,
  problem text not null default '',
  solution text not null default '',
  target_users text not null default '',
  geography text not null default '',
  budget_fit text not null default '',
  matching_mode text not null default 'direct_requests' check (matching_mode in ('direct_requests', 'broad_match')),
  active boolean not null default true,
  scan_frequency text not null default 'manual' check (scan_frequency in ('manual', 'daily', 'hourly')),
  min_quality_score integer not null default 70 check (min_quality_score between 0 and 100),
  max_posts_per_source integer not null default 50 check (max_posts_per_source > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  source_type text not null check (source_type in ('reddit_subreddit', 'reddit_search', 'manual_url', 'external_forum', 'job_board')),
  name text not null,
  url text,
  status text not null default 'active' check (status in ('active', 'testing', 'paused', 'blocked')),
  scan_frequency text not null default 'manual' check (scan_frequency in ('manual', 'daily', 'hourly')),
  yield_score numeric(6,2) not null default 0,
  scans integer not null default 0 check (scans >= 0),
  posts_seen integer not null default 0 check (posts_seen >= 0),
  leads_found integer not null default 0 check (leads_found >= 0),
  qualified_leads integer not null default 0 check (qualified_leads >= 0),
  rejected_leads integer not null default 0 check (rejected_leads >= 0),
  last_scanned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, source_type, name)
);

create table public.lead_keywords (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  phrase text not null,
  phrase_key text generated always as (lower(btrim(phrase))) stored,
  status text not null default 'active' check (status in ('active', 'testing', 'paused', 'banned')),
  intent_type text not null default 'pain' check (intent_type in ('pain', 'tool', 'buying_intent', 'domain', 'negative')),
  created_by text not null default 'manual' check (created_by in ('manual', 'ai', 'feedback', 'import')),
  leads_found integer not null default 0 check (leads_found >= 0),
  qualified_leads integer not null default 0 check (qualified_leads >= 0),
  rejected_leads integer not null default 0 check (rejected_leads >= 0),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, phrase_key, intent_type)
);

create table public.lead_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  rule_type text not null check (rule_type in ('positive_pattern', 'negative_pattern', 'blocked_phrase', 'alex_like_pattern', 'not_a_lead_persona')),
  text text not null,
  status text not null default 'active' check (status in ('active', 'testing', 'paused')),
  created_by text not null default 'manual' check (created_by in ('manual', 'ai', 'feedback', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, rule_type, text)
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.lead_sources(id) on delete set null,
  external_id text,
  source_type text not null check (source_type in ('reddit_post', 'reddit_comment', 'manual_url', 'external_forum_post', 'job_post')),
  source_name text not null,
  subreddit text,
  title text not null,
  body text not null default '',
  author text,
  permalink text not null,
  url text,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  engagement_score integer,
  raw_json jsonb not null default '{}'::jsonb,
  fingerprint text generated always as (
    md5(lower(coalesce(title, '') || '|' || coalesce(url, '') || '|' || coalesce(author, '') || '|' || coalesce(source_name, '')))
  ) stored,
  unique (source_type, external_id)
);

create unique index source_items_fingerprint_unique_idx
  on public.source_items (fingerprint)
  where external_id is null;

create table public.lead_matches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'contacted', 'replied', 'follow_up', 'archived', 'not_a_fit')),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  category text,
  is_alex_like boolean not null default false,
  matched_keywords text[] not null default '{}'::text[],
  matched_rules text[] not null default '{}'::text[],
  reason text not null default '',
  recommended_action text not null default 'watch' check (recommended_action in ('ignore', 'watch', 'comment', 'dm_if_engaged', 'dm')),
  suggested_comment text,
  suggested_dm text,
  fit_summary text,
  risk_notes text,
  prompt_version text,
  model text,
  scored_at timestamptz,
  contacted_at timestamptz,
  replied_at timestamptz,
  follow_up_at timestamptz,
  last_touch_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, source_item_id)
);

create table public.lead_feedback (
  id uuid primary key default gen_random_uuid(),
  lead_match_id uuid not null references public.lead_matches(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('good_lead', 'not_a_lead', 'contacted', 'replied', 'wrong_keyword', 'wrong_subreddit', 'too_generic', 'not_buyer', 'job_post', 'low_budget', 'alex_like')),
  note text,
  created_at timestamptz not null default now()
);

create table public.lead_training_examples (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  source_item_id uuid references public.source_items(id) on delete set null,
  label text not null check (label in ('good_lead', 'alex_like', 'not_a_lead')),
  reason text not null default '',
  created_from text not null default 'manual' check (created_from in ('manual', 'feedback', 'import')),
  created_at timestamptz not null default now()
);

create table public.lead_scan_runs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.lead_products(id) on delete cascade,
  source text not null check (source in ('reddit_api', 'reddit_rss_fallback', 'manual_url', 'external_forum', 'job_board')),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  subreddits_scanned text[] not null default '{}'::text[],
  queries_scanned text[] not null default '{}'::text[],
  sources_scanned uuid[] not null default '{}'::uuid[],
  posts_seen integer not null default 0 check (posts_seen >= 0),
  candidates_scored integer not null default 0 check (candidates_scored >= 0),
  leads_created integer not null default 0 check (leads_created >= 0),
  rate_limit_remaining integer,
  prompt_version text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index lead_sources_product_status_idx on public.lead_sources (product_id, status, source_type);
create index lead_keywords_product_status_idx on public.lead_keywords (product_id, status, intent_type);
create index lead_rules_product_status_idx on public.lead_rules (product_id, status, rule_type);
create index source_items_source_collected_idx on public.source_items (source_id, collected_at desc);
create index source_items_published_idx on public.source_items (published_at desc);
create index lead_matches_product_status_score_idx on public.lead_matches (product_id, status, quality_score desc, created_at desc);
create index lead_matches_alex_like_idx on public.lead_matches (product_id, is_alex_like, quality_score desc) where is_alex_like = true;
create index lead_matches_follow_up_idx on public.lead_matches (product_id, follow_up_at) where follow_up_at is not null;
create index lead_feedback_match_idx on public.lead_feedback (lead_match_id, created_at desc);
create index lead_training_examples_product_label_idx on public.lead_training_examples (product_id, label);
create index lead_scan_runs_product_started_idx on public.lead_scan_runs (product_id, started_at desc);

alter table public.lead_products enable row level security;
alter table public.lead_sources enable row level security;
alter table public.lead_keywords enable row level security;
alter table public.lead_rules enable row level security;
alter table public.source_items enable row level security;
alter table public.lead_matches enable row level security;
alter table public.lead_feedback enable row level security;
alter table public.lead_training_examples enable row level security;
alter table public.lead_scan_runs enable row level security;

comment on table public.lead_products is 'Lead search product profiles for AI consulting lead generation.';
comment on table public.lead_sources is 'Monitored sources such as subreddits, Reddit searches, manual URLs, and future external communities.';
comment on table public.source_items is 'Canonical collected posts/comments/items across all lead sources.';
comment on table public.lead_matches is 'Scored lead opportunities generated from collected source items.';
comment on table public.lead_feedback is 'Manual feedback used to tune lead quality and follow-up workflow.';
comment on table public.lead_training_examples is 'Positive and negative examples used by the lead scoring prompt.';
comment on table public.lead_scan_runs is 'Scan execution history and diagnostics.';

insert into public.lead_products (
  name,
  site_url,
  problem,
  solution,
  target_users,
  geography,
  budget_fit,
  matching_mode,
  scan_frequency,
  min_quality_score,
  max_posts_per_source
) values (
  'AI workflow automation consultant for small businesses',
  'https://www.duncananderson.ca',
  'Small business owners and lean teams are stuck doing repetitive admin work in spreadsheets, inboxes, CRMs, PDFs, forms, and disconnected tools. They know the workflow is slowing them down but do not have an internal technical person to automate it.',
  'I design and build practical AI-assisted workflow automations, internal tools, and data pipelines that remove manual admin work from real business processes. Examples include lead intake, reporting, document processing, CRM cleanup, email triage, quoting, onboarding, and operations dashboards.',
  'Small business owners, founders, operators, agency owners, consultants, and service businesses who are asking how to automate a specific manual workflow, connect tools, clean up messy data, or replace repetitive admin tasks.',
  'United States, Canada, United Kingdom, Australia',
  'Must be able to pay for custom consulting or implementation.',
  'direct_requests',
  'manual',
  70,
  50
);

do $$
declare
  v_product_id uuid;
begin
  select id into v_product_id
  from public.lead_products
  where name = 'AI workflow automation consultant for small businesses'
  limit 1;

  insert into public.lead_sources (product_id, source_type, name, url, status, scan_frequency, notes)
  values
    (v_product_id, 'reddit_subreddit', 'smallbusiness', 'https://www.reddit.com/r/smallbusiness', 'active', 'manual', 'Small business owner workflow pain and admin bottlenecks.'),
    (v_product_id, 'reddit_subreddit', 'Entrepreneur', 'https://www.reddit.com/r/Entrepreneur', 'testing', 'manual', 'Founder/operator automation questions; watch for generic chatter.'),
    (v_product_id, 'reddit_subreddit', 'automation', 'https://www.reddit.com/r/automation', 'active', 'manual', 'Workflow automation questions and tool comparisons.'),
    (v_product_id, 'reddit_subreddit', 'Airtable', 'https://www.reddit.com/r/Airtable', 'active', 'manual', 'Airtable implementation, cleanup, and consulting opportunities.'),
    (v_product_id, 'reddit_subreddit', 'Zapier', 'https://www.reddit.com/r/Zapier', 'testing', 'manual', 'Zapier automation help requests.'),
    (v_product_id, 'reddit_subreddit', 'googlesheets', 'https://www.reddit.com/r/googlesheets', 'testing', 'manual', 'Spreadsheet automation pain.'),
    (v_product_id, 'reddit_subreddit', 'developers_hire', 'https://www.reddit.com/r/developers_hire', 'testing', 'manual', 'Explicit hiring posts; higher noise/competition.'),
    (v_product_id, 'reddit_subreddit', 'WholesaleRealestate', 'https://www.reddit.com/r/WholesaleRealestate', 'testing', 'manual', 'Real estate lead follow-up and operations workflows.'),
    (v_product_id, 'reddit_subreddit', 'bookkeeping', 'https://www.reddit.com/r/bookkeeping', 'testing', 'manual', 'Invoice/reporting/accounting workflow pain.'),
    (v_product_id, 'reddit_subreddit', 'Accounting', 'https://www.reddit.com/r/Accounting', 'testing', 'manual', 'Reporting and reconciliation workflow pain.'),
    (v_product_id, 'reddit_subreddit', 'propertymanagement', 'https://www.reddit.com/r/propertymanagement', 'testing', 'manual', 'Property operations and field workflow pain.'),
    (v_product_id, 'reddit_subreddit', 'realestateinvesting', 'https://www.reddit.com/r/realestateinvesting', 'testing', 'manual', 'Real estate operations and property workflow pain.'),
    (v_product_id, 'reddit_subreddit', 'sweatystartup', 'https://www.reddit.com/r/sweatystartup', 'testing', 'manual', 'Service business owner workflows.'),
    (v_product_id, 'reddit_subreddit', 'consulting', 'https://www.reddit.com/r/consulting', 'testing', 'manual', 'Reporting/proposal automation, often advice-first.'),
    (v_product_id, 'reddit_subreddit', 'businessowners', 'https://www.reddit.com/r/businessowners', 'testing', 'manual', 'Owner/operator workflow pain.')
  on conflict do nothing;

  insert into public.lead_keywords (product_id, phrase, status, intent_type, created_by)
  values
    (v_product_id, 'Airtable consultant', 'active', 'buying_intent', 'manual'),
    (v_product_id, 'Airtable workflow breaking', 'active', 'pain', 'manual'),
    (v_product_id, 'Airtable base cleanup', 'active', 'pain', 'manual'),
    (v_product_id, 'Airtable operations system', 'active', 'tool', 'manual'),
    (v_product_id, 'spreadsheet manual process', 'active', 'pain', 'manual'),
    (v_product_id, 'manual invoice processing', 'active', 'pain', 'manual'),
    (v_product_id, 'messy CRM', 'active', 'pain', 'manual'),
    (v_product_id, 'CRM cleanup', 'active', 'pain', 'manual'),
    (v_product_id, 'workflow automation consultant', 'active', 'buying_intent', 'manual'),
    (v_product_id, 'internal tool', 'active', 'tool', 'manual'),
    (v_product_id, 'operations dashboard', 'active', 'tool', 'manual'),
    (v_product_id, 'Google Sheets inventory tracking', 'active', 'tool', 'manual'),
    (v_product_id, 'PDF report automation', 'active', 'tool', 'manual'),
    (v_product_id, 'manual lead follow up', 'active', 'pain', 'manual'),
    (v_product_id, 'Zapier Airtable', 'active', 'tool', 'manual'),
    (v_product_id, 'Make.com Airtable', 'active', 'tool', 'manual'),
    (v_product_id, 'need someone to automate', 'active', 'buying_intent', 'manual'),
    (v_product_id, 'looking to hire automation', 'active', 'buying_intent', 'manual'),
    (v_product_id, 'paid help Airtable', 'active', 'buying_intent', 'manual'),
    (v_product_id, 'hire me', 'banned', 'negative', 'manual'),
    (v_product_id, 'for hire', 'banned', 'negative', 'manual'),
    (v_product_id, 'AI agency', 'banned', 'negative', 'manual'),
    (v_product_id, 'cold email', 'banned', 'negative', 'manual'),
    (v_product_id, 'course', 'banned', 'negative', 'manual'),
    (v_product_id, 'newsletter', 'banned', 'negative', 'manual'),
    (v_product_id, 'affiliate', 'banned', 'negative', 'manual'),
    (v_product_id, 'template', 'banned', 'negative', 'manual'),
    (v_product_id, 'white label', 'banned', 'negative', 'manual'),
    (v_product_id, 'lead gen agency', 'banned', 'negative', 'manual'),
    (v_product_id, 'SEO agency', 'banned', 'negative', 'manual'),
    (v_product_id, 'free audit', 'banned', 'negative', 'manual')
  on conflict do nothing;

  insert into public.lead_rules (product_id, rule_type, text, status, created_by)
  values
    (v_product_id, 'alex_like_pattern', 'Overweight owner/operator posts with an existing Airtable, spreadsheet, CRM, or internal workflow that is messy, breaking, or hard to use in the field.', 'active', 'manual'),
    (v_product_id, 'alex_like_pattern', 'Overweight property management, inventory, field operations, repair workflows, dispatch, client reporting, contractor coordination, and mobile workflow pain.', 'active', 'manual'),
    (v_product_id, 'positive_pattern', 'Direct paid requests for a consultant, builder, freelancer, or developer to fix a specific workflow are high priority.', 'active', 'manual'),
    (v_product_id, 'positive_pattern', 'Recurring admin workflows involving PDFs, reports, invoices, receipts, CRM cleanup, Airtable, Google Sheets, Zapier, Make, or n8n are relevant when tied to a real business process.', 'active', 'manual'),
    (v_product_id, 'not_a_lead_persona', 'People asking generic best-tool questions with no owned workflow pain, budget, implementation need, or business context.', 'active', 'manual'),
    (v_product_id, 'not_a_lead_persona', 'DIY builders or technical founders implementing automations themselves without intent to hire.', 'active', 'manual'),
    (v_product_id, 'not_a_lead_persona', 'Vendors, agencies, or freelancers promoting automation, AI, property-management, or operations software.', 'active', 'manual'),
    (v_product_id, 'not_a_lead_persona', 'Free-audit, cheap-gig, or low-budget task requests that do not support a custom engineering engagement.', 'active', 'manual'),
    (v_product_id, 'negative_pattern', 'Downweight full-time job posts unless they clearly support a consulting or fractional implementation opportunity.', 'active', 'manual'),
    (v_product_id, 'negative_pattern', 'Downweight broad AI curiosity or tool comparison threads unless the poster owns a painful workflow and there is a natural reason to reply.', 'active', 'manual')
  on conflict do nothing;
end $$;
;
