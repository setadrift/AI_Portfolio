import assert from "node:assert/strict";
import test from "node:test";
import { buildRefreshPayload } from "./dashboard-refresh";

const bankHeader = "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$\n";
const files = [
  { name: "TheTraumaTherapyGroup_Appointments_20260701_20260722.csv", text: "id,location_name,start_at,end_at,patient_guid,patient_number,patient_prefix,patient_first_name,patient_preferred_name,patient_last_name,treatment_name,staff_member_name,break,insurance_state,state,first_visit,chart_status,notes_text,booked_at,arrived_at,booked_online,archived_at,no_show_at,cancelled_at,cancelled_reason,referral_source\n1,TTG,2026-07-02 10:00,2026-07-02 10:50,secret-guid,1,,Secret,,Patient,Individual Counselling,Gabriella Evans,false,,arrived,false,signed,,2026-07-01,2026-07-02,false,,,,,,\n" },
  { name: "Sales_20260701_20260722.csv", text: "Location,Purchase Date,Invoice Date,Patient Guid,Patient,Item,Staff Member,Payer,Invoice #,Income Category,Details,Status,Subtotal,Total,Collected,Balance\nTTG,2026-07-02,2026-07-02,secret-guid,Secret Patient,Session,Gabriella Evans,Patient,1,Treatment,,paid,175,175,175,0\n" },
  { name: "Shift_Report_20260722.csv", text: "Staff Name,Location Name,Date,Shift Total Hours,Shift Total Count,Break Total Hours,Break Total Count,Appointment Total Hours,Appointment Total Count\nGabriella Evans,,,10,1,0,0,8,8\n" },
  { name: "Compensation_Report_Details_20260722.csv", text: "Description,Invoice #,Purchase Date,Transaction Date,Payment Date,Practitioner,patient_guid,Patient,Referred To,Payment Method,Invoice Total,Collected Subtotal,Adjustments Owed to Staff Member,Collected Tax,Collected Total,Adjusted Total,Product Cost,Quantity,Income Category,Commission Rate,Referral Commission Rate,Commission Subtotal,Commission Total\nSession,1,2026-07-02,2026-07-02,2026-07-02,Gabriella Evans,secret-guid,Secret Patient,,Visa,175,175,0,0,175,175,0,1,Treatment,60,0,105,105\n" },
  { name: "Daily_Transaction_Report_20260722.csv", text: "Date,Payment Method,Total,Number of Transactions\nJuly 1 2026,Visa,97,1\nJuly 22 2026,Visa,0,0\n" },
  { name: "Jane_Payments_Payouts_Report_20260722.csv", text: "Jane Payments\nDate Created,Date Deposited,Payout Amount,Payout Status\nJuly 1 2026,July 3 2026,100,paid\nJuly 22 2026,July 23 2026,0,in_transit\n" },
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
  assert.equal(payload.therapists[0].bookings, 1);
  assert.equal(payload.sourceCoverage.filter((source) => source.role === "core").length, 4);
  assert.equal(payload.coverageCalendar.length, 22);
  assert.equal(payload.checks.some((check) => check.status === "FAIL"), false);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL"), false);
  assert.doesNotMatch(JSON.stringify(payload), /Secret Patient|secret-guid|\b123\b/);
});

test("TTG refresh fails closed when a required report is duplicated", () => {
  const payload = buildRefreshPayload([...files, files[0]]);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL" && issue.title.includes("Duplicate Jane appointments")), true);
});
