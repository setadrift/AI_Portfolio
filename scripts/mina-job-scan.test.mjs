import assert from "node:assert/strict";
import test from "node:test";

import { canonicalIdentityMatches, fingerprint, isEligibleLocation, mergeCanonicalDuplicate, parseSalary, scoreJob, stripHtml } from "./mina-job-scan.mjs";
import { isRelevantRedditHiringPost } from "./mina-jobs/sources.mjs";

test("normalizes entity-encoded posting markup before storage", () => {
  const source =
    "&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;StackAdapt builds marketing tools &amp;amp; products.&lt;/p&gt;&lt;/div&gt;";

  assert.equal(stripHtml(source).trim(), "StackAdapt builds marketing tools & products.");
});

test("accepts Montréal Island locations regardless of work model", () => {
  assert.equal(isEligibleLocation("Pointe-Claire, QC", "", "on_site"), true);
  assert.equal(isEligibleLocation("Montréal, Québec", "", "hybrid"), true);
});

test("accepts Canada-remote roles and rejects non-remote or foreign locations", () => {
  assert.equal(isEligibleLocation("Toronto", "Remote-friendly Canadian team", "remote"), true);
  assert.equal(isEligibleLocation("Toronto", "Hybrid role", "hybrid"), false);
  assert.equal(isEligibleLocation("New York", "Remote team with Canadian offices", "remote"), false);
  assert.equal(isEligibleLocation("London", "Global remote-friendly company", "hybrid"), false);
  assert.equal(isEligibleLocation("Remote — Canada, United States, France", "", "remote"), true);
  assert.equal(
    isEligibleLocation("Global", "This role is based in Canada and requires international travel.", "unknown"),
    true,
  );
});

test("recognizes global recruitment titles and consumer-brand preferences", () => {
  const job = scoreJob({
    source: "test",
    sourceJobId: "global-1",
    canonicalUrl: "https://example.com/job/global-1",
    applyUrl: "https://example.com/job/global-1",
    title: "Global Talent Acquisition Manager",
    company: "Canadian Athletic Wear Co",
    location: "Global",
    workModel: "unknown",
    employmentType: "Full-time",
    description: "Canada-based fashion and sportswear business. Lead international recruitment. International travel required.",
    compensationText: "$115,000–$135,000 CAD",
    postedAt: new Date().toISOString(),
    closesAt: "",
    evidence: { provider: "test" },
  });

  assert.ok(job);
  assert.equal(job.role_family, "recruiting_manager");
  assert.ok(job.fit_reasons.some((reason) => reason.includes("consumer brands")));
  assert.ok(job.fit_reasons.some((reason) => reason.includes("international recruiting")));
  assert.ok(job.fit_reasons.some((reason) => reason.includes("travel")));
});

test("parses encoded CAD ranges and preserves USD currency", () => {
  assert.deepEqual(parseSalary("$100,000&lt;/span&gt;&lt;span&gt;&amp;mdash;&lt;/span&gt;&lt;span&gt;$150,000 CAD"), {
    min: 10_000_000,
    max: 15_000_000,
    currency: "CAD",
  });
  assert.deepEqual(parseSalary("Base compensation $130,000 - $240,000 USD"), {
    min: 13_000_000,
    max: 24_000_000,
    currency: "USD",
  });
  assert.deepEqual(parseSalary("Salaire annuel : 110 000 $ à 130 000 $ CAD"), {
    min: 11_000_000,
    max: 13_000_000,
    currency: "CAD",
  });
});

test("recognizes English title inversion and French Montréal titles", () => {
  for (const [title, expectedFamily] of [
    ["Manager, Talent Acquisition", "recruiting_manager"],
    ["Gestionnaire, acquisition de talents", "recruiting_manager"],
    ["Partenaire d’affaires, ressources humaines", "hr_business_partner"],
    ["Gestionnaire des ressources humaines", "hr_manager"],
    ["Head of People", "people_operations"],
    ["Talent Acquisition Lead", "recruiting_manager"],
    ["Responsable du recrutement", "recruiting_manager"],
  ]) {
    const job = scoreJob({
      source: "test",
      sourceJobId: title,
      canonicalUrl: "https://example.com/job/title-test",
      applyUrl: "https://example.com/job/title-test",
      title,
      company: "Entreprise Montréal",
      location: "Montréal, QC",
      workModel: "on_site",
      employmentType: "Temps plein",
      description: "Poste bilingue en français et en anglais.",
      compensationText: "110 000 $ à 130 000 $ CAD",
      postedAt: new Date().toISOString(),
      closesAt: "",
      evidence: { provider: "test" },
    });
    assert.ok(job, title);
    assert.equal(job.role_family, expectedFamily, title);
  }
});

test("uses CV evidence and flags an unlisted required designation", () => {
  const job = scoreJob({
    source: "test",
    sourceJobId: "1",
    canonicalUrl: "https://example.com/job/1",
    applyUrl: "https://example.com/job/1",
    title: "Senior HR Business Partner",
    company: "Example",
    location: "Montréal, QC",
    workModel: "hybrid",
    employmentType: "Full-time",
    description: "Bilingual French and English. Employee relations, workforce planning, talent strategy and SuccessFactors. CRHA required.",
    compensationText: "$110,000–$130,000 CAD",
    postedAt: new Date().toISOString(),
    closesAt: "",
    evidence: { provider: "test" },
  });

  assert.ok(job);
  assert.equal(job.salary_currency, "CAD");
  assert.equal(job.salary_min_cents, 11_000_000);
  assert.ok(job.fit_reasons.some((reason) => reason.includes("bilingual")));
  assert.ok(job.flags.includes("CRHA/CHRP required; not listed on the CV"));
});

test("deduplicates equivalent Canada-remote locations within a posting week", () => {
  const first = fingerprint("Example Inc.", "Senior HR Business Partner", "Canada", "2026-07-13T08:00:00Z");
  const second = fingerprint("Example Inc", "Senior HR Business Partner", "Remote — Canada", "2026-07-14T08:00:00Z");
  assert.equal(first, second);
});

test("keeps direct employer data when the same canonical job arrives from search", () => {
  const existing = {
    source: "greenhouse:example",
    source_job_id: "123",
    job_fingerprint: "direct-fingerprint",
    canonical_url: "https://example.com/jobs/123",
    apply_url: "https://example.com/jobs/123",
    title: "Senior HR Business Partner",
    company: "Example",
    description: "Complete employer description",
    canonical_status: "open",
    source_posted_at: "2026-07-10T12:00:00.000Z",
    posted_at: "2026-07-10T12:00:00.000Z",
    first_seen_at: "2026-07-10T13:00:00.000Z",
    active: true,
  };
  const discovery = {
    source: "serpapi:google-jobs",
    source_job_id: "search-result",
    job_fingerprint: "search-fingerprint",
    canonical_url: "https://example.com/jobs/123",
    apply_url: "https://example.com/jobs/123?utm_source=search",
    title: "HRBP",
    company: "Example Inc.",
    description: "Short search snippet",
    canonical_status: "open",
    source_posted_at: "2026-07-11T12:00:00.000Z",
    posted_at: "2026-07-11T12:00:00.000Z",
    last_seen_at: "2026-07-13T12:00:00.000Z",
    updated_at: "2026-07-13T12:00:00.000Z",
  };

  const merged = mergeCanonicalDuplicate(existing, discovery, "whole_web");
  assert.equal(merged.job_fingerprint, "direct-fingerprint");
  assert.equal(merged.title, "Senior HR Business Partner");
  assert.equal(merged.description, "Complete employer description");
  assert.equal(merged.source_posted_at, "2026-07-10T12:00:00.000Z");
  assert.equal(merged._discovery.source, "serpapi:google-jobs");
});

test("rejects a canonical page for a different role or employer", () => {
  assert.equal(canonicalIdentityMatches(
    { title: "Senior HR Business Partner", company: "Example Inc." },
    { title: "Senior HR Business Partner", company: "Example" },
  ), true);
  assert.equal(canonicalIdentityMatches(
    { title: "Senior HR Business Partner", company: "Example" },
    { title: "Software Engineering Manager", company: "Example" },
  ), false);
  assert.equal(canonicalIdentityMatches(
    { title: "Senior HR Business Partner", company: "Example" },
    { title: "Senior HR Business Partner", company: "Different Employer" },
  ), false);
});

test("keeps an unverified automated job out of the active board", () => {
  const job = scoreJob({
    source: "search:test",
    sourceJobId: "unverified",
    canonicalUrl: "https://example.com/jobs/unverified",
    applyUrl: "https://example.com/jobs/unverified",
    title: "Senior HR Business Partner",
    company: "Example",
    location: "Montréal, QC",
    workModel: "hybrid",
    employmentType: "Full-time",
    description: "Bilingual employee relations and workforce planning role.",
    compensationText: "$110,000 CAD",
    postedAt: new Date().toISOString(),
    canonicalStatus: "error",
    evidence: { provider: "test" },
  });
  assert.ok(job);
  assert.equal(job.quality_tier, "watch");
  assert.equal(job.active, false);
});

test("keeps genuine Reddit hiring links and rejects job-seeker chatter", () => {
  assert.equal(isRelevantRedditHiringPost({
    title: "We're hiring: Talent Acquisition Manager in Canada",
    selftext: "See our careers page and apply here.",
  }), true);
  assert.equal(isRelevantRedditHiringPost({
    title: "HR professional looking for a job",
    selftext: "Here is my resume. Any career advice?",
  }), false);
});
