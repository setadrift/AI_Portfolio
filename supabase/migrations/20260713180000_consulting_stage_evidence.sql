alter table public.consulting_opportunities
  add column if not exists message_angle text not null default '',
  add column if not exists proposal_reference text;

insert into public.consulting_offers (slug, name, active, buyer, outcome, deliverables, pricing_model, conversion_path)
values ('custom-scope', 'Custom scope', true, 'A buyer whose validated need does not fit a productized entry offer.', 'A deliberately scoped engagement with explicit controls, evidence, and handoff.', '[]'::jsonb, 'custom', 'Review after delivery')
on conflict (slug) do update set name = excluded.name, active = excluded.active, buyer = excluded.buyer, outcome = excluded.outcome;
