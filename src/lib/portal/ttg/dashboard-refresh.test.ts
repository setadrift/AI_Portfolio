import assert from "node:assert/strict";
import test from "node:test";
import { buildRefreshPayload } from "./dashboard-refresh";

const bankHeader = "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$\n";
const files = [
  { name: "Sales_20260701_20260722.csv", text: "Location,Purchase Date,Invoice Date,Patient Guid,Patient,Item,Staff Member,Payer,Invoice #,Income Category,Details,Status,Subtotal,Total,Collected,Balance\nTTG,2026-07-02,2026-07-02,secret-guid,Secret Patient,Session,Gabriella Evans,Patient,1,Treatment,,paid,175,175,175,0\n" },
  { name: "Shift_Report_20260722.csv", text: "Staff Name,Location Name,Date,Shift Total Hours,Shift Total Count,Break Total Hours,Break Total Count,Appointment Total Hours,Appointment Total Count\nGabriella Evans,,,10,1,0,0,8,8\n" },
  { name: "Compensation_Report_Details_20260722.csv", text: "Description,Invoice #,Purchase Date,Transaction Date,Payment Date,Practitioner,patient_guid,Patient,Referred To,Payment Method,Invoice Total,Collected Subtotal,Adjustments Owed to Staff Member,Collected Tax,Collected Total,Adjusted Total,Product Cost,Quantity,Income Category,Commission Rate,Referral Commission Rate,Commission Subtotal,Commission Total\nSession,1,2026-07-02,2026-07-02,2026-07-02,Gabriella Evans,secret-guid,Secret Patient,,Visa,175,175,0,0,175,175,0,1,Treatment,60,0,105,105\n" },
  { name: "Jane_Payments_Payouts_Report_20260722.csv", text: "Jane Payments\nDate Created,Date Deposited,Payout Amount,Payout Status\nJuly 2 2026,July 3 2026,100,paid\n" },
  { name: "07-2026 Chequing Account.csv", text: `${bankHeader}Chequing,123,7/3/2026,,,Jane payout,100,\nChequing,123,7/4/2026,,,WAGEPOINT,-10,\nChequing,123,7/22/2026,,,Coverage marker,0,\n` },
  { name: "07-2026 Contractor Pay Account.csv", text: bankHeader },
  { name: "07-2026 Mastercard.csv", text: bankHeader },
  { name: "07-2026 Peace of Mind Account.csv", text: bankHeader },
  { name: "07-2026 Profit Account.csv", text: bankHeader },
];

test("TTG refresh aggregates the proven Jane and bank schemas without retaining PHI", () => {
  const payload = buildRefreshPayload(files);
  assert.equal(payload.periodLabel, "July 2026 MTD");
  assert.equal(payload.monthly.grossRevenue, 175);
  assert.equal(payload.monthly.operatingExpenses, 10);
  assert.equal(payload.therapists[0].compensation, 105);
  assert.equal(payload.checks.every((check) => check.status === "PASS"), true);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL"), false);
  assert.doesNotMatch(JSON.stringify(payload), /Secret Patient|secret-guid|\b123\b/);
});

test("TTG refresh fails closed when a required report is duplicated", () => {
  const payload = buildRefreshPayload([...files, files[0]]);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL" && issue.title.includes("Duplicate Jane sales")), true);
});
