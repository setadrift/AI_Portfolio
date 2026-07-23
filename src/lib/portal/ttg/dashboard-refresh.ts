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

export type AnalyticsDailyRow = {
  date: string;
  entity: "clinic" | "practitioner" | "service" | "payer" | "payment_method" | "booking_source" | "hour";
  name: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShows: number;
  pending: number;
  invoiced: number;
  collected: number;
  processed: number;
  outstanding: number;
  commission: number;
  transactions: number;
  completedTransactions: number;
  completedTransactionValue: number;
  fees: number;
  refunds: number;
  patients: number;
  newPatients: number;
  consultations: number;
  firstVisits: number;
  subsequentVisits: number;
  bookedMinutes: number;
  recovered: number;
  paymentLagDays: number;
  paymentLagSamples: number;
};

export type RetentionCohortRow = {
  cohortMonth: string;
  entity: "clinic" | "practitioner" | "service";
  name: string;
  cohortSize: number;
  eligible30: number;
  retained30: number;
  eligible60: number;
  retained60: number;
  eligible90: number;
  retained90: number;
  repeatPatients: number;
  visitGapDays: number;
  visitGapSamples: number;
};

export type RefreshPrivateFacts = {
  appointments: Array<{
    recordKey: string;
    occurredAt: string;
    date: string;
    service: string;
    practitioner: string;
    state: string;
    durationMinutes: number;
    bookingSource: string;
    patientKey: string | null;
    firstVisit: boolean;
    consultation: boolean;
    recovered: boolean;
  }>;
  transactions: Array<{
    recordKey: string;
    date: string;
    practitioner: string;
    service: string;
    revenue: number;
    collected: number;
    commission: number;
    paymentMethod: string;
    status: string;
    patientKey: string | null;
  }>;
  sales: Array<{
    recordKey: string;
    date: string;
    invoiceKey: string;
    item: string;
    practitioner: string;
    payerCategory: string;
    status: string;
    subtotal: number;
    total: number;
    collected: number;
    outstanding: number;
  }>;
  collections: Array<{
    recordKey: string;
    date: string;
    method: string;
    amount: number;
    transactionCount: number;
  }>;
};

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
  analyticsRows: AnalyticsDailyRow[];
  cohortRows: RetentionCohortRow[];
  privateFacts?: RefreshPrivateFacts;
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

function dedupeJaneRows(kind: JaneKind, rows: CsvRow[]) {
  const fields: Record<JaneKind, string[]> = {
    appointments: ["id"],
    compensation: ["Invoice #", "Description", "Practitioner", "Transaction Date", "Payment Date", "Collected Total", "Commission Total", "Quantity", "Income Category"],
    sales: ["Invoice #", "Patient Guid", "Item", "Staff Member", "Total", "Collected", "Balance", "Details", "Status"],
    payments: ["Date", "Payer", "Payment Method", "Applied To", "Total", "Number of Transactions", "Amount"],
    hours: ["Date", "Staff Name", "Shift Total Hours", "Appointment Total Hours"],
    payouts: ["Date Created", "Date Deposited", "Payout Amount", "Payout Status"],
  };
  const unique = new Map<string, CsvRow>();
  rows.forEach((row) => {
    const values = fields[kind].map((field) => row[field] ?? "");
    const key = values.some(Boolean) ? values.join("\u001f") : JSON.stringify(row);
    unique.set(key, row);
  });
  return [...unique.values()];
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
const privateKey = (namespace: string, value: string) => value
  ? createHash("sha256").update(`ttg-reporting-v1|${namespace}|${value}`).digest("hex")
  : "";
const latestCompleteTorontoDate = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const today = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
};

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

type AnalyticsAccumulator = Omit<AnalyticsDailyRow, "date" | "entity" | "name" | "patients"> & {
  patientIds: Set<string>;
};

function buildAnalyticsRows(
  appointmentRows: CsvRow[],
  salesRows: CsvRow[],
  compensationRows: CsvRow[],
  paymentRows: CsvRow[],
  dataThrough: string,
) {
  const daily = new Map<string, AnalyticsAccumulator>();
  const base = (): AnalyticsAccumulator => ({
    appointments: 0, completed: 0, cancelled: 0, noShows: 0, pending: 0,
    invoiced: 0, collected: 0, processed: 0, outstanding: 0, commission: 0, transactions: 0,
    completedTransactions: 0, completedTransactionValue: 0,
    fees: 0, refunds: 0, patientIds: new Set(), newPatients: 0, consultations: 0,
    firstVisits: 0, subsequentVisits: 0, bookedMinutes: 0, recovered: 0,
    paymentLagDays: 0, paymentLagSamples: 0,
  });
  const add = (
    date: string,
    entity: AnalyticsDailyRow["entity"],
    name: string,
    update: Partial<Omit<AnalyticsDailyRow, "date" | "entity" | "name" | "patients">> & { patientId?: string },
  ) => {
    if (!date || !name) return;
    const key = `${date}\u001f${entity}\u001f${name}`;
    const row = daily.get(key) ?? base();
    for (const [field, value] of Object.entries(update)) {
      if (field === "patientId") continue;
      const numericValue = Number(value ?? 0);
      if (Number.isFinite(numericValue)) (row as unknown as Record<string, number>)[field] = ((row as unknown as Record<string, number>)[field] ?? 0) + numericValue;
    }
    if (update.patientId) row.patientIds.add(update.patientId);
    daily.set(key, row);
  };
  const dimensions = (
    date: string,
    update: Parameters<typeof add>[3],
    values: Array<[AnalyticsDailyRow["entity"], string]>,
  ) => {
    add(date, "clinic", "Clinic", update);
    values.forEach(([entity, name]) => add(date, entity, name || "Unassigned", update));
  };

  const activeAppointments = appointmentRows.filter((row) => !["never booked", "never_booked", "deleted", "archived", "rescheduled"].includes((row.state ?? row.State ?? "").toLowerCase()));
  const patientVisits = new Map<string, Array<{ date: string; practitioner: string; service: string; first: boolean }>>();
  const missedAppointments: Array<{ date: string; patientId: string; practitioner: string }> = [];
  for (const row of activeAppointments) {
    const date = rowDate(row, COVERAGE_FIELDS.appointments);
    if (!date || date > dataThrough) continue;
    const state = (row.state ?? row.State ?? "").toLowerCase();
    const practitioner = row.staff_member_name ?? row["Staff Member"] ?? row.Staff ?? "Unassigned";
    const service = row.treatment_name || row.Type || row.Session || "Unknown service";
    const bookingSource = String(row.booked_online ?? row["Booked Online"] ?? "").toLowerCase() === "true" ? "Online" : "Staff booked";
    const patientId = row.patient_guid || row["Patient Guid"] || "";
    const isConsultation = /consult/i.test(service);
    const isFirst = String(row.first_visit ?? row["First Visit"] ?? "").toLowerCase() === "true";
    const startValue = row.start_at || row["Start At"] || row.Date || `${date}T00:00:00Z`;
    const start = new Date(startValue);
    const end = new Date(row.end_at || row["End At"] || row.Date || `${date}T00:00:00Z`);
    const bookedMinutes = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) ? Math.max(0, (end.getTime() - start.getTime()) / 60_000) : 0;
    const update = {
      appointments: 1,
      completed: ["arrived", "completed", "in-progress", "in_progress", "in progress"].includes(state) ? 1 : 0,
      cancelled: state === "cancelled" ? 1 : 0,
      noShows: ["no_show", "no show"].includes(state) ? 1 : 0,
      pending: ["arrived", "completed", "in-progress", "in_progress", "in progress", "cancelled", "no_show", "no show"].includes(state) ? 0 : 1,
      consultations: isConsultation ? 1 : 0,
      firstVisits: !isConsultation && isFirst ? 1 : 0,
      subsequentVisits: !isConsultation && !isFirst ? 1 : 0,
      newPatients: isFirst ? 1 : 0,
      bookedMinutes,
      patientId,
    };
    const hour = String(startValue).match(/[T ](\d{1,2}):/)?.[1]?.padStart(2, "0") ?? (Number.isFinite(start.getTime()) ? String(start.getUTCHours()).padStart(2, "0") : "Unknown");
    dimensions(date, update, [["practitioner", practitioner], ["service", service], ["booking_source", bookingSource], ["hour", hour]]);
    if (patientId && ["arrived", "completed", "no_show", "no show"].includes(state)) {
      patientVisits.set(patientId, [
        ...(patientVisits.get(patientId) ?? []),
        {
          date,
          practitioner,
          service,
          // A no-show can satisfy AdminFlow's return-activity rule, but it
          // cannot establish the patient's completed first-visit cohort.
          first: ["arrived", "completed"].includes(state) && isFirst,
        },
      ]);
    }
    if (patientId && (state === "cancelled" || state === "no_show" || state === "no show")) missedAppointments.push({ date, patientId, practitioner });
  }
  for (const missed of missedAppointments) {
    const recovered = (patientVisits.get(missed.patientId) ?? []).some((visit) => visit.date > missed.date);
    if (recovered) dimensions(missed.date, { recovered: 1 }, [["practitioner", missed.practitioner]]);
  }

  for (const row of salesRows) {
    const date = rowDate(row, COVERAGE_FIELDS.sales);
    if (!date || date > dataThrough) continue;
    const invoice = money(row.Total);
    const collected = money(row.Collected);
    const paid = (row.Status || "").toLowerCase() === "paid";
    const update = {
      invoiced: invoice,
      collected,
      outstanding: money(row.Balance),
      completedTransactions: paid ? 1 : 0,
      completedTransactionValue: paid ? collected : 0,
    };
    dimensions(date, update, [
      ["practitioner", row["Staff Member"] || "Unassigned"],
      ["service", row.Item || row["Income Category"] || "Other"],
      ["payer", safePayerCategory(row.Payer || "Patient / private pay")],
    ]);
  }

  for (const row of compensationRows) {
    const date = rowDate(row, COVERAGE_FIELDS.compensation);
    if (!date || date > dataThrough) continue;
    const purchaseDate = isoDate(row["Purchase Date"]);
    const paymentDate = isoDate(row["Payment Date"]);
    const lag = purchaseDate && paymentDate ? daysApart(paymentDate, purchaseDate) : 0;
    dimensions(date, { commission: money(row["Commission Total"]), paymentLagDays: lag, paymentLagSamples: purchaseDate && paymentDate ? 1 : 0 }, [["practitioner", row.Practitioner || "Unassigned"]]);
  }

  for (const row of paymentRows) {
    const date = rowDate(row, COVERAGE_FIELDS.payments);
    if (!date || date > dataThrough) continue;
    const method = row["Payment Method"] || "Other";
    const amount = money(row["Amount Paid to Clinic"] || row.Amount || row.Total);
    const transactions = money(row["Number of Transactions"] || "1");
    const fees = /fee/i.test(method) ? Math.abs(amount) : 0;
    const refunds = /refund/i.test(method) || amount < 0 && !/fee/i.test(method) ? Math.abs(amount) : 0;
    const update = { transactions, fees, refunds };
    dimensions(date, { ...update, processed: amount }, [["payment_method", method]]);
  }

  const cohortMap = new Map<string, { patientIds: Set<string>; eligible30: number; retained30: number; eligible60: number; retained60: number; eligible90: number; retained90: number; repeatPatients: number; visitGapDays: number; visitGapSamples: number }>();
  const cohortBase = () => ({ patientIds: new Set<string>(), eligible30: 0, retained30: 0, eligible60: 0, retained60: 0, eligible90: 0, retained90: 0, repeatPatients: 0, visitGapDays: 0, visitGapSamples: 0 });
  const addCohort = (patientId: string, visits: Array<{ date: string; practitioner: string; service: string; first: boolean }>, entity: RetentionCohortRow["entity"], name: string) => {
    const ordered = [...visits].sort((a, b) => a.date.localeCompare(b.date));
    const first = ordered.find((visit) => visit.first);
    if (!first) return;
    const eligibleVisits = ordered.filter((visit) => visit.date >= first.date);
    const key = `${first.date.slice(0, 7)}\u001f${entity}\u001f${name}`;
    const group = cohortMap.get(key) ?? cohortBase();
    if (group.patientIds.has(patientId)) return;
    group.patientIds.add(patientId);
    const gaps = eligibleVisits.slice(1).map((visit, index) => daysApart(visit.date, eligibleVisits[index].date)).filter((gap) => gap >= 0);
    const maturity = daysApart(dataThrough, first.date);
    const retainedWithin = (days: number) => eligibleVisits.slice(1).some((visit) => daysApart(visit.date, first.date) <= days);
    if (maturity >= 30) { group.eligible30 += 1; if (retainedWithin(30)) group.retained30 += 1; }
    if (maturity >= 60) { group.eligible60 += 1; if (retainedWithin(60)) group.retained60 += 1; }
    if (maturity >= 90) { group.eligible90 += 1; if (retainedWithin(90)) group.retained90 += 1; }
    if (eligibleVisits.length > 1) group.repeatPatients += 1;
    if (gaps.length) { group.visitGapDays += gaps.reduce((sum, gap) => sum + gap, 0); group.visitGapSamples += gaps.length; }
    cohortMap.set(key, group);
  };
  for (const [patientId, visits] of patientVisits) {
    const first = [...visits].sort((a, b) => a.date.localeCompare(b.date)).find((visit) => visit.first);
    if (!first) continue;
    addCohort(patientId, visits, "clinic", "Clinic");
    addCohort(patientId, visits, "practitioner", first.practitioner || "Unassigned");
    addCohort(patientId, visits, "service", first.service || "Unknown service");
  }

  const analyticsRows: AnalyticsDailyRow[] = [...daily].map(([key, row]) => {
    const [date, entity, name] = key.split("\u001f");
    return {
      date,
      entity: entity as AnalyticsDailyRow["entity"],
      name,
      ...Object.fromEntries(Object.entries(row).filter(([field]) => field !== "patientIds")),
      patients: row.patientIds.size,
    } as AnalyticsDailyRow;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.entity.localeCompare(b.entity) || a.name.localeCompare(b.name));
  const cohortRows: RetentionCohortRow[] = [...cohortMap].map(([key, row]) => {
    const [cohortMonth, entity, name] = key.split("\u001f");
    return { cohortMonth, entity: entity as RetentionCohortRow["entity"], name, cohortSize: row.patientIds.size, eligible30: row.eligible30, retained30: row.retained30, eligible60: row.eligible60, retained60: row.retained60, eligible90: row.eligible90, retained90: row.retained90, repeatPatients: row.repeatPatients, visitGapDays: row.visitGapDays, visitGapSamples: row.visitGapSamples };
  }).sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth) || a.entity.localeCompare(b.entity) || a.name.localeCompare(b.name));
  return { analyticsRows, cohortRows };
}

function buildPrivateFacts(
  appointmentRows: CsvRow[],
  compensationRows: CsvRow[],
  salesRows: CsvRow[],
  paymentRows: CsvRow[],
  dataThrough: string,
): RefreshPrivateFacts {
  const appointments = appointmentRows.flatMap((row) => {
    const date = rowDate(row, COVERAGE_FIELDS.appointments);
    if (!date || date > dataThrough) return [];
    const startValue = row.start_at || row["Start At"] || row.Date || `${date}T00:00:00Z`;
    const start = new Date(startValue);
    const end = new Date(row.end_at || row["End At"] || row.Date || startValue);
    const occurredAt = Number.isFinite(start.getTime()) ? start.toISOString() : `${date}T00:00:00.000Z`;
    const durationMinutes = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())
      ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
      : 0;
    const patientGuid = row.patient_guid || row["Patient Guid"] || "";
    const service = row.treatment_name || row.Type || row.Session || "Unknown service";
    const practitioner = row.staff_member_name || row["Staff Member"] || row.Staff || "Unassigned";
    const state = (row.state || row.State || "unknown").toLowerCase();
    if (["never booked", "never_booked", "deleted", "archived", "rescheduled"].includes(state)) return [];
    return [{
      recordKey: privateKey("appointment", row.id || [startValue, practitioner, service, patientGuid, state].join("|")),
      occurredAt,
      date,
      service,
      practitioner,
      state,
      durationMinutes,
      bookingSource: String(row.booked_online ?? row["Booked Online"] ?? "").toLowerCase() === "true" ? "Online" : "Staff booked",
      patientKey: patientGuid ? privateKey("patient", patientGuid) : null,
      firstVisit: String(row.first_visit ?? row["First Visit"] ?? "").toLowerCase() === "true",
      consultation: /consult/i.test(service),
      recovered: false,
    }];
  });
  const patientVisits = new Map<string, string[]>();
  appointments.filter((row) => row.patientKey && ["arrived", "completed"].includes(row.state)).forEach((row) => {
    patientVisits.set(row.patientKey!, [...(patientVisits.get(row.patientKey!) ?? []), row.date]);
  });
  appointments.forEach((row) => {
    if (!row.patientKey || !["cancelled", "no_show", "no show"].includes(row.state)) return;
    row.recovered = (patientVisits.get(row.patientKey) ?? []).some((date) => date > row.date);
  });

  const transactions = compensationRows.flatMap((row) => {
    const date = rowDate(row, COVERAGE_FIELDS.compensation);
    if (!date || date > dataThrough) return [];
    const patientGuid = row.patient_guid || row["Patient Guid"] || "";
    const basis = [
      row["Invoice #"], row.Practitioner, row["Purchase Date"], row["Transaction Date"],
      row["Payment Date"], row["Collected Total"], row["Commission Total"], row.Quantity,
    ].join("|");
    return [{
      recordKey: privateKey("transaction", basis),
      date,
      practitioner: row.Practitioner || "Unassigned",
      service: row["Income Category"] || "Treatment income",
      revenue: money(row["Invoice Total"] || row["Collected Total"]),
      collected: money(row["Collected Total"] || row["Collected Subtotal"]),
      commission: money(row["Commission Total"]),
      paymentMethod: row["Payment Method"] || "Other",
      status: money(row["Collected Total"] || row["Collected Subtotal"]) > 0 ? "Collected" : "Uncollected",
      patientKey: patientGuid ? privateKey("patient", patientGuid) : null,
    }];
  });
  const sales = salesRows.flatMap((row) => {
    const date = rowDate(row, COVERAGE_FIELDS.sales);
    if (!date || date > dataThrough) return [];
    const invoice = row["Invoice #"] || "";
    const basis = [invoice, row.Item, row["Staff Member"], row.Total, row.Collected, row.Balance, row.Status].join("|");
    return [{
      recordKey: privateKey("sale", basis),
      date,
      invoiceKey: privateKey("invoice", invoice || basis),
      item: row.Item || row["Income Category"] || "Other",
      practitioner: row["Staff Member"] || "Unassigned",
      payerCategory: safePayerCategory(row.Payer || "Patient / private pay"),
      status: row.Status || (money(row.Balance) > 0 ? "Outstanding" : "Paid"),
      subtotal: money(row.Subtotal || row.Total),
      total: money(row.Total),
      collected: money(row.Collected),
      outstanding: money(row.Balance),
    }];
  });
  const collections = paymentRows.flatMap((row) => {
    const date = rowDate(row, COVERAGE_FIELDS.payments);
    if (!date || date > dataThrough) return [];
    const method = row["Payment Method"] || "Other";
    const amount = money(row["Amount Paid to Clinic"] || row.Amount || row.Total);
    const transactionCount = Math.max(0, Math.round(money(row["Number of Transactions"] || "1")));
    return [{
      recordKey: privateKey("collection", [date, method, amount, transactionCount, row.Payer, row["Applied To"]].join("|")),
      date,
      method,
      amount,
      transactionCount,
    }];
  });
  return { appointments, transactions, sales, collections };
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
  for (const kind of CORE_JANE_REPORTS) {
    const count = byKind.get(kind)?.length ?? 0;
    if (!count) issues.push({ status: "FAIL", title: `Missing Jane ${kind} report`, detail: "Upload at least one CSV for each of the four AdminFlow core reports." });
  }

  const allRows = <T extends JaneKind>(kind: T) => {
    const ordered = [...(byKind.get(kind) ?? [])].sort((left, right) => {
      const leftRange = dateRange(left, kind, { start: "", end: "" });
      const rightRange = dateRange(right, kind, { start: "", end: "" });
      return leftRange.end.localeCompare(rightRange.end) || left.name.localeCompare(right.name);
    });
    return dedupeJaneRows(kind, ordered.flatMap((file) => janeRecords(file, kind)));
  };
  const allAppointmentRows = allRows("appointments");
  const allCompensationRows = allRows("compensation");
  const allSalesRows = allRows("sales");
  const allPaymentRows = allRows("payments");
  const allHoursRows = allRows("hours");
  const allPayoutRows = allRows("payouts");
  const salesDates = allSalesRows.map((row) => rowDate(row, COVERAGE_FIELDS.sales)).filter(Boolean).sort();
  const namedSalesDates = (byKind.get("sales") ?? []).map((file) => periodFromSalesName(file.name)?.end ?? "").filter(Boolean).sort();
  const latestSelectedSalesDate = [...salesDates, ...namedSalesDates].sort().at(-1) ?? "";
  const latestSalesDate = latestSelectedSalesDate ? [latestSelectedSalesDate, latestCompleteTorontoDate()].sort()[0] : "";
  if (!latestSalesDate) issues.push({ status: "FAIL", title: "Sales report has no usable dates", detail: "Export Sales directly from Jane with Purchase Date or Invoice Date included." });
  const safePeriod = {
    start: latestSalesDate ? `${latestSalesDate.slice(0, 7)}-01` : "1970-01-01",
    end: latestSalesDate || "1970-01-01",
  };
  const periodKey = safePeriod.start.slice(0, 7);
  const inCurrentPeriod = (row: CsvRow, kind: JaneKind) => {
    const date = rowDate(row, COVERAGE_FIELDS[kind]);
    return date >= safePeriod.start && date <= safePeriod.end;
  };
  const appointmentRows = allAppointmentRows.filter((row) => inCurrentPeriod(row, "appointments"));
  const compensationRows = allCompensationRows.filter((row) => inCurrentPeriod(row, "compensation"));
  const salesRows = allSalesRows.filter((row) => inCurrentPeriod(row, "sales"));
  const paymentRows = allPaymentRows.filter((row) => inCurrentPeriod(row, "payments"));
  const hoursRows = allHoursRows.filter((row) => inCurrentPeriod(row, "hours"));
  const payoutRows = allPayoutRows.filter((row) => inCurrentPeriod(row, "payouts"));

  const overlappingKinds = CORE_JANE_REPORTS.filter((kind) => {
    const rawCount = (byKind.get(kind) ?? []).reduce((sum, file) => sum + janeRecords(file, kind).length, 0);
    return rawCount > allRows(kind).length;
  });
  if (overlappingKinds.length) {
    issues.push({
      status: "WARNING",
      title: "Overlapping historical exports were de-duplicated",
      detail: `${overlappingKinds.map((kind) => JANE_LABELS[kind]).join(", ")} contained repeated rows across files. Stable report keys were used so the repeats do not inflate the dashboard.`,
    });
  }

  const bankFileCount = REQUIRED_BANK_ACCOUNTS.reduce((sum, kind) => sum + (byKind.get(kind)?.length ?? 0), 0);
  const refreshType: RefreshType = bankFileCount === 0 ? "jane" : "full";
  if (refreshType === "full") {
    for (const kind of REQUIRED_BANK_ACCOUNTS) {
      const matches = (byKind.get(kind) ?? []).filter((file) => file.name.includes(`${safePeriod.start.slice(5, 7)}-${safePeriod.start.slice(0, 4)}`));
      if (matches.length !== 1) issues.push({ status: "FAIL", title: `Incomplete bank package: ${kind}`, detail: `Either upload all five ${periodKey} bank CSVs or upload the Jane reports without bank files.` });
    }
  }
  if (fileSummaries.some((file) => file.status === "blocked")) issues.push({ status: "FAIL", title: "One or more files are unrecognized", detail: "Remove them or download the expected CSV directly from Jane or the bank." });

  const sourceCoverage: SourceCoverage[] = REQUIRED_JANE_REPORTS.map((kind) => {
    const filesForKind = byKind.get(kind) ?? [];
    const rowsForKind = allRows(kind);
    const dates = rowsForKind.map((row) => rowDate(row, COVERAGE_FIELDS[kind])).filter(Boolean).sort();
    const range = {
      start: dates[0] ?? "",
      end: dates.at(-1) ?? "",
    };
    const status = !filesForKind.length ? "missing" : range.start <= safePeriod.start && range.end >= safePeriod.end ? "complete" : "partial";
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
    const summaries = fileSummaries.filter((file) => file.kind === coverage.kind);
    summaries.forEach((summary) => {
      const sourceFile = identified.find((file) => file.name === summary.name);
      const range = sourceFile ? dateRange(sourceFile, coverage.kind, safePeriod) : { start: "", end: "" };
      summary.coverageStart = range.start;
      summary.coverageEnd = range.end;
      if (coverage.status === "partial" && summaries.length === 1) {
        summary.status = "warning";
        summary.note = "The latest dated row is earlier than the selected refresh cutoff; confirm the export range before publishing.";
      } else if (summaries.length > 1) {
        summary.note = "Historical segment recognized; overlapping rows are de-duplicated automatically.";
      }
    });
    if (!summaries.length && coverage.role === "supplemental") return;
    if (coverage.role === "core" && coverage.status === "partial") {
      issues.push({ status: "WARNING", title: `${coverage.label} may have incomplete current-period coverage`, detail: `The latest dashboard period is ${safePeriod.start} through ${safePeriod.end}; dated rows run ${coverage.start || "no dated rows"} through ${coverage.end || "no dated rows"}. Empty days can be valid, so confirm the Jane date selector if the cutoff is unexpected.` });
    }
  });
  const coverageCalendar: CoverageDay[] = eachDate(safePeriod.start, safePeriod.end).map((date) => {
    const covered = sourceCoverage.filter((source) => source.role === "core" && source.start && source.start <= date && source.end >= date).length;
    return { date, covered, expected: CORE_JANE_REPORTS.length, status: covered === CORE_JANE_REPORTS.length ? "complete" : covered ? "partial" : "missing" };
  });

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
  const hours = new Map(hoursRows.map((row) => [normalizeName(row["Staff Name"]), row]));
  const compensation = new Map<string, number>();
  for (const row of compensationRows) {
    const name = row.Practitioner;
    if (!name) continue;
    compensation.set(name, (compensation.get(name) ?? 0) + money(row["Commission Total"]));
  }
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

  const payouts = payoutRows.filter((row) => row["Date Created"]).map((row) => ({ created: isoDate(row["Date Created"]), deposited: isoDate(row["Date Deposited"]), amount: money(row["Payout Amount"]), status: row["Payout Status"] }));
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
  const completedAppointments = stateCount("arrived") + stateCount("completed") + stateCount("in-progress") + stateCount("in_progress") + stateCount("in progress");
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
  const { analyticsRows, cohortRows } = buildAnalyticsRows(allAppointmentRows, allSalesRows, allCompensationRows, allPaymentRows, safePeriod.end);
  const privateFacts = buildPrivateFacts(allAppointmentRows, allCompensationRows, allSalesRows, allPaymentRows, safePeriod.end);
  return {
    refreshId: randomUUID(),
    refreshType,
    periodKey,
    periodLabel: `${monthName}${complete && refreshType === "full" ? "" : " MTD"}`,
    periodStart: safePeriod.start,
    periodEnd: safePeriod.end,
    periodStatus: complete && refreshType === "full" ? "Complete" : "Partial",
    analytics,
    analyticsRows,
    cohortRows,
    privateFacts,
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
