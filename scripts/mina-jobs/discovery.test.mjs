import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeUrl,
  extractJobPosting,
  freshnessFor,
  qualityTier,
  verifyCanonical,
} from "./discovery.mjs";
import { notificationDedupeKey } from "./notify.mjs";

const NOW = Date.parse("2026-07-13T18:00:00Z");

test("classifies employer posting ages without using discovery time", () => {
  assert.equal(freshnessFor("2026-07-13T08:00:00Z", NOW).bucket, "hot");
  assert.equal(freshnessFor("2026-07-11T16:00:00Z", NOW).bucket, "fresh");
  assert.equal(freshnessFor("2026-07-07T18:00:00Z", NOW).bucket, "recent");
  assert.equal(freshnessFor("2026-05-29T18:00:00Z", NOW).bucket, "archive");
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
