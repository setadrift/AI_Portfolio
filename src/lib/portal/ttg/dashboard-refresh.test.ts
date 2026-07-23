import assert from "node:assert/strict";
import test from "node:test";
import { buildRefreshPayload } from "./dashboard-refresh";

const bankHeader = "Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$\n";
const files = [
  { name: "TheTraumaTherapyGroup_Appointments_20260701_20260722.csv", text: "id,location_name,start_at,end_at,patient_guid,patient_number,patient_prefix,patient_first_name,patient_preferred_name,patient_last_name,treatment_name,staff_member_name,break,insurance_state,state,first_visit,chart_status,notes_text,booked_at,arrived_at,booked_online,archived_at,no_show_at,cancelled_at,cancelled_reason,referral_source\n1,TTG,2026-07-02 10:00,2026-07-02 10:50,secret-guid,1,,Secret,,Patient,Individual Counselling,Gabriella Evans,false,,arrived,false,signed,,2026-07-01,2026-07-02,false,,,,,,\n" },
  { name: "Sales_20260701_20260722.csv", text: "Location,Purchase Date,Invoice Date,Patient Guid,Patient,Item,Staff Member,Payer,Invoice #,Income Category,Details,Status,Subtotal,Total,Collected,Balance\nTTG,2026-07-02,2026-07-02,secret-guid,Secret Patient,Session,Gabriella Evans,Secret Patient,1,Treatment,,paid,175,175,175,0\n" },
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
  assert.equal(payload.refreshType, "full");
  assert.equal(payload.periodLabel, "July 2026 MTD");
  assert.equal(payload.monthly.grossRevenue, 175);
  assert.equal(payload.monthly.operatingExpenses, 10);
  assert.equal(payload.therapists[0].compensation, 105);
  assert.equal(payload.therapists[0].bookings, 1);
  assert.equal(payload.analytics?.appointments.total, 1);
  assert.equal(payload.analytics?.appointments.completed, 1);
  assert.equal(payload.analytics?.financial.invoiceCount, 1);
  const clinicDay = payload.analyticsRows.find((row) => row.entity === "clinic" && row.date === "2026-07-02");
  assert.equal(clinicDay?.completedTransactions, 1);
  assert.equal(clinicDay?.completedTransactionValue, 175);
  assert.equal(payload.analytics?.patients.total, 1);
  assert.equal(payload.analytics?.patients.historyAvailable, false);
  assert.equal(payload.sourceCoverage.filter((source) => source.role === "core").length, 4);
  assert.equal(payload.coverageCalendar.length, 22);
  assert.equal(payload.checks.some((check) => check.status === "FAIL"), false);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL"), false);
  assert.equal(payload.privateFacts?.appointments.length, 1);
  assert.match(payload.privateFacts?.appointments[0].patientKey ?? "", /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(payload), /Secret Patient|secret-guid|\b123\b/);
});

test("TTG refresh de-duplicates overlapping historical report rows", () => {
  const payload = buildRefreshPayload([...files, files[0]]);
  assert.equal(payload.issues.some((issue) => issue.status === "WARNING" && issue.title.includes("de-duplicated")), true);
  assert.equal(payload.analytics?.appointments.total, 1);
  assert.equal(payload.monthly.grossRevenue, 175);
});

test("appointment completion includes Jane in-progress states like AdminFlow", () => {
  const appointments = {
    ...files[0],
    text: files[0].text.replace(",arrived,false,", ",in-progress,false,"),
  };
  const payload = buildRefreshPayload([appointments, files[1], files[3], files[4]]);
  assert.equal(payload.analytics?.appointments.total, 1);
  assert.equal(payload.analytics?.appointments.completed, 1);
  assert.equal(payload.analytics?.appointments.pending, 0);
});

test("TTG refresh accepts the four AdminFlow core reports without supplemental or bank files", () => {
  const payload = buildRefreshPayload([files[0], files[1], files[3], files[4]]);
  assert.equal(payload.refreshType, "jane");
  assert.equal(payload.bankRows, 0);
  assert.equal(payload.bankCoverage, "Bank data unchanged");
  assert.equal(payload.issues.some((issue) => issue.title.toLowerCase().includes("bank")), false);
  assert.equal(payload.checks.some((check) => check.check.toLowerCase().includes("bank")), false);
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL"), false);
});

test("TTG refresh rejects an incomplete bank package instead of zeroing missing accounts", () => {
  const payload = buildRefreshPayload([...files.slice(0, 6), files[6]]);
  assert.equal(payload.refreshType, "full");
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL" && issue.title.includes("Incomplete bank package")), true);
});

test("TTG refresh accepts a one-day Jane package and anchors it to the latest month", () => {
  const oneDay = files.slice(0, 6).map((file) => file.name.startsWith("Sales_") ? { ...file, name: "Sales_20260722_20260722.csv" } : file);
  const payload = buildRefreshPayload(oneDay);
  assert.equal(payload.periodStart, "2026-07-01");
  assert.equal(payload.periodEnd, "2026-07-22");
  assert.equal(payload.issues.some((issue) => issue.status === "FAIL"), false);
});

test("inactive Jane appointment rows never enter the reporting facts", () => {
  const appointments = {
    ...files[0],
    text: `${files[0].text}2,TTG,2026-07-03 10:00,2026-07-03 10:50,inactive-guid,2,,Hidden,,Patient,Individual Counselling,Gabriella Evans,false,,deleted,false,signed,,2026-07-01,,false,,,,,,\n`,
  };
  const payload = buildRefreshPayload([appointments, files[1], files[3], files[4]]);
  assert.equal(payload.privateFacts?.appointments.length, 1);
  assert.equal(payload.analytics?.appointments.total, 1);
  assert.doesNotMatch(JSON.stringify(payload), /inactive-guid|Hidden Patient/);
});

test("retention treats a later no-show as return activity without creating a first-visit cohort", () => {
  const appointments = {
    name: "TheTraumaTherapyGroup_Appointments_20260401_20260722.csv",
    text: `id,location_name,start_at,end_at,patient_guid,patient_number,patient_prefix,patient_first_name,patient_preferred_name,patient_last_name,treatment_name,staff_member_name,break,insurance_state,state,first_visit,chart_status,notes_text,booked_at,arrived_at,booked_online,archived_at,no_show_at,cancelled_at,cancelled_reason,referral_source
1,TTG,2026-04-01 10:00,2026-04-01 10:50,return-guid,1,,First,,Patient,Individual Counselling,Gabriella Evans,false,,arrived,true,signed,,2026-03-30,2026-04-01,false,,,,,,
2,TTG,2026-04-15 10:00,2026-04-15 10:50,return-guid,1,,First,,Patient,Individual Counselling,Gabriella Evans,false,,no_show,false,signed,,2026-04-02,,false,,2026-04-15,,,,
3,TTG,2026-07-22 10:00,2026-07-22 10:50,current-guid,2,,Current,,Patient,Individual Counselling,Gabriella Evans,false,,arrived,true,signed,,2026-07-20,2026-07-22,false,,,,,,
`,
  };
  const payload = buildRefreshPayload([appointments, files[1], files[3], files[4]]);
  const aprilClinic = payload.cohortRows.find((row) => row.cohortMonth === "2026-04" && row.entity === "clinic");
  assert.equal(aprilClinic?.cohortSize, 1);
  assert.equal(aprilClinic?.eligible30, 1);
  assert.equal(aprilClinic?.retained30, 1);
  assert.equal(aprilClinic?.retained60, 1);
  assert.equal(aprilClinic?.retained90, 1);
});
