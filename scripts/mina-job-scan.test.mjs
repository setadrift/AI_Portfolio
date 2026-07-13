import assert from "node:assert/strict";
import test from "node:test";

import { isEligibleLocation, parseSalary, scoreJob } from "./mina-job-scan.mjs";

test("accepts Montréal Island locations regardless of work model", () => {
  assert.equal(isEligibleLocation("Pointe-Claire, QC", "", "on_site"), true);
  assert.equal(isEligibleLocation("Montréal, Québec", "", "hybrid"), true);
});

test("accepts Canada-remote roles and rejects non-remote or foreign locations", () => {
  assert.equal(isEligibleLocation("Toronto", "Remote-friendly Canadian team", "remote"), true);
  assert.equal(isEligibleLocation("Toronto", "Hybrid role", "hybrid"), false);
  assert.equal(isEligibleLocation("New York", "Remote team with Canadian offices", "remote"), false);
  assert.equal(isEligibleLocation("London", "Global remote-friendly company", "hybrid"), false);
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
