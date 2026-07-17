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
  assert.equal(freshnessFor("2026-06-20T18:00:00Z", NOW).bucket, "aging");
  assert.equal(freshnessFor("2026-05-29T18:00:00Z", NOW).bucket, "aging");
  assert.equal(freshnessFor("2026-05-29T18:00:00Z", NOW).queueEligible, false);
  assert.equal(freshnessFor("2026-06-20T18:00:00Z", NOW).queueEligible, true);
  assert.equal(freshnessFor("", NOW).bucket, "unknown");
});

test("rejects materially future-dated postings instead of promoting them as hot", () => {
  const future = freshnessFor("2026-07-15T18:00:00Z", NOW);
  assert.deepEqual(future, { bucket: "unknown", ageHours: null, queueEligible: false });
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
  assert.equal(isPostingExpired("2026-07-13T18:00:00Z", NOW), true);
  assert.equal(isPostingExpired("2026-08-01T00:00:00Z", NOW), false);
  assert.equal(isPostingExpired("", NOW), false);
});

test("fails closed when an injected fetch ignores abort and exceeds the deadline", async () => {
  const result = await Promise.race([
    verifyCanonical("https://93.184.216.34/jobs/slow", {
      timeoutMs: 20,
      fetchImpl: async () => new Promise(() => {}),
    }),
    new Promise((resolve) => setTimeout(() => resolve("test_deadline_exceeded"), 250)),
  ]);
  assert.notEqual(result, "test_deadline_exceeded");
  assert.equal(result.status, "error");
  assert.match(result.error, /timed out/i);
});

test("rejects streamed bodies that exceed the byte limit without trusting content-length", async () => {
  const result = await verifyCanonical("https://example.com/jobs/oversized", {
    maxBytes: 8,
    fetchImpl: async () => new Response("0123456789", { status: 200 }),
  });
  assert.equal(result.status, "error");
  assert.match(result.error, /response-size limit/i);
});

test("revalidates every redirect target before following it", async () => {
  let calls = 0;
  const result = await verifyCanonical("https://example.com/jobs/redirect", {
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/internal" } });
    },
  });
  assert.equal(result.status, "error");
  assert.equal(calls, 1);
  assert.match(result.error, /blocked/i);
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

test("verifies Workday canonical pages through the public CXS detail record", async () => {
  const result = await verifyCanonical(
    "https://cae.wd3.myworkdayjobs.com/en-US/career/job/Montreal/HR-Business-Partner_123",
    { fetchImpl: async (url) => {
      assert.match(String(url), /\/wday\/cxs\/cae\/career\/job\/Montreal\/HR-Business-Partner_123$/);
      return new Response(JSON.stringify({
        hiringOrganization: "CAE",
        jobPostingInfo: {
          id: "abc", jobReqId: "123", title: "HR Business Partner", location: "Montreal (St. Laurent)",
          jobDescription: "Workforce planning and employee relations", startDate: "2026-07-01",
          timeType: "Full time", posted: true, canApply: true,
        },
      }), { status: 200 });
    } },
  );
  assert.equal(result.status, "open");
  assert.equal(result.structured.company, "CAE");
  assert.equal(result.structured.postedAt, "2026-07-01T00:00:00.000Z");
});

test("verifies SmartRecruiters canonical pages through its public posting API", async () => {
  const result = await verifyCanonical(
    "https://jobs.smartrecruiters.com/NBCUniversal3/744000130043719-manager-human-resources",
    { fetchImpl: async (url) => {
      assert.equal(String(url), "https://api.smartrecruiters.com/v1/companies/NBCUniversal3/postings/744000130043719");
      return new Response(JSON.stringify({
        id: "744000130043719", name: "Manager, Human Resources", active: true,
        company: { name: "NBCUniversal" }, location: { fullLocation: "Montreal, QUEBEC, Canada" },
        releasedDate: "2026-06-03T16:03:56.092Z", typeOfEmployment: { label: "Full-time" },
        jobAd: { sections: { jobDescription: { text: "Lead HR support in Quebec" } } },
      }), { status: 200 });
    } },
  );
  assert.equal(result.status, "open");
  assert.equal(result.structured.location, "Montreal, QUEBEC, Canada");
});

test("notification retries produce the same durable dedupe key", () => {
  const first = notificationDedupeKey("job-1", "email", "recipient@example.com", "first_seen");
  const retry = notificationDedupeKey("job-1", "email", "recipient@example.com", "first_seen");
  const materialChange = notificationDedupeKey("job-1", "email", "recipient@example.com", "material_change");
  assert.equal(first, retry);
  assert.notEqual(first, materialChange);
});
