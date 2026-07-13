import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeUrl,
  extractJobPosting,
  freshnessFor,
  isDiscoveryOnlyUrl,
  isPostingExpired,
  qualityTier,
  verifyCanonical,
} from "./discovery.mjs";
import { notificationDedupeKey } from "./notify.mjs";

const NOW = Date.parse("2026-07-13T18:00:00Z");

test("classifies employer posting ages without using discovery time", () => {
  assert.equal(freshnessFor("2026-07-13T08:00:00Z", NOW).bucket, "hot");
  assert.equal(freshnessFor("2026-07-11T16:00:00Z", NOW).bucket, "fresh");
  assert.equal(freshnessFor("2026-07-07T18:00:00Z", NOW).bucket, "recent");
  assert.equal(freshnessFor("2026-05-29T18:00:00Z", NOW).bucket, "aging");
  assert.equal(freshnessFor("", NOW).bucket, "unknown");
});

test("only verified recent jobs can become priority or strong", () => {
  assert.equal(qualityTier({ score: 84, freshnessBucket: "hot", canonicalStatus: "open" }), "priority");
  assert.equal(qualityTier({ score: 84, freshnessBucket: "recent", canonicalStatus: "open" }), "strong");
  assert.equal(qualityTier({ score: 94, freshnessBucket: "unknown", canonicalStatus: "open" }), "watch");
  assert.equal(qualityTier({ score: 94, freshnessBucket: "hot", canonicalStatus: "unverified" }), "watch");
  assert.equal(qualityTier({ score: 94, freshnessBucket: "hot", canonicalStatus: "closed" }), "archive");
});

test("normalizes equivalent URLs and removes tracking parameters", () => {
  assert.equal(
    canonicalizeUrl("https://EXAMPLE.com/jobs//123/?utm_source=google&gclid=x#apply"),
    "https://example.com/jobs/123",
  );
  assert.equal(canonicalizeUrl("https://user:secret@example.com/jobs/1"), "");
});

test("distinguishes discovery pages from employer and ATS pages", () => {
  assert.equal(isDiscoveryOnlyUrl("https://www.linkedin.com/jobs/view/123"), true);
  assert.equal(isDiscoveryOnlyUrl("https://remotive.com/remote-jobs/hr/example"), true);
  assert.equal(isDiscoveryOnlyUrl("https://jobs.lever.co/example/123"), false);
  assert.equal(isDiscoveryOnlyUrl("https://careers.example.ca/jobs/123"), false);
});

test("extracts JobPosting evidence from JSON-LD", () => {
  const job = extractJobPosting(`
    <script type="application/ld+json">{
      "@context":"https://schema.org","@type":"JobPosting",
      "title":"HR Manager","datePosted":"2026-07-13",
      "validThrough":"2026-08-01","hiringOrganization":{"name":"Example"},
      "jobLocation":{"address":{"addressLocality":"Montréal","addressRegion":"QC","addressCountry":"CA"}}
    }</script>
  `, "https://example.com/jobs/1");
  assert.equal(job.title, "HR Manager");
  assert.equal(job.company, "Example");
  assert.match(job.location, /Montréal/);
  assert.equal(job.postedAt, "2026-07-13T00:00:00.000Z");
});

test("treats an expired employer validThrough date as closed evidence", () => {
  assert.equal(isPostingExpired("2026-07-12T23:59:59Z", NOW), true);
  assert.equal(isPostingExpired("2026-08-01T00:00:00Z", NOW), false);
  assert.equal(isPostingExpired("", NOW), false);
});

test("blocks private canonical hosts before making a request", async () => {
  let called = false;
  const result = await verifyCanonical("http://127.0.0.1/internal", {
    fetchImpl: async () => { called = true; throw new Error("must not run"); },
  });
  assert.equal(result.status, "error");
  assert.equal(called, false);
  assert.match(result.error, /blocked/i);
});

test("notification retries produce the same durable dedupe key", () => {
  const first = notificationDedupeKey("job-1", "email", "recipient@example.com", "first_seen");
  const retry = notificationDedupeKey("job-1", "email", "recipient@example.com", "first_seen");
  const materialChange = notificationDedupeKey("job-1", "email", "recipient@example.com", "material_change");
  assert.equal(first, retry);
  assert.notEqual(first, materialChange);
});
