update public.mina_search_profiles
set
  title_aliases = '["Senior HR Business Partner", "People Partner", "People Operations Manager", "Talent Acquisition Manager", "Recruitment Manager", "People & Culture Manager", "Global Talent Acquisition Lead", "International Recruitment Manager", "Global Recruiting Manager", "Gestionnaire, acquisition de talents", "Partenaire d''affaires, ressources humaines", "Gestionnaire des ressources humaines"]'::jsonb,
  updated_at = now()
where id = 'mina';
