const EXECUTIVE_TITLE = /\b(?:chief (?:people|human resources) officer|chro|vice president|vp)\b/;

const ROLE_PATTERNS = [
  {
    family: "hr_business_partner",
    alias: "HR or People business partner",
    patterns: [
      /\b(?:hr|human resources|people) business partner\b/,
      /\b(?:senior )?hrbp\b/,
      /\bpeople partner\b/,
      /\bpeople and culture business partner\b/,
      /\bpartenaire d affaires(?: en)? (?:ressources humaines|rh)\b/,
    ],
  },
  {
    family: "people_operations",
    alias: "People operations or culture leadership",
    patterns: [
      /\b(?:senior )?(?:manager|lead|director|head)(?: of)? (?:human resources and )?people (?:operations|and culture)\b/,
      /\bpeople (?:operations|and culture) (?:manager|lead|director|head)\b/,
      /\bhead of people\b/,
      /\b(?:gestionnaire|responsable|chef|directeur|directrice)(?: de la| des)? (?:culture|operations) (?:et|des) (?:personnes|talents)\b/,
    ],
  },
  {
    family: "recruiting_manager",
    alias: "Talent acquisition or recruitment leadership",
    patterns: [
      /\b(?:senior )?(?:manager|lead|director|head)(?: of)? (?:global )?(?:talent acquisition|recruiting|recruitment)\b/,
      /\bglobal (?:manager|lead|director|head)(?: of)? talent acquisition\b/,
      /\b(?:global )?(?:talent acquisition|recruiting|recruitment)(?: and (?:hr|human resources))? (?:manager|(?:team )?lead|director|head)\b/,
      /\binternational recruitment(?: and (?:hr|human resources))? (?:manager|lead|director|head)\b/,
      /\b(?:gestionnaire|responsable|chef|directeur|directrice)(?: de l)? acquisition de talents\b/,
      /\bresponsable du recrutement\b/,
      /\bdirection recrutement\b/,
      /\bdirecteur directrice du recrutement\b/,
    ],
  },
  {
    family: "hr_manager",
    alias: "Human resources leadership",
    patterns: [
      /\b(?:senior )?(?:hr|human resources)(?: operations)? (?:manager|director|lead|head)\b/,
      /\b(?:senior )?(?:manager|director|lead|head)(?: of)? (?:hr|human resources)\b/,
      /\b(?:gestionnaire|responsable|chef|directeur|directrice)(?: des)? ressources humaines\b/,
      /\bdirection des ressources humaines\b/,
      /\bdirecteur directrice des ressources humaines\b/,
      /\b(?:manager|director|lead|head)(?: of)? (?:employee|employer employee|labour|labor) relations\b/,
      /\b(?:employee|employer employee|labour|labor) relations (?:manager|director|lead|head)\b/,
      /\b(?:director|head)(?: of)? personnel\b/,
      /\b(?:gestionnaire|responsable|chef|directeur|directrice)(?: des| de| du)? relations (?:de travail|avec les employes|employes)\b/,
      /\bdirecteur directrice du personnel\b/,
    ],
  },
];

const MONTREAL_ISLAND = /\b(?:montreal|west island|westmount|dorval|saint laurent|saint leonard|verdun|lasalle|lachine|outremont|mont royal|cote saint luc|pointe claire|kirkland|beaconsfield|dollard des ormeaux|baie d urfe|sainte anne de bellevue|ile dorval|hampstead|montreal west|senneville|anjou|ahuntsic|cartierville|cote des neiges|notre dame de grace|ile bizard|sainte genevieve|mercier hochelaga maisonneuve|hochelaga maisonneuve|pierrefonds|roxboro|riviere des prairies|pointe aux trembles|rosemont|petite patrie|villeray|saint michel|parc extension|plateau mont royal|ville marie)\b/;

export function matchTargetRole(title) {
  const normalized = normalize(title);
  if (!normalized || EXECUTIVE_TITLE.test(normalized)) return null;
  for (const role of ROLE_PATTERNS) {
    if (role.patterns.some((pattern) => pattern.test(normalized))) {
      return { family: role.family, alias: role.alias };
    }
  }
  return null;
}

export function classifyTargetRole(title) {
  return matchTargetRole(title)?.family || "other";
}

export function isEligibleLocation(location, description = "", workModel = "unknown") {
  const normalizedLocation = normalize(location);
  const locationCanUseDescription = !normalizedLocation
    || /^(?:canada|quebec|remote|global|multiple locations|location not listed)$/.test(normalizedLocation);
  return isMontrealIsland(location)
    || (locationCanUseDescription && isMontrealIsland(stripHtml(description).slice(0, 8_000)))
    || isRemoteCanada(location, description, workModel)
    || isCanadaBasedGlobalRole(location, description);
}

export function isMontrealIsland(location) {
  return MONTREAL_ISLAND.test(normalize(location));
}

export function isRemoteCanada(location, description = "", workModel = "unknown") {
  const normalizedLocation = normalize(location);
  const normalizedDescription = normalize(stripHtml(description).slice(0, 8_000));
  const remote = workModel === "remote" || /\b(?:remote|work from home)\b/.test(normalizedLocation);
  if (!remote) return false;

  const locationIncludesCanada = /\b(?:canada|canadian)\b/.test(normalizedLocation);
  const descriptionConfirmsCanada = /\b(?:candidates?|applicants?)(?: must be| may be| can be| are)? (?:located|based|living) in canada\b|\banywhere in canada\b|\bremote (?:in|within|across) canada\b|\bcanada remote\b/.test(normalizedDescription);
  const locationIsForeignOnly = /\b(?:united states|usa|us only|new york|united kingdom|uk only|london)\b/.test(normalizedLocation)
    && !locationIncludesCanada;
  return (locationIncludesCanada || descriptionConfirmsCanada) && !locationIsForeignOnly;
}

export function isCanadaBasedGlobalRole(location, description = "") {
  if (!/\b(?:global|international|multiple locations)\b/.test(normalize(location))) return false;
  const normalizedDescription = normalize(stripHtml(description).slice(0, 8_000));
  return /\b(?:based|located) in (?:canada|montreal)|\b(?:canada|montreal) based\b/.test(normalizedDescription);
}

export function normalizeProfileText(value) {
  return normalize(value);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}
