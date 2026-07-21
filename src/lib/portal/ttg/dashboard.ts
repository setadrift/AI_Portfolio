import { createSign } from "node:crypto";
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

export type TtgDashboardData = {
  source: { mode: "live" | "fixture"; label: string; refreshedAt: string; spreadsheetId?: string };
  reportingPeriod: string;
  headline: string;
  months: MonthlyMetric[];
  therapists: TherapistMetric[];
  expenses: ExpenseMetric[];
  qualityChecks: Array<{
    check: string;
    status: "PASS" | "WARNING";
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
    payoutValue: number;
    outstandingBalance: number;
  };
};

type SheetRow = Record<string, string>;

const required = (value: string | undefined, field: string) => {
  if (value === undefined || value === "") throw new Error(`Missing required field: ${field}`);
  return value;
};

const numeric = (value: string | undefined, field: string) => {
  const parsed = Number(required(value, field));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number for ${field}`);
  return parsed;
};

function rowsFromValues(values: string[][]): SheetRow[] {
  const [headers = [], ...rows] = values;
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function pickTitle(titles: string[], aliases: readonly string[], source: string) {
  const title = aliases.find((alias) => titles.includes(alias));
  if (!title) throw new Error(`Missing required ${source} tab (${aliases.join(" or ")})`);
  return title;
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

async function fetchLiveDashboard(): Promise<TtgDashboardData> {
  const spreadsheetId = required(process.env.TTG_DASHBOARD_SPREADSHEET_ID, "spreadsheet ID");
  const email = required(process.env.TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL, "service account email");
  const privateKey = required(process.env.TTG_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, "private key").replace(/\\n/g, "\n");
  const token = await getGoogleAccessToken(email, privateKey);
  const headers = { authorization: `Bearer ${token}` };

  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers, next: { revalidate: 900 } },
  );
  if (!metadataResponse.ok) throw new Error(`Google Sheets metadata failed (${metadataResponse.status})`);
  const metadata = (await metadataResponse.json()) as { sheets?: Array<{ properties?: { title?: string } }> };
  const titles = (metadata.sheets ?? []).flatMap((sheet) => sheet.properties?.title ? [sheet.properties.title] : []);
  const selected = [
    pickTitle(titles, ["Monthly Metrics", "Monthly Finance"], "monthly metrics"),
    pickTitle(titles, ["Therapist Monthly", "Therapist Performance"], "therapist metrics"),
    pickTitle(titles, ["Expense Categories", "Expense Mix"], "expense metrics"),
    pickTitle(titles, ["Data Quality"], "data quality"),
  ];
  const params = new URLSearchParams({ majorDimension: "ROWS" });
  selected.forEach((title) => params.append("ranges", `'${title}'!A:AC`));
  const valuesResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    { headers, next: { revalidate: 900 } },
  );
  if (!valuesResponse.ok) throw new Error(`Google Sheets values failed (${valuesResponse.status})`);
  const body = (await valuesResponse.json()) as { valueRanges?: Array<{ values?: string[][] }> };
  const ranges = (body.valueRanges ?? []).map((range) => rowsFromValues(range.values ?? []));
  const [monthRows, therapistRows, expenseRows, qualityRows] = ranges;
  if (!monthRows || !therapistRows || !expenseRows || !qualityRows) throw new Error("Google Sheets returned incomplete dashboard ranges");

  const months: MonthlyMetric[] = monthRows.map((row) => ({
    period: required(row.Period, "Period"),
    status: row["Period Status"].toLowerCase().includes("partial") ? "Partial" : "Complete",
    dataThrough: required(row["Data Through"], "Data Through"),
    grossRevenue: numeric(row["Gross Revenue"], "Gross Revenue"),
    collectedRevenue: numeric(row["Collected Revenue"], "Collected Revenue"),
    collectionRate: numeric(row["Collection Rate"], "Collection Rate"),
    outstandingBalance: numeric(row["Outstanding Balance"], "Outstanding Balance"),
    operatingExpenses: numeric(row["Operating Expenses"], "Operating Expenses"),
    operatingProfit: numeric(row["Estimated Operating Profit"], "Estimated Operating Profit"),
    profitMargin: numeric(row["Estimated Profit Margin"], "Estimated Profit Margin"),
    netCashFlow: numeric(row["Net Cash Flow"], "Net Cash Flow"),
    marketingSpend: numeric(row["Marketing Spend"], "Marketing Spend"),
    marketingRatio: numeric(row["Marketing Spend % Revenue"], "Marketing Spend % Revenue"),
    uncategorizedExpenses: numeric(row["Uncategorized Expenses"], "Uncategorized Expenses"),
  }));
  const primary = months.filter((month) => month.status === "Complete").at(-1);
  if (!primary) throw new Error("No complete reporting period is available");
  const primaryDate = new Date(`${primary.period} 1`);
  const primaryExpenseKey = `${primaryDate.getFullYear()}-${String(primaryDate.getMonth() + 1).padStart(2, "0")}`;
  const therapists: TherapistMetric[] = therapistRows.map((row) => ({
    name: required(row.Therapist, "Therapist"),
    owner: ["true", "1", "yes"].includes(row["Owner Flag"].toLowerCase()),
    revenue: numeric(row["Gross Revenue"], "Therapist Gross Revenue"),
    collectedRevenue: numeric(row["Collected Revenue"], "Therapist Collected Revenue"),
    scheduledHours: numeric(row["Scheduled Hours"], "Scheduled Hours"),
    bookedHours: numeric(row["Booked Hours"], "Booked Hours"),
    availableHours: numeric(row["Available Hours"], "Available Hours"),
    utilization: numeric(row.Utilization, "Utilization"),
    appointments: numeric(row["Booked Appointments"], "Booked Appointments"),
    appointmentsPerWeek: numeric(row["Appointments / Week"], "Appointments / Week"),
  }));
  const expenses = expenseRows.filter((row) => row.Period.includes(primaryExpenseKey)).map((row) => ({
    category: required(row.Category, "Expense Category"),
    amount: numeric(row["Expense Amount"], "Expense Amount"),
    share: numeric(row["Expense Share"], "Expense Share"),
  }));
  const qualityChecks = qualityRows.map((row) => ({
    check: required(row.Check, "Data Quality Check"),
    status: (row.Status === "PASS" ? "PASS" : "WARNING") as "PASS" | "WARNING",
    actual: numeric(row.Actual, "Quality Actual"),
    expected: numeric(row.Expected, "Quality Expected"),
    difference: numeric(row.Difference, "Quality Difference"),
    notes: row.Notes ?? "",
  }));
  const bookedHours = therapists.reduce((sum, item) => sum + item.bookedHours, 0);
  const scheduledHours = therapists.reduce((sum, item) => sum + item.scheduledHours, 0);
  const bookedAppointments = therapists.reduce((sum, item) => sum + item.appointments, 0);
  const ownerRevenue = therapists.filter((item) => item.owner).reduce((sum, item) => sum + item.revenue, 0);
  const payoutCheck = qualityChecks.find((check) => check.check.toLowerCase().includes("payouts matched"));
  const payoutCount = payoutCheck?.actual ?? 0;
  const payoutValue = qualityChecks.find((check) => check.check === "Payout value matched")?.actual ?? 0;
  const contractorCommissions = therapistRows.reduce((sum, row) => {
    const value = Number(row["Contractor Commission"] || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return validateDashboardData({
    ...ttgDashboardFixture,
    source: { mode: "live", label: "Live Google Sheet", refreshedAt: new Date().toISOString(), spreadsheetId },
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
      payoutReconciliation: payoutCheck?.expected ? payoutCount / payoutCheck.expected : 0,
      payoutsMatched: payoutCount,
      payoutValue,
      outstandingBalance: primary.outstandingBalance,
    },
  });
}

export function validateDashboardData(data: TtgDashboardData) {
  const primary = data.months.find((month) => month.period === data.reportingPeriod);
  if (!primary) throw new Error(`Reporting period ${data.reportingPeriod} is missing`);
  if (primary.status !== "Complete") throw new Error("The primary reporting period must be complete");
  const therapistRevenue = data.therapists.reduce((sum, therapist) => sum + therapist.revenue, 0);
  if (Math.abs(therapistRevenue - primary.grossRevenue) > 0.02) throw new Error("Therapist revenue does not reconcile to gross revenue");
  const expenseTotal = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  if (Math.abs(expenseTotal - primary.operatingExpenses) > 0.02) throw new Error("Expense categories do not reconcile to operating expenses");
  return data;
}

export async function getTtgDashboardData(): Promise<TtgDashboardData> {
  const hasLiveConfig = Boolean(process.env.TTG_DASHBOARD_SPREADSHEET_ID && process.env.TTG_GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.TTG_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  if (hasLiveConfig) return fetchLiveDashboard();
  if (process.env.NODE_ENV === "production") throw new Error("TTG dashboard Google Sheets access is not configured");
  return validateDashboardData(ttgDashboardFixture);
}
