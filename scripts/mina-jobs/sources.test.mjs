import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchDuckDuckGoSearch,
  fetchJobBank,
  fetchPublicWebSearch,
  fetchSmartRecruitersCompany,
  fetchWorkableAccount,
  fetchWorkdayBoard,
  parseDuckDuckGoResults,
  parseJobBankResults,
} from "./sources.mjs";

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

const DUCK_DUCK_GO_HTML = `
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fcae.wd3.myworkdayjobs.com%2Fen-US%2Fcareer%2Fjob%2FHR-Business-Partner_123">HR Business Partner</a></h2>
    <a class="result__snippet">Montreal, Quebec — advise leaders on workforce planning.</a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title"><a class="result__a" href="https://example.com/accounting">Senior Accountant</a></h2>
    <a class="result__snippet">Montreal</a>
  </div>`;

test("turns free public search results into canonical HR candidates", async () => {
  const query = { id: "workday", query: "site:myworkdayjobs.com HR Montreal", freshness: "month", language: "en" };
  const parsed = parseDuckDuckGoResults(DUCK_DUCK_GO_HTML, query);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].canonicalUrl, "https://cae.wd3.myworkdayjobs.com/en-US/career/job/HR-Business-Partner_123");
  assert.equal(parsed[0].location, "Montréal, QC");

  const result = await fetchDuckDuckGoSearch([query], async () => new Response(DUCK_DUCK_GO_HTML, { status: 200 }));
  assert.equal(result.queryResults[0].ok, true);
  assert.equal(result.jobs.length, 1);
});

test("reads relevant Workday postings and their canonical detail records", async () => {
  const result = await fetchWorkdayBoard({
    id: "example",
    company: "Example",
    host: "example.wd3.myworkdayjobs.com",
    tenant: "example",
    site: "Careers",
  }, async (url) => {
    if (String(url).endsWith("/jobs")) {
      return new Response(JSON.stringify({ jobPostings: [
        { title: "HR Business Partner", externalPath: "/job/Montreal/HR-Business-Partner_R1", locationsText: "Montreal", postedOn: "Posted 8 Days Ago" },
        { title: "Software Engineer", externalPath: "/job/Montreal/Engineer_R2", locationsText: "Montreal" },
      ] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      hiringOrganization: "Example",
      jobPostingInfo: {
        id: "1", jobReqId: "R1", title: "HR Business Partner", location: "Montréal, QC",
        jobDescription: "Bilingual workforce planning", startDate: "2026-07-01", timeType: "Full time",
        externalUrl: "https://example.wd3.myworkdayjobs.com/Careers/job/Montreal/HR-Business-Partner_R1",
        posted: true, canApply: true,
      },
    }), { status: 200 });
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].sourceJobId, "R1");
  assert.equal(result[0].canonicalTrustedOpen, true);
});

test("reads SmartRecruiters and Workable public employer feeds", async () => {
  const smart = await fetchSmartRecruitersCompany({ identifier: "Example", company: "Example" }, async (url) => {
    if (!String(url).match(/postings\/\d+$/)) {
      return new Response(JSON.stringify({ content: [{ id: "123", name: "Talent Acquisition Partner" }] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "123", name: "Talent Acquisition Partner", active: true,
      company: { name: "Example" }, location: { fullLocation: "Montreal, Quebec, Canada", hybrid: true },
      releasedDate: "2026-07-01T00:00:00Z", postingUrl: "https://jobs.smartrecruiters.com/Example/123-role",
      typeOfEmployment: { label: "Full-time" }, jobAd: { sections: { jobDescription: { text: "Recruiting strategy" } } },
    }), { status: 200 });
  });
  assert.equal(smart.length, 1);
  assert.equal(smart[0].workModel, "hybrid");

  const workable = await fetchWorkableAccount({ account: "example", company: "Example" }, async () => new Response(JSON.stringify({
    results: [{ id: 7, shortcode: "ABC123", title: "People Operations Manager", state: "published", remote: true,
      locations: [{ country: "Canada", city: "Montreal", region: "Quebec" }], published: "2026-07-01", type: "full", workplace: "remote" }],
  }), { status: 200 }));
  assert.equal(workable.length, 1);
  assert.equal(workable[0].location, "Remote — Canada");
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
