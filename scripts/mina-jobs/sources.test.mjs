import assert from "node:assert/strict";
import test from "node:test";

import { fetchJobBank, fetchPublicWebSearch, parseJobBankResults } from "./sources.mjs";

test("runs every selected market query, keeps successes, and deduplicates URLs", async () => {
  const queries = [
    { id: "q-1", query: "HR Business Partner Montreal", freshness: "week", language: "en", locationModel: "montreal_island", family: "core" },
    { id: "q-2", query: "People Partner Montreal", freshness: "week", language: "en", locationModel: "montreal_island", family: "core" },
    { id: "q-3", query: "fail this query", freshness: "week", language: "en", locationModel: "canada", family: "core" },
  ];
  const result = await fetchPublicWebSearch("brave-web", "test-key", queries, queries.length, async (url) => {
    const query = new URL(url).searchParams.get("q");
    if (query.includes("fail")) return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({
      web: {
        results: [{
          title: "Senior HR Business Partner",
          url: "https://jobs.lever.co/example/123?utm_source=search",
          description: "Montréal, Canada",
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  assert.equal(result.queryResults.length, 3);
  assert.equal(result.queryResults.filter((query) => query.ok).length, 2);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].canonicalUrl, "https://jobs.lever.co/example/123");
});

const JOB_BANK_HTML = `<!doctype html><html><head>
  <meta name="description" content="View 1 job posting near various occupations on Job Bank, Canada’s one-stop job board.">
</head><body>
  <article id="article-49871562"><a class="resultJobItem" href="/jobsearch/jobposting/49871562?source=searchresults">
    <h3><span class="flag"><span class="telework">Remote work available</span></span>
      <span class="noctitle"> Directeur/directrice des ressources humaines </span></h3>
    <ul><li class="date">July 09, 2026</li><li class="business">Beauté &amp; Cie</li>
      <li class="location"><span>Location</span> Remote — Canada</li>
      <li class="salary"><span>Salary</span> $107,000.00 to $125,000.00 annually</li></ul>
  </a></article>
</body></html>`;

test("parses current Job Bank cards into trustworthy canonical candidates", () => {
  const [job] = parseJobBankResults(JOB_BANK_HTML, { id: "jobbank-test", noc: "10011", remote: true });
  assert.equal(job.sourceJobId, "49871562");
  assert.equal(job.title, "Directeur/directrice des ressources humaines");
  assert.equal(job.company, "Beauté & Cie");
  assert.equal(job.location, "Remote — Canada");
  assert.equal(job.workModel, "remote");
  assert.equal(job.compensationText, "$107,000.00 to $125,000.00 annually");
  assert.equal(job.canonicalUrl, "https://www.jobbank.gc.ca/jobsearch/jobposting/49871562");
  assert.equal(job.canonicalTrustedOpen, true);
});

test("records every configured Job Bank market query", async () => {
  const queries = [
    { id: "jobbank-qc", noc: "10011", province: "QC" },
    { id: "jobbank-remote", noc: "11200", remote: true },
  ];
  const requested = [];
  const result = await fetchJobBank(async (url) => {
    requested.push(new URL(url));
    return new Response(JOB_BANK_HTML, { status: 200 });
  }, queries);

  assert.equal(result.queryResults.length, 2);
  assert.equal(result.queryResults.every((query) => query.ok), true);
  assert.equal(requested.length, 2);
  assert.equal(requested[0].searchParams.get("fn21"), "10011");
  assert.equal(requested[0].searchParams.get("fprov"), "QC");
  assert.equal(requested[1].searchParams.get("fskl"), "100000");
  assert.equal(result.jobs.length, 1);
});

test("marks a Job Bank query failed when the reported cards cannot be parsed", async () => {
  const result = await fetchJobBank(async () => new Response(
    '<meta name="description" content="View 1 job posting near various occupations on Job Bank, Canada’s one-stop job board.">',
    { status: 200 },
  ), [{ id: "jobbank-parser-change", noc: "10011", province: "QC" }]);

  assert.equal(result.queryResults[0].ok, false);
  assert.match(result.queryResults[0].error, /reported 1 results but only 0 job cards were parsed/);
  assert.equal(result.jobs.length, 0);
});
