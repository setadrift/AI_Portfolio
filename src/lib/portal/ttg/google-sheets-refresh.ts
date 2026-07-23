import { createHash, createSign, randomUUID } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";
import type { RefreshPayload } from "./dashboard-refresh";

const required = (value: string | undefined, field: string) => {
  if (!value) throw new Error(`Missing required field: ${field}`);
  return value;
};
const base64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

async function staticToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${body}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(signer.sign(privateKey))}` }), cache: "no-store" });
  if (!response.ok) throw new Error(`Google authentication failed (${response.status})`);
  return required(((await response.json()) as { access_token?: string }).access_token, "Google access token");
}

async function keylessToken(email: string) {
  const project = required(process.env.TTG_GCP_PROJECT_NUMBER, "GCP project number");
  const pool = required(process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_ID, "workload identity pool ID");
  const provider = required(process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, "workload identity provider ID");
  const exchange = await fetch("https://sts.googleapis.com/v1/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:token-exchange", audience: `//iam.googleapis.com/projects/${project}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`, scope: "https://www.googleapis.com/auth/cloud-platform", requested_token_type: "urn:ietf:params:oauth:token-type:access_token", subject_token: await getVercelOidcToken(), subject_token_type: "urn:ietf:params:oauth:token-type:jwt" }), cache: "no-store" });
  if (!exchange.ok) throw new Error(`Google identity exchange failed (${exchange.status})`);
  const federated = required(((await exchange.json()) as { access_token?: string }).access_token, "Google federated token");
  const impersonation = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:generateAccessToken`, { method: "POST", headers: { authorization: `Bearer ${federated}`, "content-type": "application/json" }, body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/spreadsheets"], lifetime: "3600s" }), cache: "no-store" });
  if (!impersonation.ok) throw new Error(`Google service account impersonation failed (${impersonation.status})`);
  return required(((await impersonation.json()) as { accessToken?: string }).accessToken, "Google service account token");
}

async function context() {
  const spreadsheetId = required(process.env.TTG_DASHBOARD_SPREADSHEET_ID, "spreadsheet ID");
  const email = required(process.env.TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL, "service account email");
  const privateKey = process.env.TTG_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const token = privateKey ? await staticToken(email, privateKey) : await keylessToken(email);
  return { spreadsheetId, headers: { authorization: `Bearer ${token}` } };
}

const TABS = ["Monthly Metrics", "Therapist Monthly", "Expense Categories", "Jane Payouts", "Reconciliation", "Checks", "Refresh Log", "Sources"];
const OPERATIONAL_TABS = {
  "Source Coverage": ["Report", "Role", "Coverage Start", "Coverage End", "Status", "Last Refresh ID", "Notes"],
  "Import History": ["Refresh ID", "Published At", "Refreshed By", "Period", "Status", "Active", "Payload JSON", "Superseded By"],
  "Analytics Daily": ["Date", "Entity", "Name", "Appointments", "Completed", "Cancelled", "No Shows", "Pending", "Invoiced", "Collected", "Processed", "Outstanding", "Commission", "Transactions", "Completed Transactions", "Completed Transaction Value", "Fees", "Refunds", "Patients", "New Patients", "Consultations", "First Visits", "Subsequent Visits", "Booked Minutes", "Recovered", "Payment Lag Days", "Payment Lag Samples", "Refresh ID"],
  "Retention Cohorts": ["Cohort Month", "Entity", "Name", "Cohort Size", "Eligible 30", "Retained 30", "Eligible 60", "Retained 60", "Eligible 90", "Retained 90", "Repeat Patients", "Visit Gap Days", "Visit Gap Samples", "Refresh ID"],
} as const;

async function readTables(includeOperational = false) {
  const { spreadsheetId, headers } = await context();
  const requestedTabs = includeOperational ? [...TABS, ...Object.keys(OPERATIONAL_TABS)] : TABS;
  const params = new URLSearchParams({ majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" });
  requestedTabs.forEach((tab) => params.append("ranges", `'${tab}'!A:AC`));
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets read failed (${response.status})`);
  const body = (await response.json()) as { valueRanges?: Array<{ values?: unknown[][] }> };
  return { spreadsheetId, headers, tables: new Map(requestedTabs.map((tab, index) => [tab, (body.valueRanges?.[index]?.values ?? []) as unknown[][]])) };
}

async function ensureOperationalTabs(spreadsheetId: string, headers: { authorization: string }) {
  const metadata = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, { headers, cache: "no-store" });
  if (!metadata.ok) throw new Error(`Google Sheets metadata read failed (${metadata.status})`);
  const titles = new Set(((await metadata.json()) as { sheets?: Array<{ properties?: { title?: string } }> }).sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) as string[] ?? []);
  const missing = Object.keys(OPERATIONAL_TABS).filter((title) => !titles.has(title));
  if (!missing.length) return;
  const created = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title, hidden: true } } })) }), cache: "no-store" });
  if (!created.ok) throw new Error(`Google Sheets operational tab setup failed (${created.status})`);
  const seeded = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ valueInputOption: "RAW", data: missing.map((title) => ({ range: `'${title}'!A1`, values: [[...OPERATIONAL_TABS[title as keyof typeof OPERATIONAL_TABS]]] })) }), cache: "no-store" });
  if (!seeded.ok) throw new Error(`Google Sheets operational tab headers failed (${seeded.status})`);
}

async function hasOperationalTabs(spreadsheetId: string, headers: { authorization: string }) {
  const metadata = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, { headers, cache: "no-store" });
  if (!metadata.ok) throw new Error(`Google Sheets metadata read failed (${metadata.status})`);
  const titles = new Set(((await metadata.json()) as { sheets?: Array<{ properties?: { title?: string } }> }).sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) as string[] ?? []);
  return Object.keys(OPERATIONAL_TABS).every((title) => titles.has(title));
}

export async function getWorkbookFingerprint() {
  const { tables } = await readTables();
  return createHash("sha256").update(JSON.stringify([...tables])).digest("hex");
}

const sheetDate = (value: string) => value;
const pad = (rows: unknown[][], length: number, width: number) => [...rows, ...Array.from({ length: Math.max(0, length - rows.length) }, () => Array(width).fill(""))];

function rowPeriod(value: unknown) {
  if (typeof value === "number" && value > 30_000) return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 7);
  const text = String(value ?? "").trim();
  const iso = text.match(/(20\d{2})-(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const parsed = new Date(text.replace(/\bMTD\b/i, "").trim());
  return Number.isNaN(parsed.getTime()) ? "" : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function tableHeader(table: unknown[][], headerName: string) {
  const headerIndex = table.findIndex((row) => row.map(String).includes(headerName));
  if (headerIndex < 0) throw new Error(`Workbook tab is missing ${headerName}`);
  return { headerIndex, header: table[headerIndex].map(String) };
}

function recordRow(header: string[], values: Record<string, unknown>) {
  return header.map((field) => values[field] ?? "");
}

export function buildMonthlyPublishRow(table: unknown[][], payload: RefreshPayload) {
  const { headerIndex, header } = tableHeader(table, "Period Start");
  const periodColumn = header.indexOf("Period Start");
  const existing = table.slice(headerIndex + 1).find((row) => rowPeriod(row[periodColumn]) === payload.periodKey);
  const next = existing ? [...existing] : Array(header.length).fill(0);
  const set = (field: string, value: unknown) => {
    const index = header.indexOf(field);
    if (index >= 0) next[index] = value;
  };
  const m = payload.monthly;
  set("Period Start", sheetDate(payload.periodStart));
  set("Period", payload.periodLabel);
  set("Period Status", payload.periodStatus);
  set("Data Through", sheetDate(payload.periodEnd));
  set("Gross Revenue", m.grossRevenue);
  set("Outstanding Balance", Math.max(0, m.grossRevenue - m.collectedRevenue));
  set("Collected Revenue", m.collectedRevenue);
  if (payload.refreshType !== "jane") {
    set("Operating Expenses", m.operatingExpenses);
    set("Estimated Operating Profit", m.operatingProfit);
    set("Estimated Profit Margin", m.collectedRevenue ? m.operatingProfit / m.collectedRevenue : 0);
    set("Cash Inflows", m.cashInflows);
    set("Cash Outflows", m.cashOutflows);
    set("Net Cash Flow", m.netCashFlow);
    set("Uncategorized Expenses", m.uncategorizedExpenses);
    set("Payout Reconciliation", m.payoutReconciliation);
  }
  set("Notes", `${payload.refreshType === "jane" ? "Jane-only" : "Full"} portal refresh ${payload.refreshId}${payload.refreshType === "jane" ? "; bank-backed values unchanged" : ""}`);
  return next;
}

export function buildTherapistPublishRows(table: unknown[][], payload: RefreshPayload) {
  const { headerIndex, header } = tableHeader(table, "Period Start");
  const periodColumn = header.indexOf("Period Start");
  const therapistColumn = header.indexOf("Therapist");
  const existing = new Map(
    table
      .slice(headerIndex + 1)
      .filter((row) => rowPeriod(row[periodColumn]) === payload.periodKey && row[therapistColumn])
      .map((row) => [String(row[therapistColumn]).trim().toLowerCase(), row]),
  );
  const hoursSupplied = payload.sourceCoverage.some((source) => source.kind === "hours" && source.status !== "missing");
  return payload.therapists.map((row) => {
    const previous = existing.get(row.name.trim().toLowerCase());
    const previousScheduled = Number(previous?.[header.indexOf("Scheduled Hours")] ?? 0);
    const previousBooked = Number(previous?.[header.indexOf("Booked Hours")] ?? 0);
    const scheduledHours = hoursSupplied ? row.scheduledHours : Number.isFinite(previousScheduled) ? previousScheduled : 0;
    const bookedHours = hoursSupplied ? row.bookedHours : Number.isFinite(previousBooked) ? previousBooked : 0;
    return recordRow(header, {
      "Period Start": payload.periodStart,
      "Period Status": payload.periodStatus,
      Therapist: row.name,
      Invoices: row.invoices,
      "Gross Revenue": row.invoiced,
      "Total Invoiced": row.invoiced,
      "Collected Revenue": row.collected,
      "Collected In Period": row.collected,
      "Collected As Of Today": row.collected,
      Outstanding: Math.max(0, row.invoiced - row.collected),
      "Scheduled Hours": scheduledHours,
      "Available Hours": scheduledHours,
      "Booked Hours": bookedHours,
      Utilization: scheduledHours ? bookedHours / scheduledHours : 0,
      "Booked Appointments": row.bookings,
      "Total Bookings": row.bookings,
      "Contractor Commission": row.compensation,
      Compensation: row.compensation,
      "Owner Flag": row.owner,
      "Revenue per Booked Hour": bookedHours ? row.invoiced / bookedHours : 0,
      Notes: hoursSupplied
        ? "Aggregated in portal; no patient identifiers retained."
        : "Core Jane reports refreshed; previously published scheduled and booked hours retained.",
    });
  });
}

export function hasRetentionHistory(payload: RefreshPayload) {
  const appointments = payload.sourceCoverage.find((source) => source.kind === "appointments");
  if (!appointments?.start || !appointments.end || !payload.cohortRows.length) return false;
  return (Date.parse(`${appointments.end}T12:00:00Z`) - Date.parse(`${appointments.start}T12:00:00Z`)) / 86_400_000 >= 90;
}

function replacePeriod(table: unknown[][], headerName: string, periodKey: string, rows: unknown[][]) {
  const headerIndex = table.findIndex((row) => row.map(String).includes(headerName));
  if (headerIndex < 0) throw new Error(`Workbook tab is missing ${headerName}`);
  const header = table[headerIndex].map(String);
  const periodColumn = header.includes("Period") ? header.indexOf("Period") : header.indexOf("Period Start");
  const existing = table.slice(headerIndex + 1).filter((row) => rowPeriod(row[periodColumn]) !== periodKey);
  const next = [header, ...existing, ...rows];
  return { startRow: headerIndex + 1, values: pad(next, table.length - headerIndex, header.length), width: header.length };
}

function replaceAll(table: unknown[][], headerName: string, rows: unknown[][]) {
  const headerIndex = table.findIndex((row) => row.map(String).includes(headerName));
  if (headerIndex < 0) throw new Error(`Workbook tab is missing ${headerName}`);
  const header = table[headerIndex].map(String);
  return { startRow: headerIndex + 1, values: pad([header, ...rows], table.length - headerIndex, header.length), width: header.length };
}

function appendRow(table: unknown[][], headerName: string, row: unknown[]) {
  const headerIndex = table.findIndex((candidate) => candidate.map(String).includes(headerName));
  if (headerIndex < 0) throw new Error(`Workbook tab is missing ${headerName}`);
  const header = table[headerIndex].map(String);
  const existing = table.slice(headerIndex + 1).filter((candidate) => candidate.some((cell) => String(cell ?? "").trim()));
  return { startRow: headerIndex + 1, values: [header, ...existing, row], width: header.length };
}

function replaceDateRange(table: unknown[][], headerName: string, start: string, end: string, rows: unknown[][]) {
  const { headerIndex, header } = tableHeader(table, headerName);
  const dateIndex = header.indexOf(headerName);
  const existing = table.slice(headerIndex + 1).filter((row) => {
    if (!row.some((cell) => String(cell ?? "").trim())) return false;
    const date = String(row[dateIndex] ?? "").slice(0, 10);
    return !date || date < start || date > end;
  });
  return { startRow: headerIndex + 1, values: [header, ...existing, ...rows], width: header.length };
}

const column = (index: number) => String.fromCharCode(64 + index);

export async function publishRefresh(payload: RefreshPayload, refreshedBy: string, expectedFingerprint: string) {
  const initial = await readTables();
  const initialFingerprint = createHash("sha256").update(JSON.stringify([...initial.tables])).digest("hex");
  if (initialFingerprint !== expectedFingerprint) throw new Error("The workbook changed after preview. Review the files again before publishing.");
  await ensureOperationalTabs(initial.spreadsheetId, initial.headers);
  const current = await readTables(true);
  const actualFingerprint = createHash("sha256").update(JSON.stringify(TABS.map((tab) => [tab, current.tables.get(tab) ?? []]))).digest("hex");
  if (actualFingerprint !== expectedFingerprint) throw new Error("The workbook changed after preview. Review the files again before publishing.");
  const janeOnly = payload.refreshType === "jane";
  const monthly = replacePeriod(current.tables.get("Monthly Metrics")!, "Period Start", payload.periodKey, [buildMonthlyPublishRow(current.tables.get("Monthly Metrics")!, payload)]);
  const therapistRows = buildTherapistPublishRows(current.tables.get("Therapist Monthly")!, payload);
  const therapists = replacePeriod(current.tables.get("Therapist Monthly")!, "Period Start", payload.periodKey, therapistRows);
  const expenses = replacePeriod(current.tables.get("Expense Categories")!, "Period Start", payload.periodKey, payload.expenses.map((row) => [payload.periodStart, payload.periodKey, row.category, row.amount]));
  const payouts = replaceAll(current.tables.get("Jane Payouts")!, "Date Created", payload.payouts.map((row) => [row.created, row.deposited, row.amount, row.status]));
  const reconciliation = replaceAll(current.tables.get("Reconciliation")!, "Payout ID", payload.reconciliation.map((row) => [row.payoutId, row.janeDepositDate, row.janeAmount, "", row.bankDate, row.bankAmount, row.difference, row.status, row.notes]));
  const payoutsSupplied = payload.sourceCoverage.some((source) => source.kind === "payouts" && source.status !== "missing");
  const retentionHistorySupplied = hasRetentionHistory(payload);
  const checksTable = current.tables.get("Checks")!;
  let checkRows: unknown[][] = payload.checks.map((row) => [row.check, row.actual, row.expected, row.difference, row.tolerance, row.status, row.notes]);
  if (janeOnly) {
    const { headerIndex, header } = tableHeader(checksTable, "Check");
    const checkIndex = header.indexOf("Check");
    const actualIndex = header.indexOf("Actual");
    const previous = checksTable.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell ?? "").trim()));
    const alignment = previous.find((row) => String(row[checkIndex] ?? "").toLowerCase().includes("source date alignment"));
    const janePrefixes = [`${payload.periodKey} therapist invoiced`, `${payload.periodKey} therapist collected`, `${payload.periodKey} Payments & Refunds`].map((value) => value.toLowerCase());
    const retained = previous.filter((row) => {
      const name = String(row[checkIndex] ?? "").toLowerCase();
      return !name.includes("source date alignment") && !janePrefixes.some((prefix) => name.startsWith(prefix));
    });
    const bankActual = alignment?.[actualIndex] ?? "";
    const expected = (Date.parse(`${payload.periodEnd}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
    const actualNumber = Number(bankActual);
    const difference = Number.isFinite(actualNumber) ? actualNumber - expected : "";
    const alignmentRow = recordRow(header, {
      Check: `${payload.periodKey} source date alignment`, Actual: bankActual, Expected: expected, Difference: difference, Tolerance: 0, Status: "WARNING",
      Notes: `Jane refreshed through ${payload.periodEnd}; bank data was not included and remains unchanged.`,
    });
    checkRows = [...retained, ...checkRows, alignmentRow];
  }
  const checks = replaceAll(checksTable, "Check", checkRows);
  const overallStatus = payload.checks.some((row) => row.status === "FAIL") ? "FAIL" : janeOnly || payload.issues.some((issue) => issue.status === "WARNING") ? "WARNING" : "PASS";
  const refreshLogTable = current.tables.get("Refresh Log")!;
  const { headerIndex: refreshHeaderIndex, header: refreshHeader } = tableHeader(refreshLogTable, "Refresh Timestamp");
  const previousRefresh = refreshLogTable.slice(refreshHeaderIndex + 1).filter((row) => row.some((cell) => String(cell ?? "").trim())).at(-1);
  const previousBankCoverage = previousRefresh?.[refreshHeader.indexOf("Bank Coverage")] ?? "Bank data not yet supplied";
  const previousBankRows = previousRefresh?.[refreshHeader.indexOf("Bank Rows")] ?? 0;
  const refreshLog = appendRow(refreshLogTable, "Refresh Timestamp", [new Date().toISOString(), refreshedBy, payload.periodLabel, janeOnly ? previousBankCoverage : payload.bankCoverage, janeOnly ? previousBankRows : payload.bankRows, overallStatus, janeOnly ? "Jane reports refreshed; bank-backed metrics unchanged." : payload.issues.map((issue) => issue.title).join("; ") || "All import checks passed."]);
  const coverageTable = current.tables.get("Source Coverage")!;
  const { headerIndex: coverageHeaderIndex, header: coverageHeader } = tableHeader(coverageTable, "Report");
  const coverageReportIndex = coverageHeader.indexOf("Report");
  const coverageStartIndex = coverageHeader.indexOf("Coverage Start");
  const coverageEndIndex = coverageHeader.indexOf("Coverage End");
  const previousCoverage = new Map(coverageTable.slice(coverageHeaderIndex + 1).filter((row) => row[coverageReportIndex]).map((row) => [String(row[coverageReportIndex]), row]));
  const coverageRows = payload.sourceCoverage.map((source) => {
    const previous = previousCoverage.get(source.label);
    const previousStart = String(previous?.[coverageStartIndex] ?? "");
    const previousEnd = String(previous?.[coverageEndIndex] ?? "");
    const start = [previousStart, source.start].filter(Boolean).sort()[0] ?? "";
    const end = [previousEnd, source.end].filter(Boolean).sort().at(-1) ?? "";
    const status = source.status === "missing" && previous ? String(previous[coverageHeader.indexOf("Status")] ?? "missing") : source.status;
    const note = source.status === "missing" && previous ? "No new file supplied; previously published coverage retained." : source.note;
    return [source.label, source.role, start, end, status, payload.refreshId, note];
  });
  const coverage = replaceAll(coverageTable, "Report", coverageRows);
  const analyticsDates = payload.analyticsRows.map((row) => row.date).sort();
  const analyticsDaily = replaceDateRange(
    current.tables.get("Analytics Daily")!,
    "Date",
    analyticsDates[0] ?? payload.periodStart,
    analyticsDates.at(-1) ?? payload.periodEnd,
    payload.analyticsRows.map((row) => [row.date, row.entity, row.name, row.appointments, row.completed, row.cancelled, row.noShows, row.pending, row.invoiced, row.collected, row.processed, row.outstanding, row.commission, row.transactions, row.completedTransactions, row.completedTransactionValue, row.fees, row.refunds, row.patients, row.newPatients, row.consultations, row.firstVisits, row.subsequentVisits, row.bookedMinutes, row.recovered, row.paymentLagDays, row.paymentLagSamples, payload.refreshId]),
  );
  const cohortMonths = payload.cohortRows.map((row) => row.cohortMonth).sort();
  const retentionCohorts = replaceDateRange(
    current.tables.get("Retention Cohorts")!,
    "Cohort Month",
    cohortMonths[0] ?? payload.periodKey,
    cohortMonths.at(-1) ?? payload.periodKey,
    payload.cohortRows.map((row) => [row.cohortMonth, row.entity, row.name, row.cohortSize, row.eligible30, row.retained30, row.eligible60, row.retained60, row.eligible90, row.retained90, row.repeatPatients, row.visitGapDays, row.visitGapSamples, payload.refreshId]),
  );
  const historyPayload: RefreshPayload = { ...payload, analyticsRows: [], cohortRows: [] };
  const payloadJson = JSON.stringify(historyPayload);
  if (payloadJson.length > 45_000) throw new Error("This aggregate refresh snapshot is too large for safe rollback. Reduce the reporting period and preview again.");
  const historyTable = current.tables.get("Import History")!;
  const historyHeader = historyTable[0]?.map(String) ?? [...OPERATIONAL_TABS["Import History"]];
  const historyRows = historyTable.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row) => {
    const next = [...row];
    if (String(next[3]) === payload.periodKey && String(next[5]).toLowerCase() === "true") { next[5] = false; next[7] = payload.refreshId; }
    return next;
  });
  const history = { startRow: 1, values: [historyHeader, ...historyRows, [payload.refreshId, new Date().toISOString(), refreshedBy, payload.periodKey, overallStatus, true, payloadJson, ""]], width: historyHeader.length };
  const updates = [
    ["Monthly Metrics", monthly],
    ["Therapist Monthly", therapists],
    ...(!janeOnly ? [["Expense Categories", expenses]] as const : []),
    ...(payoutsSupplied ? [["Jane Payouts", payouts]] as const : []),
    ...(!janeOnly && payoutsSupplied ? [["Reconciliation", reconciliation]] as const : []),
    ["Checks", checks],
    ["Refresh Log", refreshLog],
    ["Source Coverage", coverage],
    ["Import History", history],
    ["Analytics Daily", analyticsDaily],
    ...(retentionHistorySupplied ? [["Retention Cohorts", retentionCohorts]] as const : []),
  ] as const;
  const data = updates.map(([title, update]) => ({ range: `'${title}'!A${update.startRow}:${column(update.width)}${update.startRow + update.values.length - 1}`, majorDimension: "ROWS", values: update.values }));
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${current.spreadsheetId}/values:batchUpdate`, { method: "POST", headers: { ...current.headers, "content-type": "application/json" }, body: JSON.stringify({ valueInputOption: "RAW", includeValuesInResponse: false, data }), cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 403) throw new Error("The dashboard service account needs Editor access to the TTG workbook before publishing can work.");
    throw new Error(`Google Sheets publish failed (${response.status}): ${detail.slice(0, 180)}`);
  }
  return { refreshId: payload.refreshId, status: overallStatus, period: payload.periodLabel, publishedAt: new Date().toISOString() };
}

export type RefreshHistoryItem = { refreshId: string; publishedAt: string; refreshedBy: string; period: string; status: string; active: boolean };

export async function getRefreshHistory(): Promise<RefreshHistoryItem[]> {
  const base = await readTables();
  if (!await hasOperationalTabs(base.spreadsheetId, base.headers)) return [];
  const { tables } = await readTables(true);
  return (tables.get("Import History") ?? []).slice(1).filter((row) => row[0]).map((row) => ({ refreshId: String(row[0]), publishedAt: String(row[1]), refreshedBy: String(row[2]), period: String(row[3]), status: String(row[4]), active: String(row[5]).toLowerCase() === "true" })).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 12);
}

export async function rollbackRefresh(refreshId: string, refreshedBy: string) {
  const base = await readTables();
  await ensureOperationalTabs(base.spreadsheetId, base.headers);
  const current = await readTables(true);
  const row = (current.tables.get("Import History") ?? []).slice(1).find((candidate) => String(candidate[0]) === refreshId);
  if (!row) throw new Error("That refresh snapshot is no longer available.");
  const original = JSON.parse(String(row[6] ?? "")) as RefreshPayload;
  if (!original.periodKey) throw new Error("That refresh snapshot is invalid.");
  const restored: RefreshPayload = { ...original, refreshId: randomUUID(), issues: [...original.issues, { status: "WARNING", title: "Previous refresh restored", detail: `Restored aggregate snapshot ${refreshId}.` }] };
  const fingerprint = createHash("sha256").update(JSON.stringify([...TABS.map((tab) => [tab, current.tables.get(tab) ?? []])])).digest("hex");
  return publishRefresh(restored, `${refreshedBy} (rollback)`, fingerprint);
}
