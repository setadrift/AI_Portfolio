import { canonicalizeUrl } from "../discovery.mjs";

export async function searchPublicJobs(request, { provider, fetchImpl = fetch }) {
  validateRequest(request);
  if (provider.name === "serpapi-google-jobs") {
    return searchSerpApi(request, provider.apiKey, fetchImpl);
  }
  if (provider.name === "brave-web") {
    return searchBrave(request, provider.apiKey, fetchImpl);
  }
  throw new Error(`Unsupported public job search provider: ${provider.name}`);
}

async function searchSerpApi(request, apiKey, fetchImpl) {
  if (!apiKey) throw new Error("SERPAPI_API_KEY is required.");
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", request.query);
  url.searchParams.set("location", request.location || "Canada");
  url.searchParams.set("gl", request.country?.toLowerCase() || "ca");
  url.searchParams.set("hl", request.language || "en");
  url.searchParams.set("api_key", apiKey);
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`SerpApi returned ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`SerpApi: ${payload.error}`);
  return (payload.jobs_results ?? []).slice(0, request.maxResults).map((job, index) => ({
    queryId: request.queryId,
    query: request.query,
    provider: "serpapi-google-jobs",
    sourceFamily: request.sourceFamily,
    rank: index + 1,
    title: String(job.title || ""),
    company: String(job.company_name || ""),
    location: String(job.location || ""),
    url: canonicalizeUrl(job.apply_options?.find((option) => option.link)?.link || job.related_links?.[0]?.link || job.share_link),
    snippet: String(job.description || "").slice(0, 4_000),
    displayedDate: String(job.detected_extensions?.posted_at || ""),
    structured: job.detected_extensions || {},
    requestedFreshness: request.freshness,
  })).filter((item) => item.url);
}

async function searchBrave(request, apiKey, fetchImpl) {
  if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is required.");
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", request.query);
  url.searchParams.set("country", request.country || "CA");
  url.searchParams.set("search_lang", request.language || "en");
  url.searchParams.set("freshness", request.freshness === "day" ? "pd" : "pw");
  url.searchParams.set("count", String(Math.min(20, request.maxResults)));
  const response = await fetchImpl(url, { headers: { Accept: "application/json", "X-Subscription-Token": apiKey } });
  if (!response.ok) throw new Error(`Brave Search returned ${response.status}`);
  const payload = await response.json();
  return (payload.web?.results ?? []).slice(0, request.maxResults).map((result, index) => ({
    queryId: request.queryId,
    query: request.query,
    provider: "brave-web",
    sourceFamily: request.sourceFamily,
    rank: index + 1,
    title: String(result.title || ""),
    company: "",
    location: "",
    url: canonicalizeUrl(result.url),
    snippet: String(result.description || "").slice(0, 4_000),
    displayedDate: String(result.age || result.page_age || ""),
    structured: {},
    requestedFreshness: request.freshness,
  })).filter((item) => item.url);
}

function validateRequest(request) {
  for (const key of ["queryId", "query", "freshness", "country", "language", "sourceFamily"]) {
    if (!String(request[key] || "").trim()) throw new Error(`searchPublicJobs requires ${key}.`);
  }
  if (!Number.isInteger(request.maxResults) || request.maxResults < 1 || request.maxResults > 100) {
    throw new Error("searchPublicJobs maxResults must be an integer from 1 to 100.");
  }
}
