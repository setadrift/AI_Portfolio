# TTG Dashboard — Weekly Refresh Runbook

## Purpose

Keep Gabby's dashboard dependable for the coming week without requiring dashboard-code changes. The normal refresh owner is TTG's administrator; Gabby reviews exceptions rather than rebuilding reports.

The dashboard is a read-only presentation of the reporting workbook. Updating the workbook does not write back to Jane or the bank.

## Recommended cadence

- Refresh every Monday morning before the weekly operating review.
- Refresh again before an important cash, payout, or month-end decision if transactions have materially changed.
- Do not treat opening the dashboard as a data refresh. The source strip must show the actual workbook update and source cutoffs.

## Monday workflow

### 1. Replace the Jane inputs

Export or update the approved aggregate reporting inputs for:

- Sales and collections
- Revenue by staff member
- Scheduled and booked hours
- Practitioner compensation
- Jane payment payouts

Do not place patient names or other PHI in the reporting tabs read by the portal. Remove or mask patient identity columns before retaining an export.

### 2. Add complete bank and card coverage

Confirm that the export set includes every account expected for the period:

- Main operating account
- Therapist-commission holding accounts
- Other supplied auxiliary accounts
- Business credit-card transactions and settlements

Record the bank coverage dates and row count. Do not count internal transfers as revenue or operating expense. Do not count both individual card transactions and the subsequent card payment as expenses.

### 3. Update the normalized reporting tables

Refresh:

- `Monthly Metrics`
- `Therapist Monthly`
- `Expense Categories`
- `Checks`

The portal reads only aggregated reporting tables. Raw bank rows and patient-level Jane rows must not be delivered to the browser.

### 4. Resolve the close checks

Before Gabby relies on the numbers, confirm:

- Therapist revenue reconciles to Jane revenue.
- Expense categories reconcile to operating expenses.
- Matched payout count uses the expected payout count as its denominator.
- Payout value reconciles to the reviewed bank deposits.
- Internal transfers net to zero in external cash flow.
- Credit-card settlements are not double-counted.
- Every expected bank/card export is present once.
- Jane and bank cutoffs are aligned or the difference is documented.
- Uncategorized expenses are understood and assigned for the final close.

`WARNING` means the dashboard remains usable with a visible limitation. `FAIL` means Gabby should not rely on the close for a cash or payout decision.

### 5. Record the refresh

Append one row to `Refresh Log` with:

- Actual refresh timestamp
- Person who completed it
- Jane periods covered
- Bank coverage start and end
- Bank row count
- `PASS`, `WARNING`, or `FAIL`
- Plain-language notes describing anything Gabby still needs to review

The dashboard will display this record. It will not substitute the time the web page was opened.

## Gabby's daily read

Gabby should scan the dashboard in this order:

1. Source strip: confirm Jane, bank, and workbook dates are current enough for the decision.
2. Weekly owner review: address blockers and review items before opportunities.
3. Practice outcomes: read complete-month performance or choose the labelled MTD period.
4. Capacity: use the focus list and practitioner chart for staffing or demand discussions.
5. Controls: do not rely on a close containing any failed control.

Current cash position remains unavailable until TTG supplies balance snapshots for every account plus the relevant credit-card liability and identifies cash reserved for therapist commissions. Transaction exports alone are insufficient for an available-cash decision.
