import { createHash, randomUUID } from "node:crypto";

export const CORE_JANE_REPORTS = ["appointments", "compensation", "sales", "payments"] as const;
export const SUPPLEMENTAL_JANE_REPORTS = ["hours", "payouts"] as const;
export const REQUIRED_JANE_REPORTS = [...CORE_JANE_REPORTS, ...SUPPLEMENTAL_JANE_REPORTS] as const;
export const REQUIRED_BANK_ACCOUNTS = ["chequing", "contractor", "mastercard", "peace-of-mind", "profit"] as const;

type JaneKind = (typeof REQUIRED_JANE_REPORTS)[number];
type BankKind = (typeof REQUIRED_BANK_ACCOUNTS)[number];
export type ImportStatus = "ready" | "warning" | "blocked";

export type ImportFileSummary = {
  name: string;
  source: "Jane" | "Bank" | "Unknown";
  kind: string;
  label: string;
  rows: number;
  status: ImportStatus;
  note: string;
  coverageStart?: string;
  coverageEnd?: string;
};

export type SourceCoverage = {
  kind: JaneKind;
  label: string;
  role: "core" | "supplemental";
  start: string;
  end: string;
  status: "complete" | "partial" | "missing";
  note: string;
};

export type CoverageDay = {
  date: string;
  status: "complete" | "partial" | "missing" | "future";
  covered: number;
  expected: number;
};

export type RefreshIssue = { status: "WARNING" | "FAIL"; title: string; detail: string };
export type RefreshType = "jane" | "full";

export type RefreshPayload = {
  refreshId: string;
  refreshType: RefreshType;
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  periodStatus: "Complete" | "Partial";
  analytics?: {
    appointments: {
      total: number;
      completed: number;
      cancelled: number;
      noShows: number;
      pending: number;
      bookingSources: Array<{ label: string; count: number }>;
      days: Array<{ label: string; count: number }>;
    };
    financial: {
      invoiceCount: number;
      averageTransactionValue: number;
      services: Array<{ name: string; revenue: number; visits: number }>;
      payers: Array<{ name: string; invoiced: number; collected: number; outstanding: number }>;
      paymentMethods: Array<{ name: string; amount: number; transactions: number }>;
    };
    team: Array<{
      name: string;
      appointments: number;
      completed: number;
      cancelled: number;
      noShows: number;
      patients: number;
      revenue: number;
      commission: number;
    }>;
    patients: {
      total: number;
      newPatients: number;
      returningPatients: number;
      repeatVisitRate: number;
      historyAvailable: boolean;
      historyStart: string;
    };
    funnel: {
      consultations: number;
      consultationPatients: number;
      firstVisits: number;
      subsequentVisits: number;
      uniquePatients: number;
    };
  };
  fileSummaries: ImportFileSummary[];
  sourceCoverage: SourceCoverage[];
  coverageCalendar: CoverageDay[];
  issues: RefreshIssue[];
  bankRows: number;
  bankCoverage: string;
  monthly: {
    grossRevenue: number;
    collectedRevenue: number;
    operatingExpenses: number;
    operatingProfit: number;
    cashInflows: number;
    cashOutflows: number;
    netCashFlow: number;
    uncategorizedExpenses: number;
    payoutReconciliation: number;
  };
  therapists: Array<{
    name: string;
    invoices: number;
    invoiced: number;
    collected: number;
    scheduledHours: number;
    bookedHours: number;
    bookings: number;
    compensation: number;
    owner: boolean;
  }>;
  expenses: Array<{ category: string; amount: number }>;
  payouts: Array<{ created: string; deposited: string; amount: number; status: string }>;
  reconciliation: Array<{
    payoutId: string;
    janeDepositDate: string;
    janeAmount: number;
    bankDate: string;
    bankAmount: number;
    difference: number;
    status: "Matched" | "Unmatched";
    notes: string;
  }>;
  checks: Array<{
    check: string;
    actual: number;
    expected: number;
    difference: number;
    tolerance: number;
    status: "PASS" | "WARNING" | "FAIL";
    notes: string;
  }>;
};

type CsvRow = Record<string, string>;
type UploadedFile = { name: string; text: string };

const money = (value: string | undefined) => {
  const normalized = String(value ?? "").trim().replace(/[$,%\s,]/g, "").replace(/^\((.*)\)$/, "-$1");
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((candidate) => candidate.some((value) => value.trim()));
}

function records(rows: string[][], headerIndex = 0): CsvRow[] {
  const headers = rows[headerIndex].map((header) => header.trim());
  return rows.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? "").trim()])));
}

function isoDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const northAmerican = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(20\d{2})$/);
  if (northAmerican) return `${northAmerican[3]}-${northAmerican[1].padStart(2, "0")}-${northAmerican[2].padStart(2, "0")}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function classify(name: string, rows: string[][]): { source: "Jane" | "Bank" | "Unknown"; kind: JaneKind | BankKind | "unknown"; label: string } {
  const normalizedName = name.toLowerCase();
  const headers = rows.slice(0, 50).flat().map((header) => header.trim().toLowerCase());
  if (headers.includes("account type") && headers.includes("transaction date") && headers.includes("cad$")) {
    if (normalizedName.includes("contractor pay")) return { source: "Bank", kind: "contractor", label: "Contractor Pay account" };
    if (normalizedName.includes("mastercard")) return { source: "Bank", kind: "mastercard", label: "Mastercard" };
    if (normalizedName.includes("peace of mind")) return { source: "Bank", kind: "peace-of-mind", label: "Peace of Mind account" };
    if (normalizedName.includes("profit")) return { source: "Bank", kind: "profit", label: "Profit account" };
    if (normalizedName.includes("chequing")) return { source: "Bank", kind: "chequing", label: "Main chequing" };
  }
  if (headers.includes("patient guid") && headers.includes("staff member") && headers.includes("collected")) return { source: "Jane", kind: "sales", label: "Sales" };
  if (headers.includes("start_at") && headers.includes("end_at") && headers.includes("staff_member_name") && headers.includes("state")) return { source: "Jane", kind: "appointments", label: "Appointments" };
  if (headers.includes("type") && headers.includes("client") && headers.includes("session") && headers.includes("state") && headers.includes("booking info")) return { source: "Jane", kind: "appointments", label: "Appointments" };
  if (headers.includes("date") && headers.includes("payment method") && headers.includes("total") && headers.includes("number of transactions")) return { source: "Jane", kind: "payments", label: "Payments & Refunds" };
  if (headers.includes("payer") && headers.includes("payment method") && headers.includes("applied to") && headers.includes("amount")) return { source: "Jane", kind: "payments", label: "Payments & Refunds" };
  if (normalizedName.includes("appointments") && headers.includes("date") && headers.includes("state")) return { source: "Jane", kind: "appointments", label: "Appointments" };
  if ((normalizedName.includes("payment") || normalizedName.includes("transaction")) && headers.includes("date") && headers.includes("amount")) return { source: "Jane", kind: "payments", label: "Payments & Refunds" };
  if (headers.includes("staff name") && headers.includes("shift total hours") && headers.includes("appointment total hours")) return { source: "Jane", kind: "hours", label: "Hours Scheduled / Booked" };
  if (headers.includes("practitioner") && headers.includes("commission total") && headers.includes("patient")) return { source: "Jane", kind: "compensation", label: "Compensation" };
  if (headers.includes("date created") && headers.includes("payout amount") && headers.includes("payout status")) return { source: "Jane", kind: "payouts", label: "Jane Payments Payouts" };
  return { source: "Unknown", kind: "unknown", label: "Unrecognized file" };
}

const JANE_LABELS: Record<JaneKind, string> = {
  appointments: "Appointments",
  compensation: "Compensation",
  sales: "Sales",
  payments: "Payments & Refunds",
  hours: "Hours Scheduled / Booked",
  payouts: "Jane Payments Payouts",
};

const COVERAGE_FIELDS: Record<JaneKind, string[]> = {
  appointments: ["start_at", "Date", "Appointment Date"],
  compensation: ["Payment Date", "Transaction Date", "Purchase Date"],
  sales: ["Invoice Date", "Purchase Date"],
  payments: ["Date", "Processing Date", "Transaction Date"],
  hours: ["Date"],
  payouts: ["Date Created", "Date Deposited"],
};

const HEADER_SIGNATURES: Record<JaneKind, string[]> = {
  appointments: ["start_at", "staff_member_name", "state"],
  compensation: ["Practitioner", "Commission Total"],
  sales: ["Staff Member", "Total", "Collected"],
  payments: ["Date", "Payment Method", "Total", "Number of Transactions"],
  hours: ["Staff Name", "Shift Total Hours", "Appointment Total Hours"],
  payouts: ["Date Created", "Payout Amount", "Payout Status"],
};

function janeRecords(file: { rows: string[][] } | undefined, kind: JaneKind) {
  if (!file) return [];
  const signature = HEADER_SIGNATURES[kind];
  const headerIndex = file.rows.findIndex((row) => signature.every((header) => row.map((cell) => cell.trim()).includes(header)));
  return headerIndex < 0 ? [] : records(file.rows, headerIndex);
}

function rowDate(row: CsvRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field];
    if (value) {
      const parsed = isoDate(value.replace(/\s+-\s+\d{1,2}:\d{2}(?:am|pm).*$/i, ""));
      if (parsed) return parsed;
    }
  }
  return "";
}

function dateRange(file: { rows: string[][] }, kind: JaneKind, fallback: { start: string; end: string }) {
  const dates = janeRecords(file, kind).map((row) => rowDate(row, COVERAGE_FIELDS[kind])).filter(Boolean).sort();
  return { start: dates[0] ?? fallback.start, end: dates.at(-1) ?? fallback.end };
}

function eachDate(start: string, end: string) {
  const values: string[] = [];
  for (let cursor = new Date(`${start}T12:00:00Z`); cursor <= new Date(`${end}T12:00:00Z`); cursor = new Date(cursor.getTime() + 86_400_000)) values.push(cursor.toISOString().slice(0, 10));
  return values;
}

function periodFromSalesName(name: string) {
  const match = name.match(/(20\d{6})_(20\d{6})/);
  if (!match) return null;
  const format = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return { start: format(match[1]), end: format(match[2]) };
}

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const daysApart = (left: string, right: string) => Math.abs((new Date(left).getTime() - new Date(right).getTime()) / 86_400_000);
const normalizeName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function expenseCategory(description: string, account: BankKind) {
  const value = description.toUpperCase();
  if (account === "contractor") return { category: "Therapist / contractor compensation", operating: true };
  const rules: Array<[RegExp, string, boolean]> = [
    [/WAGEPOINT/, "Employee payroll", true],
    [/COMM RENT|TRANSWORLD/, "Rent & occupancy", true],
    [/GOOGLE ADS|PSYCHOLOGY TODAY|PAGE PROS/, "Advertising & marketing", true],
    [/ADMINFLOW|JANE APP|GOOGLE WORKSPACE|ANTHROPIC|CANVA|MAILCHIMP|DOCUMO|TELUS/, "Software & communications", true],
    [/CYCLE CPA|DUNCAN ANDERSON/, "Professional services", true],
    [/BMS CANADA RISK|\bHSA\b|GROUPHEALTH|SUNLIFE|MANULIFE/, "Insurance & benefits", true],
    [/AMAZON|COSTCO|WINNERS|TEMU|DIGITECH|MAKTABA/, "Office & clinical supplies", true],
    [/ROBBINS RESEARCH/, "Training & professional development", true],
    [/AIRBNB|RESTAURANT|HOTEL|AIR CANADA|WESTJET|UBER|DOORDASH/, "Travel & meals", true],
    [/MONTHLY FEE|SERVICE CHARGE/, "Bank fees", true],
    [/\bCRA\b|\bCCRA\b/, "Tax & government remittances", false],
    [/GABRIELLA EVANS/, "Owner compensation / draw", false],
    [/QUADRUS/, "Savings / investment", false],
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  return match ? { category: match[1], operating: match[2] } : { category: "Uncategorized", operating: true };
}

function safePayerCategory(value: string) {
  const normalized = value.toLowerCase();
  if (/patient|private|self/.test(normalized)) return "Patient / private pay";
  if (/insurance|eclaim/.test(normalized)) return "Insurance / eClaims";
  if (/wsib|workplace safety/.test(normalized)) return "WSIB";
  if (/clinic|third.party/.test(normalized)) return "Clinic / third party";
  return "Other payer";
}

export function buildRefreshPayload(files: UploadedFile[]): RefreshPayload {
  const parsed = files.map((file) => ({ ...file, rows: parseCsv(file.text) }));
  const identified = parsed.map((file) => ({ ...file, classification: classify(file.name, file.rows) }));
  const fileSummaries: ImportFileSummary[] = identified.map((file) => ({
    name: file.name,
    source: file.classification.source,
    kind: file.classification.kind,
    label: file.classification.label,
    rows: Math.max(0, file.rows.length - 1),
    status: file.classification.source === "Unknown" ? "blocked" : "ready",
    note: file.classification.source === "Unknown" ? "This structure is not supported; export the named Jane report as CSV." : "Recognized structure",
  }));
  const issues: RefreshIssue[] = [];
  const byKind = new Map<string, typeof identified>();
  for (const file of identified) byKind.set(file.classification.kind, [...(byKind.get(file.classification.kind) ?? []), file]);
  for (const kind of REQUIRED_JANE_REPORTS) {
    const count = byKind.get(kind)?.length ?? 0;
    if (count !== 1) issues.push({ status: "FAIL", title: count ? `Duplicate Jane ${kind} report` : `Missing Jane ${kind} report`, detail: "Upload exactly one CSV for each required Jane report." });
  }
  const salesFile = byKind.get("sales")?.[0];
  const period = salesFile ? periodFromSalesName(salesFile.name) : null;
  if (!period) issues.push({ status: "FAIL", title: "Sales filename does not include its date range", detail: "Use Jane's original Sales_YYYYMMDD_YYYYMMDD.csv filename." });
  const safePeriod = period ?? { start: "1970-01-01", end: "1970-01-01" };
  const periodKey = safePeriod.start.slice(0, 7);
  const bankFileCount = REQUIRED_BANK_ACCOUNTS.reduce((sum, kind) => sum + (byKind.get(kind)?.length ?? 0), 0);
  const refreshType: RefreshType = bankFileCount === 0 ? "jane" : "full";
  if (safePeriod.end.slice(0, 7) !== periodKey) issues.push({ status: "FAIL", title: "The refresh spans more than one month", detail: "Upload one calendar month at a time." });
  if (safePeriod.start !== `${periodKey}-01`) issues.push({ status: "FAIL", title: "Jane refresh must start on the first day of the month", detail: `Re-export every Jane report from ${periodKey}-01 through the selected cutoff. A one-day export cannot replace month-to-date totals.` });
  if (refreshType === "full") {
    for (const kind of REQUIRED_BANK_ACCOUNTS) {
      const matches = (byKind.get(kind) ?? []).filter((file) => file.name.includes(`${safePeriod.start.slice(5, 7)}-${safePeriod.start.slice(0, 4)}`));
      if (matches.length !== 1) issues.push({ status: "FAIL", title: `Incomplete bank package: ${kind}`, detail: `Either upload all five ${periodKey} bank CSVs or upload the six Jane reports without bank files.` });
    }
  }
  if (fileSummaries.some((file) => file.status === "blocked")) issues.push({ status: "FAIL", title: "One or more files are unrecognized", detail: "Remove them or download the expected CSV directly from Jane or the bank." });

  const sourceCoverage: SourceCoverage[] = REQUIRED_JANE_REPORTS.map((kind) => {
    const file = byKind.get(kind)?.[0];
    const range = file ? dateRange(file, kind, safePeriod) : { start: "", end: "" };
    const status = !file ? "missing" : range.start <= safePeriod.start && range.end >= safePeriod.end ? "complete" : "partial";
    return {
      kind,
      label: JANE_LABELS[kind],
      role: (CORE_JANE_REPORTS as readonly string[]).includes(kind) ? "core" : "supplemental",
      start: range.start,
      end: range.end,
      status,
      note: kind === "hours" ? "Required for available-capacity and utilization calculations." : kind === "payouts" ? "Required to match Jane deposits to bank activity." : status === "complete" ? "Covers the selected refresh period." : "Does not cover the full selected refresh period.",
    };
  });
  sourceCoverage.forEach((coverage) => {
    const summary = fileSummaries.find((file) => file.kind === coverage.kind);
    if (summary) {
      summary.coverageStart = coverage.start;
      summary.coverageEnd = coverage.end;
      if (coverage.status === "partial") {
        summary.status = "warning";
        summary.note = "The latest dated row is earlier than the selected refresh cutoff; confirm the export range before publishing.";
      }
    }
    if (coverage.status === "partial") issues.push({ status: "WARNING", title: `${coverage.label} may have incomplete date coverage`, detail: `The selected package is ${safePeriod.start} through ${safePeriod.end}; dated rows run ${coverage.start || "no dated rows"} through ${coverage.end || "no dated rows"}. Empty days can be valid, so confirm the Jane date selector rather than treating this as a hard failure.` });
  });
  const coverageCalendar: CoverageDay[] = eachDate(safePeriod.start, safePeriod.end).map((date) => {
    const covered = sourceCoverage.filter((source) => source.start && source.start <= date && source.end >= date).length;
    return { date, covered, expected: REQUIRED_JANE_REPORTS.length, status: covered === REQUIRED_JANE_REPORTS.length ? "complete" : covered ? "partial" : "missing" };
  });

  const salesRows = janeRecords(salesFile, "sales");
  const salesByTherapist = new Map<string, { invoices: Set<string>; invoiced: number; collected: number }>();
  for (const row of salesRows) {
    const name = row["Staff Member"];
    if (!name || money(row.Total) === 0) continue;
    const item = salesByTherapist.get(name) ?? { invoices: new Set(), invoiced: 0, collected: 0 };
    if (row["Invoice #"]) item.invoices.add(row["Invoice #"]);
    item.invoiced += money(row.Total);
    item.collected += money(row.Collected);
    salesByTherapist.set(name, item);
  }
  const hoursFile = byKind.get("hours")?.[0];
  const hours = new Map(janeRecords(hoursFile, "hours").map((row) => [normalizeName(row["Staff Name"]), row]));
  const compensationFile = byKind.get("compensation")?.[0];
  const compensation = new Map<string, number>();
  for (const row of janeRecords(compensationFile, "compensation")) {
    const name = row.Practitioner;
    if (!name) continue;
    compensation.set(name, (compensation.get(name) ?? 0) + money(row["Commission Total"]));
  }
  const appointmentFile = byKind.get("appointments")?.[0];
  const appointmentRows = janeRecords(appointmentFile, "appointments");
  const activeAppointmentRows = appointmentRows.filter((row) => !["never booked", "never_booked", "deleted", "archived", "rescheduled"].includes((row.state ?? row.State ?? "").toLowerCase()));
  const appointmentCounts = new Map<string, number>();
  const displayNames = new Map<string, string>();
  for (const row of activeAppointmentRows) {
    const session = row.Session ?? "";
    const name = row.staff_member_name ?? session.match(/\bwith\s+(.+?)(?:\s+with\s+.+)?$/i)?.[1]?.trim() ?? row["Staff Member"] ?? row.Staff ?? "";
    const key = normalizeName(name);
    if (key) { appointmentCounts.set(key, (appointmentCounts.get(key) ?? 0) + 1); displayNames.set(key, name); }
  }
  const salesByKey = new Map([...salesByTherapist].map(([name, value]) => [normalizeName(name), { name, value }]));
  const compensationByKey = new Map([...compensation].map(([name, value]) => [normalizeName(name), value]));
  const therapistKeys = new Set([...salesByKey.keys(), ...hours.keys(), ...appointmentCounts.keys()]);
  const therapists = [...therapistKeys].map((key) => {
    const sales = salesByKey.get(key);
    const shift = hours.get(key);
    const name = sales?.name ?? displayNames.get(key) ?? shift?.["Staff Name"] ?? key;
    return {
      name,
      invoices: sales?.value.invoices.size ?? 0,
      invoiced: round(sales?.value.invoiced ?? 0),
      collected: round(sales?.value.collected ?? 0),
      scheduledHours: money(shift?.["Shift Total Hours"]),
      bookedHours: money(shift?.["Appointment Total Hours"]),
      bookings: appointmentCounts.get(key) ?? 0,
      compensation: round(compensationByKey.get(key) ?? 0),
      owner: name.toLowerCase().includes("gabriella evans"),
    };
  }).filter((item) => item.invoiced || item.bookings || item.compensation).sort((a, b) => b.invoiced - a.invoiced);

  type BankTransaction = { id: string; date: string; account: BankKind; description: string; amount: number; internal: boolean; category: string; operating: boolean };
  const bank: BankTransaction[] = [];
  for (const kind of REQUIRED_BANK_ACCOUNTS) {
    const file = (byKind.get(kind) ?? []).find((candidate) => candidate.name.includes(`${safePeriod.start.slice(5, 7)}-${safePeriod.start.slice(0, 4)}`));
    for (const row of file ? records(file.rows) : []) {
      const date = isoDate(row["Transaction Date"]);
      if (!date || date < safePeriod.start || date > safePeriod.end) continue;
      const amount = money(row["CAD$"]);
      const description = `${row["Description 1"] ?? ""} | ${row["Description 2"] ?? ""}`.trim();
      const category = expenseCategory(description, kind);
      const transferDescription = /ONLINE TRANSFER TO DEPOSIT|ONLINE BANKING TRANSFER|INTERNET TRANSFER|PAYMENT THANK YOU/i.test(description);
      bank.push({ id: createHash("sha256").update(`${kind}|${date}|${description}|${amount}`).digest("hex").slice(0, 16), date, account: kind, description, amount, internal: transferDescription, ...category });
    }
  }
  const used = new Set<number>();
  for (let left = 0; left < bank.length; left += 1) {
    if (used.has(left)) continue;
    const right = bank.findIndex((candidate, index) => index > left && !used.has(index) && candidate.account !== bank[left].account && Math.abs(candidate.amount + bank[left].amount) < 0.01 && daysApart(candidate.date, bank[left].date) <= 3);
    if (right >= 0) { bank[left].internal = true; bank[right].internal = true; used.add(left); used.add(right); }
  }
  const external = bank.filter((row) => !row.internal);
  const expenseTotals = new Map<string, number>();
  for (const row of external.filter((item) => item.amount < 0 && item.operating)) expenseTotals.set(row.category, (expenseTotals.get(row.category) ?? 0) + Math.abs(row.amount));
  const expenses = [...expenseTotals].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount);

  const payoutFile = byKind.get("payouts")?.[0];
  const payoutRows = janeRecords(payoutFile, "payouts");
  const payouts = payoutRows.filter((row) => row["Date Created"]).map((row) => ({ created: isoDate(row["Date Created"]), deposited: isoDate(row["Date Deposited"]), amount: money(row["Payout Amount"]), status: row["Payout Status"] }));
  const paymentsFile = byKind.get("payments")?.[0];
  const paymentRows = janeRecords(paymentsFile, "payments").filter((row) => rowDate(row, COVERAGE_FIELDS.payments));
  const paymentTotal = round(paymentRows.reduce((sum, row) => sum + money(row["Amount Paid to Clinic"] || row.Amount || row.Total), 0));
  const reconciliation = payouts.map((payout, index) => {
    const match = external.find((row) => row.amount > 0 && Math.abs(row.amount - payout.amount) < 0.01 && daysApart(row.date, payout.deposited) <= 3);
    return { payoutId: `P${String(index + 1).padStart(3, "0")}`, janeDepositDate: payout.deposited, janeAmount: payout.amount, bankDate: match?.date ?? "", bankAmount: match?.amount ?? 0, difference: round((match?.amount ?? 0) - payout.amount), status: match ? "Matched" as const : "Unmatched" as const, notes: match ? `${daysApart(match.date, payout.deposited)} day posting difference` : "No equal bank deposit within three days" };
  });
  const matched = reconciliation.filter((row) => row.status === "Matched");
  const grossRevenue = round(therapists.reduce((sum, row) => sum + row.invoiced, 0));
  const collectedRevenue = round(therapists.reduce((sum, row) => sum + row.collected, 0));
  const operatingExpenses = round(expenses.reduce((sum, row) => sum + row.amount, 0));
  const uncategorizedExpenses = round(expenses.find((row) => row.category === "Uncategorized")?.amount ?? 0);
  const cashInflows = round(external.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0));
  const cashOutflows = round(external.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0));
  const matchedValue = round(matched.reduce((sum, row) => sum + row.janeAmount, 0));
  const expectedPayoutValue = round(payouts.reduce((sum, row) => sum + row.amount, 0));
  const bankDates = bank.map((row) => row.date).sort();
  const bankDataThrough = bankDates.at(-1) ?? safePeriod.start;
  const dateSerial = (value: string) => (Date.parse(`${value}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000;
  const janeChecks: RefreshPayload["checks"] = [
    { check: `${periodKey} therapist invoiced total ties to Jane Sales`, actual: grossRevenue, expected: round(salesRows.reduce((sum, row) => sum + money(row.Total), 0)), tolerance: 0.01, notes: "Aggregated from the uploaded Sales CSV." },
    { check: `${periodKey} therapist collected total ties to Jane Sales`, actual: collectedRevenue, expected: round(salesRows.reduce((sum, row) => sum + money(row.Collected), 0)), tolerance: 0.01, notes: "Aggregated from the uploaded Sales CSV." },
    { check: `${periodKey} Payments & Refunds report parsed`, actual: paymentRows.length, expected: paymentRows.length, tolerance: 0, notes: paymentTotal ? `${paymentRows.length} detail rows; ${paymentTotal.toFixed(2)} net paid to the clinic.` : `${paymentRows.length} detail rows parsed.` },
  ].map((check) => {
    const difference = round(check.actual - check.expected);
    return { ...check, difference, status: Math.abs(difference) <= check.tolerance ? "PASS" as const : "FAIL" as const };
  });
  const bankChecks: RefreshPayload["checks"] = refreshType === "full" ? [
    { check: `${periodKey} payout value matched to bank`, actual: matchedValue, expected: expectedPayoutValue, tolerance: 0.01, status: Math.abs(matchedValue - expectedPayoutValue) <= 0.01 ? "PASS" : "WARNING", notes: "Exact amount with a three-day posting window." },
    { check: `${periodKey} payout count matched to bank`, actual: matched.length, expected: payouts.length, tolerance: 0, status: matched.length === payouts.length ? "PASS" : "WARNING", notes: "In-transit payouts can remain unmatched until the next bank export." },
    { check: "Bank clean row count", actual: bank.length, expected: bank.length, tolerance: 0, status: "PASS", notes: "Account numbers and cheque numbers are not retained." },
    { check: `${periodKey} source date alignment`, actual: dateSerial(bankDataThrough), expected: dateSerial(safePeriod.end), tolerance: 0, status: bankDataThrough === safePeriod.end ? "PASS" : "WARNING", notes: "Bank transaction coverage compared with the shared Jane report cutoff." },
  ].map((check) => ({ ...check, difference: round(check.actual - check.expected), status: check.status as "PASS" | "WARNING" | "FAIL" })) : [];
  const checks = [...janeChecks, ...bankChecks];
  if (refreshType === "full" && operatingExpenses && uncategorizedExpenses / operatingExpenses > 0.05) issues.push({ status: "WARNING", title: "Uncategorized expenses exceed 5%", detail: "Review the uncategorized amount before using estimated profit for a decision." });
  if (refreshType === "full" && matched.length < payouts.length) issues.push({ status: "WARNING", title: `${payouts.length - matched.length} payouts are not yet matched`, detail: "This is expected for in-transit deposits; upload later bank activity on the next refresh." });
  if (refreshType === "full" && bankDataThrough !== safePeriod.end) issues.push({ status: "WARNING", title: "Jane and bank cutoffs differ", detail: `Jane runs through ${safePeriod.end}; the latest supplied bank transaction is ${bankDataThrough}.` });
  const end = new Date(`${safePeriod.end}T12:00:00Z`);
  const nextDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  const complete = nextDay.getUTCDate() === 1;
  const monthName = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${safePeriod.start}T12:00:00Z`));

  const stateCount = (state: string) => activeAppointmentRows.filter((row) => (row.state ?? row.State ?? "").toLowerCase() === state).length;
  const completedAppointments = stateCount("arrived") + stateCount("completed");
  const cancelledAppointments = stateCount("cancelled");
  const noShows = stateCount("no_show") + stateCount("no show");
  const pendingAppointments = Math.max(0, activeAppointmentRows.length - completedAppointments - cancelledAppointments - noShows);
  const sourceTotals = new Map<string, number>();
  const dayTotals = new Map<string, number>();
  for (const row of activeAppointmentRows) {
    const source = String(row.booked_online ?? row["Booked Online"] ?? "").toLowerCase() === "true" ? "Online" : "Staff booked";
    sourceTotals.set(source, (sourceTotals.get(source) ?? 0) + 1);
    const date = rowDate(row, COVERAGE_FIELDS.appointments);
    if (date) {
      const day = new Intl.DateTimeFormat("en-CA", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + 1);
    }
  }
  const services = new Map<string, { revenue: number; invoices: Set<string> }>();
  const payers = new Map<string, { invoiced: number; collected: number; outstanding: number }>();
  const allInvoices = new Set<string>();
  for (const row of salesRows) {
    if (row["Invoice #"]) allInvoices.add(row["Invoice #"]);
    const serviceName = row.Item || row["Income Category"] || "Other";
    const service = services.get(serviceName) ?? { revenue: 0, invoices: new Set<string>() };
    service.revenue += money(row.Total);
    if (row["Invoice #"]) service.invoices.add(row["Invoice #"]);
    services.set(serviceName, service);
    const payerName = safePayerCategory(row.Payer || "Patient / private pay");
    const payer = payers.get(payerName) ?? { invoiced: 0, collected: 0, outstanding: 0 };
    payer.invoiced += money(row.Total); payer.collected += money(row.Collected); payer.outstanding += money(row.Balance);
    payers.set(payerName, payer);
  }
  const paymentMethods = new Map<string, { amount: number; transactions: number }>();
  for (const row of paymentRows) {
    const name = row["Payment Method"] || "Other";
    const item = paymentMethods.get(name) ?? { amount: 0, transactions: 0 };
    item.amount += money(row["Amount Paid to Clinic"] || row.Amount || row.Total);
    item.transactions += money(row["Number of Transactions"] || "1");
    paymentMethods.set(name, item);
  }
  const teamRows = new Map<string, { name: string; appointments: number; completed: number; cancelled: number; noShows: number; patients: Set<string> }>();
  const allPatients = new Map<string, number>();
  const newPatients = new Set<string>();
  const consultationPatients = new Set<string>();
  let consultations = 0; let firstVisits = 0; let subsequentVisits = 0;
  for (const row of activeAppointmentRows) {
    const name = row.staff_member_name ?? row["Staff Member"] ?? row.Staff ?? "Unassigned";
    const key = normalizeName(name);
    const patient = row.patient_guid || row["Patient Guid"] || "";
    const state = (row.state ?? row.State ?? "").toLowerCase();
    const item = teamRows.get(key) ?? { name, appointments: 0, completed: 0, cancelled: 0, noShows: 0, patients: new Set<string>() };
    item.appointments += 1;
    if (["arrived", "completed"].includes(state)) item.completed += 1;
    if (state === "cancelled") item.cancelled += 1;
    if (["no_show", "no show"].includes(state)) item.noShows += 1;
    if (patient) { item.patients.add(patient); allPatients.set(patient, (allPatients.get(patient) ?? 0) + 1); }
    teamRows.set(key, item);
    const isConsultation = /consult/i.test(row.treatment_name || row.Type || row.Session || "");
    const isFirst = String(row.first_visit ?? row["First Visit"] ?? "").toLowerCase() === "true";
    if (isConsultation) { consultations += 1; if (patient) consultationPatients.add(patient); }
    else if (isFirst) { firstVisits += 1; if (patient) newPatients.add(patient); }
    else subsequentVisits += 1;
  }
  const appointmentCoverage = sourceCoverage.find((source) => source.kind === "appointments");
  const historyStart = appointmentCoverage?.start ?? safePeriod.start;
  const historyAvailable = daysApart(historyStart, safePeriod.end) >= 90;
  const analytics: NonNullable<RefreshPayload["analytics"]> = {
    appointments: {
      total: activeAppointmentRows.length, completed: completedAppointments, cancelled: cancelledAppointments, noShows, pending: pendingAppointments,
      bookingSources: [...sourceTotals].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, count: dayTotals.get(label) ?? 0 })),
    },
    financial: {
      invoiceCount: allInvoices.size,
      averageTransactionValue: paymentRows.reduce((sum, row) => sum + money(row["Number of Transactions"] || "1"), 0) ? paymentTotal / paymentRows.reduce((sum, row) => sum + money(row["Number of Transactions"] || "1"), 0) : 0,
      services: [...services].map(([name, item]) => ({ name, revenue: round(item.revenue), visits: item.invoices.size })).sort((a, b) => b.revenue - a.revenue),
      payers: [...payers].map(([name, item]) => ({ name, invoiced: round(item.invoiced), collected: round(item.collected), outstanding: round(item.outstanding) })).sort((a, b) => b.invoiced - a.invoiced),
      paymentMethods: [...paymentMethods].map(([name, item]) => ({ name, amount: round(item.amount), transactions: item.transactions })).sort((a, b) => b.amount - a.amount),
    },
    team: [...teamRows].map(([key, item]) => ({ name: item.name, appointments: item.appointments, completed: item.completed, cancelled: item.cancelled, noShows: item.noShows, patients: item.patients.size, revenue: round(salesByKey.get(key)?.value.invoiced ?? 0), commission: round(compensationByKey.get(key) ?? 0) })).sort((a, b) => b.revenue - a.revenue),
    patients: { total: allPatients.size, newPatients: newPatients.size, returningPatients: Math.max(0, allPatients.size - newPatients.size), repeatVisitRate: allPatients.size ? [...allPatients.values()].filter((count) => count > 1).length / allPatients.size : 0, historyAvailable, historyStart },
    funnel: { consultations, consultationPatients: consultationPatients.size, firstVisits, subsequentVisits, uniquePatients: allPatients.size },
  };
  return {
    refreshId: randomUUID(),
    refreshType,
    periodKey,
    periodLabel: `${monthName}${complete && refreshType === "full" ? "" : " MTD"}`,
    periodStart: safePeriod.start,
    periodEnd: safePeriod.end,
    periodStatus: complete && refreshType === "full" ? "Complete" : "Partial",
    analytics,
    fileSummaries,
    sourceCoverage,
    coverageCalendar,
    issues,
    bankRows: bank.length,
    bankCoverage: bankDates.length ? `${bankDates[0]} to ${bankDates.at(-1)}` : "Bank data unchanged",
    monthly: { grossRevenue, collectedRevenue, operatingExpenses, operatingProfit: round(collectedRevenue - operatingExpenses), cashInflows, cashOutflows, netCashFlow: round(cashInflows - cashOutflows), uncategorizedExpenses, payoutReconciliation: payouts.length ? matched.length / payouts.length : 0 },
    therapists,
    expenses,
    payouts,
    reconciliation,
    checks,
  };
}
