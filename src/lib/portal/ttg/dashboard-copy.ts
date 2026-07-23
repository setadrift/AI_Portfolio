import type { MonthlyMetric, TtgDashboardData } from "./dashboard";

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number) => new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  notation: "compact",
  maximumFractionDigits: 1,
}).format(value);

export function periodLabel(period: string) {
  return period.replace(/\s+20\d{2}(?=\s+MTD$|$)/, "");
}

export function formatDataThrough(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function change(current: number, prior: number) {
  return prior === 0 ? null : (current - prior) / Math.abs(prior);
}

function practiceCopy(current: MonthlyMetric, prior: MonthlyMetric) {
  const revenueChange = change(current.grossRevenue, prior.grossRevenue);
  const profitChange = current.operatingProfit - prior.operatingProfit;
  const cashImproved = current.netCashFlow > prior.netCashFlow;
  const period = periodLabel(current.period);

  if (current.status === "Partial") {
    return {
      title: `${period} through ${formatDataThrough(current.dataThrough)}.`,
      intro: `Month-to-date revenue is ${money(current.grossRevenue)}. Profit and cash are directional until Jane and bank data are aligned and the month is closed.`,
    };
  }

  if (revenueChange !== null && revenueChange > 0 && profitChange > 0 && cashImproved) {
    return {
      title: `${period} closed with stronger operating momentum.`,
      intro: `Revenue grew ${pct(revenueChange)}, estimated profit increased ${money(profitChange)}, and net cash flow improved to ${money(current.netCashFlow)}.`,
    };
  }
  if (profitChange > 0 && cashImproved) {
    return {
      title: `${period} produced a stronger operating result.`,
      intro: `Estimated profit increased ${money(profitChange)} and net cash flow improved to ${money(current.netCashFlow)} while revenue moved ${revenueChange === null ? "from a zero base" : pct(revenueChange)}.`,
    };
  }
  if (current.operatingProfit > 0 && current.netCashFlow > 0) {
    return {
      title: `${period} remained profitable and cash-positive.`,
      intro: `Estimated operating profit was ${money(current.operatingProfit)} at a ${pct(current.profitMargin)} margin, with ${money(current.netCashFlow)} in net cash flow.`,
    };
  }
  return {
    title: `${period} performance at a glance.`,
    intro: `Revenue was ${money(current.grossRevenue)}, estimated operating profit was ${money(current.operatingProfit)}, and net cash flow was ${money(current.netCashFlow)}.`,
  };
}

export function getDashboardCopy(data: TtgDashboardData, selectedPeriod = data.reportingPeriod) {
  const current = data.months.find((month) => month.period === selectedPeriod)
    ?? data.months.find((month) => month.period === data.reportingPeriod)
    ?? data.months.at(-1)!;
  const currentIndex = data.months.indexOf(current);
  const prior = data.months[Math.max(0, currentIndex - 1)] ?? current;
  const hasPrior = currentIndex > 0;
  const hasComparablePrior = hasPrior && current.status === "Complete" && prior.status === "Complete";
  const period = periodLabel(current.period);
  const utilization = data.summary.weightedUtilization;
  const openShare = Math.max(0, 1 - utilization);
  const warnings = data.qualityChecks.filter((check) => check.status === "WARNING");
  const failures = data.qualityChecks.filter((check) => check.status === "FAIL");
  const passes = data.qualityChecks.filter((check) => check.status === "PASS").length;
  const partial = data.months.find((month) => month.status === "Partial");
  const practice = practiceCopy(current, prior);

  const capacity = utilization < 0.5
    ? {
        title: "Capacity remains the clearest operating opportunity.",
        intro: `${pct(utilization)} of scheduled clinical time was booked, leaving ${pct(openShare)} open across ${data.summary.activeTherapists} active therapists.`,
      }
    : utilization < 0.75
      ? {
          title: "Capacity is moving toward a healthier range.",
          intro: `${pct(utilization)} of scheduled clinical time was booked, with ${data.summary.availableHours.toFixed(1)} clinical hours still open.`,
        }
      : {
          title: "Clinical capacity is tightening.",
          intro: `${pct(utilization)} of scheduled clinical time was booked, leaving ${pct(openShare)} open across the active team.`,
        };

  const controls = failures.length > 0
    ? {
        title: `Do not rely on the ${period} close yet.`,
        intro: `${failures.length} ${failures.length === 1 ? "control has" : "controls have"} failed. Resolve the failed checks before using the close for a cash or payout decision.`,
      }
    : data.summary.payoutReconciliation >= 0.999
    ? {
        title: warnings.length === 0 ? `The ${period} close is fully reconciled.` : `The ${period} close reconciles, with ${warnings.length} ${warnings.length === 1 ? "item" : "items"} to review.`,
        intro: `${data.summary.payoutsMatched} practitioner payouts matched. ${passes} of ${data.qualityChecks.length} automated checks pass.`,
      }
    : {
        title: `The ${period} close needs reconciliation review.`,
        intro: `${pct(data.summary.payoutReconciliation)} of reviewed practitioner payouts matched, with ${warnings.length} ${warnings.length === 1 ? "item" : "items"} flagged.`,
      };

  return {
    current,
    prior,
    hasPrior,
    hasComparablePrior,
    period,
    priorPeriod: periodLabel(prior.period),
    practice,
    capacity,
    controls,
    passes,
    warnings,
    failures,
    partialNote: partial
      ? `${periodLabel(partial.period)} is partial through ${formatDataThrough(partial.dataThrough)}`
      : "Complete reporting periods only",
  };
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

export function getSourceHealth(data: TtgDashboardData, now = new Date()) {
  const gapDays = Math.abs(daysBetween(data.source.bankDataThrough, data.source.janeDataThrough));
  const oldestThrough = [data.source.janeDataThrough, data.source.bankDataThrough].sort()[0];
  const ageDays = Math.max(0, daysBetween(oldestThrough, now.toISOString().slice(0, 10)));
  const failures = data.qualityChecks.filter((check) => check.status === "FAIL");
  const isStale = ageDays > 7;
  const tone = failures.length > 0 || data.source.refreshStatus === "FAIL"
    ? "critical"
    : gapDays > 0 || isStale || data.source.refreshStatus === "WARNING" || data.source.refreshStatus === "UNKNOWN"
      ? "attention"
      : "current";
  const label = tone === "critical" ? "Blocked" : tone === "attention" ? "Review freshness" : "Sources aligned";
  return { ageDays, gapDays, isStale, tone, label };
}

export type OwnerAction = {
  tone: "critical" | "attention" | "opportunity" | "clear";
  title: string;
  detail: string;
};

export function getOwnerActions(data: TtgDashboardData, now = new Date()): OwnerAction[] {
  const current = data.months.find((month) => month.period === data.reportingPeriod) ?? data.months.at(-1)!;
  const actions: OwnerAction[] = [];
  const failures = data.qualityChecks.filter((check) => check.status === "FAIL");
  const sourceHealth = getSourceHealth(data, now);

  if (failures.length > 0) {
    actions.push({
      tone: "critical",
      title: "Resolve failed controls before using the close",
      detail: failures.map((check) => check.check).join(" · "),
    });
  } else if (data.summary.payoutReconciliation < 0.999) {
    actions.push({
      tone: "critical",
      title: "Finish payout reconciliation",
      detail: `${data.summary.payoutsMatched} of ${data.summary.payoutsExpected} reviewed payouts currently match.`,
    });
  }

  if (sourceHealth.gapDays > 0 || sourceHealth.isStale) {
    actions.push({
      tone: "attention",
      title: sourceHealth.isStale ? "Refresh the reporting database" : "Align Jane and bank cutoffs",
      detail: `Jane is through ${formatDataThrough(data.source.janeDataThrough)}; bank data is through ${formatDataThrough(data.source.bankDataThrough)}.`,
    });
  }

  if (current.uncategorizedExpenses > 0) {
    actions.push({
      tone: "attention",
      title: `Classify ${money(current.uncategorizedExpenses)} of expenses`,
      detail: "Resolve uncategorized bank transactions before treating estimated profit as final.",
    });
  }

  if (data.summary.weightedUtilization < 0.75) {
    const focus = [...data.therapists]
      .filter((therapist) => !therapist.owner)
      .sort((a, b) => b.availableHours - a.availableHours)
      .slice(0, 3);
    const openHours = focus.reduce((sum, therapist) => sum + therapist.availableHours, 0);
    actions.push({
      tone: "opportunity",
      title: "Review the largest pockets of open capacity",
      detail: `${focus.map((therapist) => therapist.name).join(", ")} account for ${openHours.toFixed(1)} open scheduled hours.`,
    });
  }

  return actions.length ? actions.slice(0, 4) : [{
    tone: "clear",
    title: "No material exceptions are open",
    detail: "Sources align, controls pass, and no classification cleanup is currently required.",
  }];
}

export type MetricCoverageStatus = "shown" | "available" | "partial" | "not-available";

export type MetricCoverageItem = {
  metric: string;
  status: MetricCoverageStatus;
  source: string;
  use: string;
};

export const gabbyMetricCoverage: Array<{ group: string; items: MetricCoverageItem[] }> = [
  {
    group: "Executive dashboard metrics",
    items: [
      { metric: "Gross Revenue", status: "shown", source: "Monthly Metrics · Gross Revenue", use: "Hero metric and monthly revenue chart" },
      { metric: "Revenue Growth %", status: "shown", source: "Monthly Metrics · Gross Revenue", use: "Current complete month versus prior complete month" },
      { metric: "Net Profit", status: "partial", source: "Monthly Metrics · Estimated Operating Profit", use: "Shown as estimated operating profit; taxes and owner distributions are not included" },
      { metric: "Profit Margin %", status: "shown", source: "Monthly Metrics · Estimated Profit Margin", use: "Shown with estimated operating profit" },
      { metric: "Operating Expenses", status: "shown", source: "Monthly Metrics + Expense Categories", use: "Controls view total and category composition" },
      { metric: "Current Cash Position", status: "not-available", source: "Bank balance or balance snapshot required", use: "Transaction CSVs do not provide a reliable current balance" },
      { metric: "Monthly Net Cash Flow", status: "shown", source: "Monthly Metrics · Net Cash Flow", use: "Hero metric and period chart" },
      { metric: "New Client Inquiries", status: "not-available", source: "CRM or Jane inquiry export required", use: "Not present in current reporting tables" },
      { metric: "New Clients Started", status: "not-available", source: "Jane client/appointment export required", use: "Not present in current reporting tables" },
      { metric: "Consult-to-Booked Conversion Rate %", status: "not-available", source: "CRM + Jane consultation outcomes required", use: "Not present in current reporting tables" },
      { metric: "Client Acquisition Cost (CAC)", status: "not-available", source: "Marketing spend + attributed new clients required", use: "Attribution denominator is not available" },
      { metric: "Marketing Spend", status: "shown", source: "Monthly Metrics or Expense Categories · Advertising & Marketing", use: "Operating pulse" },
      { metric: "Return on Ad Spend (ROAS)", status: "not-available", source: "Google Ads + attributed revenue required", use: "Ad-attributed revenue is not available" },
      { metric: "Active Therapists", status: "shown", source: "Therapist Monthly · revenue-generating therapist rows", use: "Practice and capacity views" },
      { metric: "Therapist Utilization %", status: "shown", source: "Therapist Monthly · Booked Hours / Scheduled Hours", use: "Weighted total and practitioner capacity chart" },
      { metric: "Revenue Per Therapist", status: "shown", source: "Gross Revenue / Active Therapists", use: "Capacity hero metric" },
      { metric: "Therapist Retention Rate", status: "not-available", source: "Longitudinal therapist roster required", use: "No start/end dates in current tables" },
      { metric: "Average Sessions Per Client", status: "not-available", source: "Client-level Jane appointment history required", use: "Client-level denominator is not available" },
      { metric: "Top Referral Sources", status: "not-available", source: "Jane or CRM referral-source export required", use: "Not present in current reporting tables" },
      { metric: "Owner Revenue % of Total Revenue", status: "shown", source: "Therapist Monthly · Owner Flag + Gross Revenue", use: "Owner/team contribution strip" },
    ],
  },
  {
    group: "Supporting metrics and drill-downs",
    items: [
      { metric: "Contractor Commissions / Therapist Payouts", status: "shown", source: "Therapist Monthly + Checks", use: "Controls card and payout reconciliation" },
      { metric: "Expense Breakdown by Category", status: "shown", source: "Expense Categories · Category + Expense Amount", use: "Controls expense chart" },
      { metric: "Average Client Revenue / Client Lifetime Value (LTV)", status: "not-available", source: "Client-level revenue history required", use: "Not present in current reporting tables" },
      { metric: "Outstanding Client Balances", status: "shown", source: "Therapist Monthly · Invoiced less collected as of today", use: "Controls collection card" },
      { metric: "No-Show Rate", status: "not-available", source: "Jane appointment-status export required", use: "Not present in current reporting tables" },
      { metric: "Cancellation Rate", status: "not-available", source: "Jane appointment-status export required", use: "Not present in current reporting tables" },
      { metric: "Lead-to-Client Conversion Rate %", status: "not-available", source: "CRM lead outcomes + Jane starts required", use: "Not present in current reporting tables" },
      { metric: "Cost Per Lead (CPL)", status: "not-available", source: "Marketing spend + attributed leads required", use: "Lead denominator is not available" },
      { metric: "Marketing Spend as % of Revenue", status: "shown", source: "Marketing Spend / Gross Revenue", use: "Operating pulse" },
      { metric: "New Clients by Referral Source", status: "not-available", source: "Jane or CRM referral-source export required", use: "Not present in current reporting tables" },
      { metric: "Revenue by Referral Source", status: "not-available", source: "Client/referral attribution joined to revenue required", use: "Not present in current reporting tables" },
      { metric: "Active Clients", status: "not-available", source: "Jane client-status export required", use: "Not present in current reporting tables" },
      { metric: "New Clients Added", status: "not-available", source: "Jane client-status export required", use: "Not present in current reporting tables" },
      { metric: "Discharged Clients", status: "not-available", source: "Jane discharge/status export required", use: "Not present in current reporting tables" },
      { metric: "Client Retention Rate", status: "not-available", source: "Longitudinal client appointment history required", use: "Not present in current reporting tables" },
      { metric: "Client Drop-Off Rate", status: "not-available", source: "Longitudinal client appointment history required", use: "Not present in current reporting tables" },
      { metric: "Average Length of Client Engagement", status: "not-available", source: "Client start/end history required", use: "Not present in current reporting tables" },
      { metric: "Available Clinical Capacity", status: "shown", source: "Therapist Monthly · Scheduled Hours less Booked Hours", use: "Capacity hero metric and practitioner chart" },
      { metric: "Booked Clinical Capacity", status: "shown", source: "Therapist Monthly · Booked Hours", use: "Capacity hero metric and practitioner chart" },
      { metric: "Completed Sessions Per Therapist", status: "partial", source: "Therapist Monthly · Booked Appointments", use: "Current source contains bookings, not completed-session status" },
      { metric: "Average Sessions Per Therapist Per Week", status: "partial", source: "Therapist Monthly · Appointments / Week", use: "Available as booked appointments per week, not confirmed completed sessions" },
      { metric: "Revenue Contribution by Therapist", status: "shown", source: "Therapist Monthly · Gross Revenue", use: "Ranked practitioner chart" },
      { metric: "Contractor Commission Percentage", status: "shown", source: "Therapist Monthly · Contractor Commission / Gross Revenue", use: "Controls card context" },
      { metric: "Revenue Generated Without Owner Clinical Hours", status: "shown", source: "Gross Revenue less owner-flagged therapist revenue", use: "Practice pulse and owner/team strip" },
      { metric: "Total Appointments", status: "shown", source: "Therapist Monthly · Booked Appointments", use: "Capacity outcome card; explicitly labelled booked appointments" },
      { metric: "Average Days from Inquiry to First Appointment", status: "not-available", source: "CRM inquiry timestamp + Jane first appointment required", use: "Not present in current reporting tables" },
      { metric: "Average Days from Consultation to First Session", status: "not-available", source: "Consultation and first-session timestamps required", use: "Not present in current reporting tables" },
      { metric: "Website Traffic", status: "not-available", source: "Google Analytics required", use: "Not connected to the current reporting database" },
      { metric: "Website Conversion Rate", status: "not-available", source: "Google Analytics conversion events required", use: "Not connected to the current reporting database" },
      { metric: "Leads by Marketing Channel", status: "not-available", source: "CRM + campaign attribution required", use: "Not connected to the current reporting database" },
      { metric: "Email List Growth", status: "not-available", source: "Email platform subscriber history required", use: "Not connected to the current reporting database" },
      { metric: "Email Open Rate", status: "not-available", source: "Email platform campaign data required", use: "Not connected to the current reporting database" },
      { metric: "Email Click-Through Rate", status: "not-available", source: "Email platform campaign data required", use: "Not connected to the current reporting database" },
    ],
  },
];

export const dashboardVisualIndex = [
  { visual: "Source freshness strip", source: "Import runs + quality checks", fields: "Refresh Timestamp, Refreshed By, source-date alignment, Bank Coverage", calculation: "Shows database refresh time and distinct Jane/bank data cutoffs; browser fetch time is not presented as source freshness." },
  { visual: "Owner review list", source: "Checks + Monthly Metrics + Therapist Monthly", fields: "Status, Uncategorized Expenses, Available Hours, source cutoffs", calculation: "Prioritizes failed controls, source alignment, classification cleanup, and the largest open-capacity opportunities." },
  { visual: "Practice outcome cards", source: "Monthly Metrics", fields: "Gross Revenue, Estimated Operating Profit, Estimated Profit Margin, Net Cash Flow", calculation: "Latest complete month; comparison uses the preceding complete month." },
  { visual: "Revenue and profit chart", source: "Monthly Metrics", fields: "Period, Period Status, Gross Revenue, Estimated Operating Profit", calculation: "Complete months only; values are read from the reporting database." },
  { visual: "Net cash-flow chart", source: "Monthly Metrics", fields: "Period, Period Status, Data Through, Net Cash Flow", calculation: "All supplied periods; partial periods are visually labelled." },
  { visual: "Operating pulse", source: "Monthly Metrics + Therapist Monthly", fields: "Collection Rate, Marketing Spend, Active Therapists, Owner Flag, Gross Revenue", calculation: "Collection and marketing ratios use database values; owner/team share is derived from owner-flagged therapist revenue." },
  { visual: "Capacity cards and chart", source: "Therapist Monthly", fields: "Therapist, Scheduled Hours, Booked Hours, Available Hours, Utilization", calculation: "Weighted utilization = total booked hours / total scheduled hours." },
  { visual: "Therapist revenue contribution", source: "Therapist Monthly", fields: "Therapist, Owner Flag, Gross Revenue", calculation: "Practitioners sorted by gross revenue for the reporting period." },
  { visual: "Expense composition", source: "Expense Categories + Monthly Metrics", fields: "Category, Expense Amount, Expense Share, Operating Expenses", calculation: "Categories reconcile to the complete-month operating-expense total." },
  { visual: "Close checklist", source: "Quality checks", fields: "Check, Status, Actual, Expected, Difference, Notes", calculation: "Database checks are displayed as Pass or Review without changing their status." },
];
