update public.mina_search_profiles
set
  target_roles = '["HR Business Partner", "Recruiting Manager", "HR Manager", "Global Talent Acquisition Manager", "International Recruitment & HR Manager"]'::jsonb,
  title_aliases = '["Senior HR Business Partner", "People Partner", "People Operations Manager", "Talent Acquisition Manager", "Recruitment Manager", "People & Culture Manager", "Global Talent Acquisition Lead", "International Recruitment Manager", "Global Recruiting Manager"]'::jsonb,
  preferred_industries = '["Fashion", "Cosmetics and beauty", "Athletic wear and sportswear", "Consumer brands", "Canadian businesses"]'::jsonb,
  updated_at = now()
where id = 'mina';

insert into public.mina_profile_evidence (id, category, label, detail, keywords, strength)
values
  ('global-recruiting', 'strategy', 'Global and international recruiting scope', 'Open to global talent-acquisition and international recruitment leadership roles, including roles requiring business travel.', '["global talent acquisition", "international recruitment", "global recruiting", "international hiring", "travel required"]', 5),
  ('consumer-brand-interest', 'preference', 'Consumer and Canadian brand preference', 'Prefers fashion, cosmetics and beauty, athletic wear and sportswear, other consumer brands, and Canadian businesses.', '["fashion", "apparel", "cosmetics", "beauty", "athletic wear", "sportswear", "consumer brand", "canadian company"]', 4)
on conflict (id) do update set
  category = excluded.category,
  label = excluded.label,
  detail = excluded.detail,
  keywords = excluded.keywords,
  strength = excluded.strength,
  updated_at = now();
