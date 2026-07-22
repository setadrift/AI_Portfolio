import { createSign } from "node:crypto";
import { getVercelOidcToken } from "@vercel/oidc";
import { ttgDashboardFixture } from "./dashboard-fixture";

export type MonthlyMetric = {
  period: string;
  status: "Complete" | "Partial";
  dataThrough: string;
  grossRevenue: number;
  collectedRevenue: number;
  collectionRate: number;
  outstandingBalance: number;
  operatingExpenses: number;
  operatingProfit: number;
  profitMargin: number;
  netCashFlow: number;
  marketingSpend: number;
  marketingRatio: number;
  uncategorizedExpenses: number;
};

export type TherapistMetric = {
  name: string;
  owner: boolean;
  revenue: number;
  collectedRevenue: number;
  scheduledHours: number;
  bookedHours: number;
  availableHours: number;
  utilization: number;
  appointments: number;
  appointmentsPerWeek: number;
};

export type ExpenseMetric = { category: string; amount: number; share: number };

export type QualityStatus = "PASS" | "WARNING" | "FAIL";

export type DashboardSource = {
  mode: "live" | "fixture";
  label: string;
  refreshedAt: string;
  fetchedAt?: string;
  refreshedBy?: string;
  refreshStatus: QualityStatus | "UNKNOWN";
  refreshNotes?: string;
  janeDataThrough: string;
  bankDataThrough: string;
  bankCoverage?: string;
  bankRows?: number;
  spreadsheetId?: string;
};

export type TtgDashboardData = {
  source: DashboardSource;
  reportingPeriod: string;
  months: MonthlyMetric[];
  therapists: TherapistMetric[];
  expenses: ExpenseMetric[];
  qualityChecks: Array<{
    check: string;
    status: QualityStatus;
    actual: number;
    expected: number;
    difference: number;
    notes: string;
  }>;
  summary: {
    activeTherapists: number;
    weightedUtilization: number;
    bookedHours: number;
    availableHours: number;
    revenuePerTherapist: number;
    ownerRevenueShare: number;
    revenueWithoutOwner: number;
    contractorCommissions: number;
    bookedAppointments: number;
    appointmentsPerTherapistWeek: number;
    payoutReconciliation: number;
    payoutsMatched: number;
    payoutsExpected: number;
    payoutValue: number;
    outstandingBalance: number;
  };
};

type SheetRow = Record<string, string>;

const SHEET_HEADERS = new Set([
  "Period", "Period Status", "Data Through", "Therapist", "Category",
  "Expense Amount", "Check", "Actual", "Expected", "Status",
  "Refresh Timestamp", "Refreshed By", "Jane Periods", "Bank Coverage",
  "Item", "Value", "Source Type", "Source Name", "Period / As-of",
]);

const required = (value: string | undefined, field: string) => {
  if (value === undefined || value === "") throw new Error(`Missing required field: ${field}`);
  return value;
};

const numeric = (value: string | undefined, field: string) => {
  const parsed = Number(required(value, field).replace(/[$,%()\s]/g, (character) => character === "(" ? "-" : "").replace(/,/g, ""));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number for ${field}`);
  return parsed;
};

const optionalNumeric = (value: string | undefined) => {
  if (!value || value === "-") return 0;
  const normalized = value.replace(/[$,%()\s]/g, (character) => character === "(" ? "-" : "").replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

function rowsFromValues(values: unknown[][]): SheetRow[] {
  const stringValues = values.map((row) => row.map((value) => String(value ?? "").trim()));
  const headerIndex = stringValues.findIndex((row) => row.filter((cell) => SHEET_HEADERS.has(cell)).length >= 2);
  if (headerIndex < 0) throw new Error("Could not find a reporting table header row");
  const headers = stringValues[headerIndex];
  const rows = stringValues.slice(headerIndex + 1);
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function pickTitle(titles: string[], aliases: readonly string[], source: string) {
  const title = aliases.find((alias) => titles.includes(alias));
  if (!title) throw new Error(`Missing required ${source} tab (${aliases.join(" or ")})`);
  return title;
}

function findTitle(titles: string[], aliases: readonly string[]) {
  return aliases.find((alias) => titles.includes(alias));
}

function qualityStatus(value: string | undefined): QualityStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "PASS" || normalized === "FAIL") return normalized;
  return "WARNING";
}

function dateValue(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 30_000 && serial < 100_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function periodKey(value: string) {
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 30_000 && serial < 100_000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 7);
  }
  const iso = value.match(/(20\d{2})-(0[1-9]|1[0-2])/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const parsed = new Date(value.replace(/\bMTD\b/i, "").trim());
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid reporting period: ${value}`);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function getGoogleAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(privateKey))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Google authentication failed (${response.status})`);
  const body = (await response.json()) as { access_token?: string };
  return required(body.access_token, "Google access token");
}

async function getKeylessGoogleAccessToken(email: string) {
  const projectNumber = required(process.env.TTG_GCP_PROJECT_NUMBER, "GCP project number");
  const poolId = required(process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_ID, "workload identity pool ID");
  const providerId = required(process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, "workload identity provider ID");
  const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
  const subjectToken = await getVercelOidcToken();
  const exchangeResponse = await fetch("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token: subjectToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    }),
    cache: "no-store",
  });
  if (!exchangeResponse.ok) throw new Error(`Google identity exchange failed (${exchangeResponse.status})`);
  const exchange = (await exchangeResponse.json()) as { access_token?: string };
  const federatedToken = required(exchange.access_token, "Google federated access token");
  const impersonationResponse = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:generateAccessToken`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${federatedToken}`, "content-type": "application/json" },
      body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/spreadsheets.readonly"], lifetime: "3600s" }),
      cache: "no-store",
    },
  );
  if (!impersonationResponse.ok) throw new Error(`Google service account impersonation failed (${impersonationResponse.status})`);
  const impersonation = (await impersonationResponse.json()) as { accessToken?: string };
  return required(impersonation.accessToken, "Google service account access token");
}

async function fetchLiveDashboard(): Promise<TtgDashboardData> {
  const spreadsheetId = required(process.env.TTG_DASHBOARD_SPREADSHEET_ID, "spreadsheet ID");
  const email = required(process.env.TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL, "service account email");
  const privateKey = process.env.TTG_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const token = privateKey ? await getGoogleAccessToken(email, privateKey) : await getKeylessGoogleAccessToken(email);
  const headers = { authorization: `Bearer ${token}` };

  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers, next: { revalidate: 900, tags: ["ttg-dashboard"] } },
  );
  if (!metadataResponse.ok) throw new Error(`Google Sheets metadata failed (${metadataResponse.status})`);
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  const titles = (metadata.sheets ?? []).flatMap((sheet) => sheet.properties?.title ? [sheet.properties.title] : []);
  const monthlyTitle = pickTitle(titles, ["Monthly Metrics", "Monthly Finance"], "monthly metrics");
  const therapistTitle = pickTitle(titles, ["Therapist Monthly", "Therapist Performance"], "therapist metrics");
  const expenseTitle = pickTitle(titles, ["Expense Categories", "Expense Mix"], "expense metrics");
  const qualityTitle = pickTitle(titles, ["Data Quality", "Checks"], "data quality");
  const refreshTitle = findTitle(titles, ["Refresh Log"]);
  const sourcesTitle = findTitle(titles, ["Sources"]);
  const selected = [monthlyTitle, therapistTitle, expenseTitle, qualityTitle, refreshTitle, sourcesTitle].filter((title): title is string => Boolean(title));
  const params = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  selected.forEach((title) => params.append("ranges", `'${title}'!A:AC`));
  const valuesResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    { headers, next: { revalidate: 900, tags: ["ttg-dashboard"] } },
  );
  if (!valuesResponse.ok) throw new Error(`Google Sheets values failed (${valuesResponse.status})`);
  const body = (await valuesResponse.json()) as { valueRanges?: Array<{ values?: unknown[][] }> };
  const ranges = (body.valueRanges ?? []).map((range) => rowsFromValues(range.values ?? []));
  const rowsByTitle = new Map(selected.map((title, index) => [title, ranges[index]]));
  const monthRows = rowsByTitle.get(monthlyTitle);
  const therapistRows = rowsByTitle.get(therapistTitle);
  const expenseRows = rowsByTitle.get(expenseTitle);
  const qualityRows = rowsByTitle.get(qualityTitle);
  const refreshRows = refreshTitle ? rowsByTitle.get(refreshTitle) ?? [] : [];
  const sourceRows = sourcesTitle ? rowsByTitle.get(sourcesTitle) ?? [] : [];
  if (!monthRows || !therapistRows || !expenseRows || !qualityRows) throw new Error("Google Sheets returned incomplete dashboard ranges");

  const expenseAmount = (key: string, category: string) => expenseRows
    .filter((row) => row.Period === key && row.Category.toLowerCase().includes(category))
    .reduce((sum, row) => sum + numeric(row["Expense Amount"], `${row.Category} expense`), 0);
  const months: MonthlyMetric[] = monthRows.map((row) => {
    const period = required(row.Period, "Period");
    const key = periodKey(period);
    const grossRevenue = numeric(row["Gross Revenue"], "Gross Revenue");
    const collectedRevenue = numeric(row["Collected Revenue"], "Collected Revenue");
    const marketingSpend = row["Marketing Spend"]
      ? numeric(row["Marketing Spend"], "Marketing Spend")
      : expenseAmount(key, "advertising & marketing");
    return {
      period,
      status: (row["Period Status"].toLowerCase().includes("partial") ? "Partial" : "Complete") as MonthlyMetric["status"],
      dataThrough: required(row["Data Through"], "Data Through"),
      grossRevenue,
      collectedRevenue,
      collectionRate: row["Collection Rate"] ? numeric(row["Collection Rate"], "Collection Rate") : collectedRevenue / grossRevenue,
      outstandingBalance: row["Outstanding Balance"] ? numeric(row["Outstanding Balance"], "Outstanding Balance") : grossRevenue - collectedRevenue,
      operatingExpenses: numeric(row["Operating Expenses"], "Operating Expenses"),
      operatingProfit: numeric(row["Estimated Operating Profit"], "Estimated Operating Profit"),
      profitMargin: numeric(row["Estimated Profit Margin"], "Estimated Profit Margin"),
      netCashFlow: numeric(row["Net Cash Flow"], "Net Cash Flow"),
      marketingSpend,
      marketingRatio: row["Marketing Spend % Revenue"] ? numeric(row["Marketing Spend % Revenue"], "Marketing Spend % Revenue") : marketingSpend / grossRevenue,
      uncategorizedExpenses: numeric(row["Uncategorized Expenses"], "Uncategorized Expenses"),
    };
  }).sort((a, b) => periodKey(a.period).localeCompare(periodKey(b.period)));
  const primary = months.at(-1);
  if (!primary) throw new Error("No reporting period is available");
  const primaryExpenseKey = periodKey(primary.period);
  const primaryTherapistRows = therapistRows.filter((row) => periodKey(row["Period Start"]) === primaryExpenseKey);
  const therapists: TherapistMetric[] = primaryTherapistRows.map((row) => ({
    name: required(row.Therapist, "Therapist"),
    owner: ["true", "1", "yes", "✔"].includes(row["Owner Flag"].toLowerCase()),
    revenue: numeric(row["Gross Revenue"] || row["Total Invoiced"], "Therapist Gross Revenue"),
    collectedRevenue: numeric(row["Collected Revenue"] || row["Collected In Period"], "Therapist Collected Revenue"),
    scheduledHours: numeric(row["Scheduled Hours"], "Scheduled Hours"),
    bookedHours: numeric(row["Booked Hours"], "Booked Hours"),
    availableHours: numeric(row["Available Hours"] || row["Scheduled Hours"], "Available Hours"),
    utilization: numeric(row.Utilization, "Utilization"),
    appointments: numeric(row["Booked Appointments"] || row["Total Bookings"], "Booked Appointments"),
    appointmentsPerWeek: row["Appointments / Week"]
      ? numeric(row["Appointments / Week"], "Appointments / Week")
      : numeric(row["Total Bookings"], "Total Bookings") / (30 / 7),
  }));
  const expenses = expenseRows.filter((row) => periodKey(row.Period) === primaryExpenseKey).map((row) => ({
    category: required(row.Category, "Expense Category"),
    amount: numeric(row["Expense Amount"], "Expense Amount"),
    share: row["Expense Share"] ? numeric(row["Expense Share"], "Expense Share") : numeric(row["Expense Amount"], "Expense Amount") / primary.operatingExpenses,
  }));
  const qualityChecks = qualityRows.map((row) => ({
    check: required(row.Check, "Data Quality Check"),
    status: qualityStatus(row.Status),
    actual: optionalNumeric(row.Actual),
    expected: optionalNumeric(row.Expected),
    difference: optionalNumeric(row.Difference),
    notes: row.Notes || row["Where to Fix / Notes"] || "",
  }));
  const bookedHours = therapists.reduce((sum, item) => sum + item.bookedHours, 0);
  const scheduledHours = therapists.reduce((sum, item) => sum + item.scheduledHours, 0);
  const bookedAppointments = therapists.reduce((sum, item) => sum + item.appointments, 0);
  const ownerRevenue = therapists.filter((item) => item.owner).reduce((sum, item) => sum + item.revenue, 0);
  const payoutCheck = qualityChecks.find((check) => check.check.toLowerCase().includes("payout count"))
    ?? qualityChecks.find((check) => check.check.toLowerCase().includes("payouts matched"));
  const payoutCount = payoutCheck?.actual ?? 0;
  const payoutExpected = payoutCheck?.expected ?? 0;
  const payoutValue = qualityChecks.find((check) => check.check.toLowerCase().includes("payout value"))?.actual ?? 0;
  const contractorCommissions = primaryTherapistRows.reduce((sum, row) => {
    return sum + optionalNumeric(row["Contractor Commission"] || row.Compensation);
  }, 0);
  const outstandingBalance = primaryTherapistRows.reduce((sum, row) => {
    const invoiced = numeric(row["Gross Revenue"] || row["Total Invoiced"], "Therapist Gross Revenue");
    const collected = numeric(row["Collected As Of Today"] || row["Collected Revenue"], "Therapist collected as of today");
    return sum + Math.max(0, invoiced - collected);
  }, 0);
  const latestMonth = months.at(-1)!;
  const alignmentRow = qualityRows.find((row) => row.Check.toLowerCase().includes("source date alignment"));
  const latestRefresh = refreshRows.at(-1);
  const bankSource = sourceRows.find((row) => (row.Item || "").toLowerCase().includes("bank transaction"));
  const janeDataThrough = dateValue(alignmentRow?.Expected) ?? latestMonth.dataThrough;
  const bankDataThrough = dateValue(alignmentRow?.Actual) ?? latestMonth.dataThrough;
  const refreshedAt = dateValue(latestRefresh?.["Refresh Timestamp"]) ?? latestMonth.dataThrough;

  return validateDashboardData({
    ...ttgDashboardFixture,
    source: {
      mode: "live",
      label: "Connected reporting workbook",
      refreshedAt,
      fetchedAt: new Date().toISOString(),
      refreshedBy: latestRefresh?.["Refreshed By"],
      refreshStatus: latestRefresh?.Status ? qualityStatus(latestRefresh.Status) : "UNKNOWN",
      refreshNotes: latestRefresh?.Notes,
      janeDataThrough,
      bankDataThrough,
      bankCoverage: latestRefresh?.["Bank Coverage"] || bankSource?.["Period / As-of"],
      bankRows: optionalNumeric(latestRefresh?.["Bank Rows"] || bankSource?.Value),
      spreadsheetId,
    },
    reportingPeriod: primary.period,
    months,
    therapists,
    expenses,
    qualityChecks,
    summary: {
      activeTherapists: therapists.length,
      weightedUtilization: scheduledHours ? bookedHours / scheduledHours : 0,
      bookedHours,
      availableHours: scheduledHours - bookedHours,
      revenuePerTherapist: therapists.length ? primary.grossRevenue / therapists.length : 0,
      ownerRevenueShare: primary.grossRevenue ? ownerRevenue / primary.grossRevenue : 0,
      revenueWithoutOwner: primary.grossRevenue - ownerRevenue,
      contractorCommissions,
      bookedAppointments,
      appointmentsPerTherapistWeek: therapists.length ? bookedAppointments / therapists.length / (30 / 7) : 0,
      payoutReconciliation: payoutExpected ? payoutCount / payoutExpected : 0,
      payoutsMatched: payoutCount,
      payoutsExpected: payoutExpected,
      payoutValue,
      outstandingBalance,
    },
  });
}

export function validateDashboardData(data: TtgDashboardData) {
  const primary = data.months.find((month) => month.period === data.reportingPeriod);
  if (!primary) throw new Error(`Reporting period ${data.reportingPeriod} is missing`);
  const therapistRevenue = data.therapists.reduce((sum, therapist) => sum + therapist.revenue, 0);
  if (Math.abs(therapistRevenue - primary.grossRevenue) > 0.02) throw new Error("Therapist revenue does not reconcile to gross revenue");
  const expenseTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  if (Math.abs(expenseTotal - primary.operatingExpenses) > 0.02) throw new Error("Expense categories do not reconcile to operating expenses");
  return data;
}

export async function getTtgDashboardData(): Promise<TtgDashboardData> {
  const hasStaticKeyConfig = Boolean(process.env.TTG_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const hasKeylessConfig = Boolean(
    process.env.TTG_GCP_PROJECT_NUMBER
      && process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_ID
      && process.env.TTG_GOOGLE_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  );
  const hasLiveConfig = Boolean(
    process.env.TTG_DASHBOARD_SPREADSHEET_ID
      && process.env.TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL
      && (hasStaticKeyConfig || hasKeylessConfig),
  );
  if (hasLiveConfig) return fetchLiveDashboard();
  if (process.env.NODE_ENV === "production") throw new Error("TTG dashboard Google Sheets access is not configured");
  return validateDashboardData(ttgDashboardFixture);
}
