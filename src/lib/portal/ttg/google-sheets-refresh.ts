import { createHash, createSign } from "node:crypto";
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

async function readTables() {
  const { spreadsheetId, headers } = await context();
  const params = new URLSearchParams({ majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" });
  TABS.forEach((tab) => params.append("ranges", `'${tab}'!A:AC`));
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Google Sheets read failed (${response.status})`);
  const body = (await response.json()) as { valueRanges?: Array<{ values?: unknown[][] }> };
  return { spreadsheetId, headers, tables: new Map(TABS.map((tab, index) => [tab, (body.valueRanges?.[index]?.values ?? []) as unknown[][]])) };
}

export async function getWorkbookFingerprint() {
  const { tables } = await readTables();
  return createHash("sha256").update(JSON.stringify([...tables])).digest("hex");
}

const sheetDate = (value: string) => value;
const pad = (rows: unknown[][], length: number, width: number) => [...rows, ...Array.from({ length: Math.max(0, length - rows.length) }, () => Array(width).fill(""))];

function replacePeriod(table: unknown[][], headerName: string, periodKey: string, rows: unknown[][]) {
  const headerIndex = table.findIndex((row) => row.map(String).includes(headerName));
  if (headerIndex < 0) throw new Error(`Workbook tab is missing ${headerName}`);
  const header = table[headerIndex].map(String);
  const periodColumn = header.includes("Period") ? header.indexOf("Period") : header.indexOf("Period Start");
  const rowPeriod = (value: unknown) => {
    if (typeof value === "number" && value > 30_000) return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 7);
    const text = String(value ?? "").trim();
    const iso = text.match(/(20\d{2})-(0[1-9]|1[0-2])/);
    if (iso) return `${iso[1]}-${iso[2]}`;
    const parsed = new Date(text.replace(/\bMTD\b/i, "").trim());
    return Number.isNaN(parsed.getTime()) ? "" : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
  };
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

const column = (index: number) => String.fromCharCode(64 + index);

export async function publishRefresh(payload: RefreshPayload, refreshedBy: string, expectedFingerprint: string) {
  const current = await readTables();
  const actualFingerprint = createHash("sha256").update(JSON.stringify([...current.tables])).digest("hex");
  if (actualFingerprint !== expectedFingerprint) throw new Error("The workbook changed after preview. Review the files again before publishing.");
  const m = payload.monthly;
  const monthly = replacePeriod(current.tables.get("Monthly Metrics")!, "Period Start", payload.periodKey, [[sheetDate(payload.periodStart), payload.periodLabel, payload.periodStatus, sheetDate(payload.periodEnd), m.grossRevenue, "", m.collectedRevenue, m.operatingExpenses, m.operatingProfit, m.collectedRevenue ? m.operatingProfit / m.collectedRevenue : 0, m.cashInflows, m.cashOutflows, m.netCashFlow, m.uncategorizedExpenses, m.payoutReconciliation, `Portal refresh ${payload.refreshId}`]]);
  const therapistRows = payload.therapists.map((row) => [payload.periodStart, payload.periodStatus, row.name, row.invoices, row.invoiced, row.collected, row.collected, row.scheduledHours, row.bookedHours, row.scheduledHours ? row.bookedHours / row.scheduledHours : 0, row.bookings, row.compensation, row.owner, row.bookedHours ? row.invoiced / row.bookedHours : 0, "Aggregated in portal; no patient identifiers retained."]);
  const therapists = replacePeriod(current.tables.get("Therapist Monthly")!, "Period Start", payload.periodKey, therapistRows);
  const expenses = replacePeriod(current.tables.get("Expense Categories")!, "Period Start", payload.periodKey, payload.expenses.map((row) => [payload.periodStart, payload.periodKey, row.category, row.amount]));
  const payouts = replaceAll(current.tables.get("Jane Payouts")!, "Date Created", payload.payouts.map((row) => [row.created, row.deposited, row.amount, row.status]));
  const reconciliation = replaceAll(current.tables.get("Reconciliation")!, "Payout ID", payload.reconciliation.map((row) => [row.payoutId, row.janeDepositDate, row.janeAmount, "", row.bankDate, row.bankAmount, row.difference, row.status, row.notes]));
  const checks = replaceAll(current.tables.get("Checks")!, "Check", payload.checks.map((row) => [row.check, row.actual, row.expected, row.difference, row.tolerance, row.status, row.notes]));
  const overallStatus = payload.checks.some((row) => row.status === "FAIL") ? "FAIL" : payload.issues.some((issue) => issue.status === "WARNING") ? "WARNING" : "PASS";
  const refreshLog = appendRow(current.tables.get("Refresh Log")!, "Refresh Timestamp", [new Date().toISOString(), refreshedBy, payload.periodLabel, payload.bankCoverage, payload.bankRows, overallStatus, payload.issues.map((issue) => issue.title).join("; ") || "All import checks passed."]);
  const updates = [
    ["Monthly Metrics", monthly], ["Therapist Monthly", therapists], ["Expense Categories", expenses], ["Jane Payouts", payouts], ["Reconciliation", reconciliation], ["Checks", checks], ["Refresh Log", refreshLog],
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
