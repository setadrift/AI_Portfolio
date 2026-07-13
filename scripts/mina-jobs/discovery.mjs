import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const TRACKING_PARAMS = /^(utm_|gclid$|fbclid$|mc_|ref$|referrer$|source$|src$)/i;
const CLOSED_PATTERN = /(?:position|role|job|posting).{0,50}(?:has been filled|is no longer available|is closed|has expired)|no longer accepting applications/i;

export function freshnessFor(value, now = Date.now()) {
  const posted = Date.parse(value || "");
  if (Number.isNaN(posted)) return { bucket: "unknown", ageHours: null, queueEligible: false };
  const ageHours = Math.max(0, (now - posted) / 3_600_000);
  if (ageHours <= 24) return { bucket: "hot", ageHours, queueEligible: true };
  if (ageHours <= 72) return { bucket: "fresh", ageHours, queueEligible: true };
  if (ageHours <= 168) return { bucket: "recent", ageHours, queueEligible: true };
  if (ageHours <= 336) return { bucket: "aging", ageHours, queueEligible: false };
  return { bucket: "archive", ageHours, queueEligible: false };
}

export function qualityTier({ score, freshnessBucket, canonicalStatus }) {
  if (freshnessBucket === "archive" || canonicalStatus === "closed") return "archive";
  if (canonicalStatus !== "open") return "watch";
  if ((freshnessBucket === "hot" || freshnessBucket === "fresh") && score >= 80) return "priority";
  if (["hot", "fresh", "recent"].includes(freshnessBucket) && score >= 70) return "strong";
  return "watch";
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
}

export function discoveryFingerprint(candidate) {
  const stable = [
    candidate.sourceFamily,
    candidate.sourceName,
    candidate.sourceResultId || canonicalizeUrl(candidate.url),
  ].map(normalizeKey).join("|");
  return createHash("sha256").update(stable).digest("hex");
}

export function duplicateKey({ company, title, location, postedAt, canonicalUrl }) {
  const direct = canonicalizeUrl(canonicalUrl);
  const date = validDate(postedAt)?.slice(0, 10) || "unknown-date";
  const region = /montr[ée]al|qu[ée]bec|\bqc\b/i.test(location || "")
    ? "montreal"
    : /canada|remote/i.test(location || "") ? "canada" : normalizeKey(location);
  const basis = direct
    ? `url|${direct}`
    : `job|${normalizeKey(company)}|${normalizeKey(title)}|${region}|${date}`;
  return createHash("sha256").update(basis).digest("hex");
}

export function extractJobPosting(html, pageUrl = "") {
  const blocks = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
      collectJobPostings(parsed, blocks);
    } catch {
      // Malformed publisher JSON-LD is ignored; visible evidence remains available.
    }
  }
  const job = blocks[0] || null;
  if (!job) return null;
  const location = extractLocation(job.jobLocation) || extractApplicantLocation(job.applicantLocationRequirements);
  return {
    title: textValue(job.title),
    company: textValue(job.hiringOrganization?.name),
    location,
    description: textValue(job.description),
    postedAt: validDate(job.datePosted),
    updatedAt: validDate(job.dateModified),
    closesAt: validDate(job.validThrough),
    employmentType: Array.isArray(job.employmentType) ? job.employmentType.join(", ") : textValue(job.employmentType),
    canonicalUrl: canonicalizeUrl(job.url || pageUrl),
    identifier: textValue(job.identifier?.value || job.identifier),
    directApply: Boolean(job.directApply),
  };
}

export async function verifyCanonical(url, { timeoutMs = 8_000, maxBytes = 1_500_000, fetchImpl = null } = {}) {
  const requested = canonicalizeUrl(url);
  if (!requested) return verificationError("invalid_url", "Canonical URL must be public HTTP(S).");
  try {
    const response = await safeFetch(requested, { timeoutMs, maxBytes, fetchImpl });
    const html = response.body;
    const structured = extractJobPosting(html, response.url);
    const closed = response.status === 404 || response.status === 410 || CLOSED_PATTERN.test(stripHtml(html).slice(0, 30_000));
    return {
      ok: response.status >= 200 && response.status < 400 && !closed,
      status: closed ? "closed" : response.status >= 200 && response.status < 400 ? "open" : "error",
      httpStatus: response.status,
      canonicalUrl: structured?.canonicalUrl || response.url,
      structured,
      verifiedAt: new Date().toISOString(),
      error: response.status >= 400 && !closed ? `HTTP ${response.status}` : "",
    };
  } catch (error) {
    return verificationError("fetch_error", error instanceof Error ? error.message : String(error));
  }
}

async function safeFetch(initialUrl, { timeoutMs, maxBytes, fetchImpl }) {
  let current = initialUrl;
  const deadline = Date.now() + timeoutMs;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error("Canonical page timed out.");
    const addresses = await withTimeout(assertPublicUrl(current), remainingMs, "Canonical DNS lookup timed out.");
    const response = fetchImpl
      ? await fetchForTest(current, { timeoutMs: remainingMs, maxBytes, fetchImpl })
      : await requestPinned(current, addresses, { timeoutMs: remainingMs, maxBytes });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const target = response.headers.get("location");
      if (!target) throw new Error("Redirect did not include a destination.");
      current = canonicalizeUrl(new URL(target, current).toString());
      if (!current) throw new Error("Redirect target is not a valid public URL.");
      continue;
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) throw new Error("Canonical page exceeded the response-size limit.");
    return { status: response.status, url: canonicalizeUrl(response.url || current), body: response.body };
  }
  throw new Error("Canonical page exceeded the redirect limit.");
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function fetchForTest(url, { timeoutMs, maxBytes, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "MinaJobsResearch/2.0 (+public-job-verification)" },
    });
    return {
      status: response.status,
      url: response.url || url,
      headers: response.headers,
      body: await readLimitedBody(response, maxBytes),
    };
  } finally {
    clearTimeout(timer);
  }
}

function requestPinned(value, addresses, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    const url = new URL(value);
    const selected = addresses.find((entry) => Number(entry.family) === 4) || addresses[0];
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      callback(value);
    };
    const request = transport(url, {
      method: "GET",
      agent: false,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "MinaJobsResearch/2.0 (+public-job-verification)" },
      lookup(_hostname, _options, callback) {
        const resolved = { address: selected.address, family: selected.family || isIP(selected.address) };
        if (_options?.all) callback(null, [resolved]);
        else callback(null, resolved.address, resolved.family);
      },
    }, (response) => {
      const chunks = [];
      let total = 0;
      response.on("data", (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          response.destroy(new Error("Canonical page exceeded the response-size limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => finish(resolve, {
        status: response.statusCode || 0,
        url: value,
        headers: { get: (name) => response.headers[String(name).toLowerCase()] || null },
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      response.on("error", (error) => finish(reject, error));
    });
    const deadline = setTimeout(() => request.destroy(new Error("Canonical page timed out.")), timeoutMs);
    request.on("error", (error) => finish(reject, error));
    request.end();
  });
}

async function readLimitedBody(response, maxBytes) {
  if (!response.body?.getReader) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Canonical page exceeded the response-size limit.");
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}

async function assertPublicUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe canonical URL.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Local canonical hosts are blocked.");
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private or reserved canonical hosts are blocked.");
  return addresses;
}

function isPrivateAddress(address) {
  if (address.includes(":")) {
    const value = address.toLowerCase();
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("2001:db8") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
  }
  const octets = address.split(".").map(Number);
  if (octets.length !== 4) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function collectJobPostings(value, output) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((item) => collectJobPostings(item, output));
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some((type) => String(type).toLowerCase() === "jobposting")) output.push(value);
  if (value['@graph']) collectJobPostings(value['@graph'], output);
}

function extractLocation(jobLocation) {
  const values = Array.isArray(jobLocation) ? jobLocation : jobLocation ? [jobLocation] : [];
  return values.map((item) => {
    const address = item?.address || item;
    return [address?.addressLocality, address?.addressRegion, address?.addressCountry?.name || address?.addressCountry].filter(Boolean).join(", ");
  }).filter(Boolean).join(" / ");
}

function extractApplicantLocation(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => item?.name || item?.address?.addressCountry || "").filter(Boolean).join(" / ");
}

function verificationError(category, error) {
  return { ok: false, status: "error", httpStatus: null, canonicalUrl: "", structured: null, verifiedAt: new Date().toISOString(), category, error };
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function validDate(value) {
  const time = Date.parse(value || "");
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function textValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ");
}
