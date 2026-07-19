import assert from "node:assert/strict";
import test from "node:test";

import {
  isEligibleLocation,
  matchTargetRole,
} from "./profile.mjs";

test("matches Mina's English and French leadership title variants", () => {
  const expected = new Map([
    ["Senior HR Business Partner", "hr_business_partner"],
    ["Senior Business Partner, Human Resources", "hr_business_partner"],
    ["Senior HRBP", "hr_business_partner"],
    ["Senior Director, People Business Partner", "hr_business_partner"],
    ["Senior Manager, People Operations", "people_operations"],
    ["Senior Manager of Human Resources & People Operations", "people_operations"],
    ["People & Culture Director", "people_operations"],
    ["Manager, Talent Acquisition", "recruiting_manager"],
    ["Head of Talent Acquisition", "recruiting_manager"],
    ["Talent Acquisition Team Lead", "recruiting_manager"],
    ["Global Head of Talent Acquisition", "recruiting_manager"],
    ["Global Talent Acquisition Manager", "recruiting_manager"],
    ["International Recruitment & HR Manager", "recruiting_manager"],
    ["Talent Acquisition Partner", "recruiting_manager"],
    ["TA Manager - Manufacturing Specialty", "recruiting_manager"],
    ["Senior Talent Acquisition Advisor", "recruiting_manager"],
    ["Principal Recruiter", "recruiting_manager"],
    ["Senior Recruiter", "recruiting_manager"],
    ["Gestionnaire, Acquisition de talents", "recruiting_manager"],
    ["Partenaire en acquisition de talents", "recruiting_manager"],
    ["Recruteuse principale", "recruiting_manager"],
    ["Responsable du recrutement", "recruiting_manager"],
    ["Directeur/directrice du recrutement", "recruiting_manager"],
    ["Directeur/directrice des ressources humaines", "hr_manager"],
    ["Manager, Employer-Employee Relations", "hr_manager"],
    ["Director of Labour Relations", "hr_manager"],
    ["Directeur/directrice du personnel", "hr_manager"],
    ["Human Resources Manager", "hr_manager"],
    ["Directrice des ressources humaines", "hr_manager"],
    ["Partenaire d’affaires, Ressources humaines", "hr_business_partner"],
    ["Talent Operations Manager", "people_operations"],
    ["Employee Experience Manager", "people_operations"],
    ["Workforce Planning Manager", "people_operations"],
    ["HR Transformation Manager", "people_operations"],
  ]);

  for (const [title, family] of expected) {
    assert.equal(matchTargetRole(title)?.family, family, title);
  }
});

test("rejects junior, specialist, individual-contributor, and executive near misses", () => {
  for (const title of [
    "Talent Acquisition Coordinator",
    "Senior Talent Acquisition Specialist",
    "Corporate Recruiter",
    "Junior Corporate Recruiter",
    "Human Resources Generalist",
    "Employee Relations Specialist",
    "Learning and Development Manager",
    "Talent Management Manager",
    "Chief People Officer",
    "VP, Human Resources",
  ]) {
    assert.equal(matchTargetRole(title), null, title);
  }
});

test("accepts only Mina's Montréal, Canada-remote, and Canada-based global locations", () => {
  assert.equal(isEligibleLocation("Baie-d'Urfé, QC", "", "on_site"), true);
  assert.equal(isEligibleLocation("Westmount, QC", "", "on_site"), true);
  assert.equal(isEligibleLocation("Saint-Léonard, QC", "", "hybrid"), true);
  assert.equal(isEligibleLocation("", "This position is based in Montréal.", "unknown"), true);
  assert.equal(isEligibleLocation("Remote", "Candidates must be based in Canada.", "remote"), true);
  assert.equal(isEligibleLocation("Global", "This role is based in Montréal and requires international travel.", "unknown"), true);
  assert.equal(isEligibleLocation("Toronto, ON", "Hybrid role in our Toronto office.", "hybrid"), false);
  assert.equal(isEligibleLocation("Remote — New York, United States, Toronto", "Remote role based from either office.", "remote"), false);
  assert.equal(isEligibleLocation("Laval, QC", "On-site role.", "on_site"), false);
  assert.equal(isEligibleLocation("Longueuil, QC", "On-site role.", "on_site"), false);
  assert.equal(isEligibleLocation("Remote", "Work from anywhere.", "remote"), false);
  assert.equal(isEligibleLocation("New York, United States", "We have Canadian clients.", "remote"), false);
});
