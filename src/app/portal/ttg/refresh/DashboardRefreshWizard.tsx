"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RefreshPayload } from "@/lib/portal/ttg/dashboard-refresh";
import { buildRefreshGuidance, type RefreshGuidance } from "@/lib/portal/ttg/refresh-guidance";

type Preview = { payload: RefreshPayload; token: string };
type Receipt = { refreshId: string; status: string; period: string; publishedAt: string };
type HistoryItem = { refreshId: string; publishedAt: string; refreshedBy: string; period: string; status: string; active: boolean };
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const displayDate = (value?: string) => value ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "Not recorded";

const JANE_STEPS = [
  { report: "Appointments", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/appointments", path: "Appointments report", setting: "All locations, all staff and all states" },
  { report: "Compensation", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/compensation", path: "Compensation report", setting: "All locations, all staff and Collected (Cash)" },
  { report: "Sales", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/sales", path: "Sales report", setting: "All locations, staff, income categories and invoice states" },
  { report: "Payments & Refunds", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/transactions/payments_refunds_and_fees", path: "Payments, Refunds, and Fees", setting: "All locations and payment methods; export the Daily Transaction CSV" },
  { report: "Hours Scheduled / Booked", role: "Capacity", href: "https://traumatherapygroup.janeapp.com/admin#reports/shift", path: "Hours Scheduled / Booked", setting: "Needed because Appointments does not contain available shift hours" },
  { report: "Jane Payments Payouts", role: "Reconciliation", href: "https://traumatherapygroup.janeapp.com/admin#reports/stripe_payouts", path: "Jane Payments Payouts", setting: "Needed because Payments & Refunds does not contain payout deposit IDs and dates" },
];

export default function DashboardRefreshWizard() {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<"preview" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [guidance, setGuidance] = useState<RefreshGuidance>(() => buildRefreshGuidance());
  const [packStatus, setPackStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [restoring, setRestoring] = useState("");
  const blocking = useMemo(() => preview?.payload.issues.some((issue) => issue.status === "FAIL") || preview?.payload.checks.some((check) => check.status === "FAIL"), [preview]);
  const warnings = preview?.payload.issues.some((issue) => issue.status === "WARNING") ?? false;
  const janeOnly = preview?.payload.refreshType === "jane";
  const previewAppointments = preview?.payload.therapists.reduce((sum, therapist) => sum + therapist.bookings, 0) ?? 0;
  const previewScheduledHours = preview?.payload.therapists.reduce((sum, therapist) => sum + therapist.scheduledHours, 0) ?? 0;

  useEffect(() => {
    fetch("/api/portal/ttg/dashboard-refresh/history", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { history: [] })
      .then((body) => { setHistory(body.history ?? []); if (body.guidance) setGuidance(body.guidance); })
      .catch(() => setHistory([]));
  }, [receipt]);

  useEffect(() => {
    if (preview) document.getElementById("ttg-refresh-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preview]);

  async function inspect(selectedFiles = files) {
    setBusy("preview"); setError(""); setPreview(null); setReceipt(null); setAcknowledged(false);
    try {
      const form = new FormData(); selectedFiles.forEach((file) => form.append("files", file));
      const response = await fetch("/api/portal/ttg/dashboard-refresh/preview", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not inspect these files.");
      setPreview(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not inspect these files."); }
    finally { setBusy(null); }
  }

  function chooseFiles(selectedFiles: File[]) {
    setFiles(selectedFiles); setPreview(null); setReceipt(null); setError("");
    if (selectedFiles.length) void inspect(selectedFiles);
  }

  function openJanePack() {
    let blocked = 0;
    for (const step of JANE_STEPS.filter((item) => item.role === "Core")) {
      const opened = window.open(step.href, `ttg-${step.report.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
      if (opened) opened.opener = null;
      else blocked += 1;
    }
    setPackStatus(blocked ? "Chrome blocked some report tabs. Allow pop-ups for this portal, then use the individual links below." : "All four core Jane report tabs opened. Use the date range shown here for every export.");
  }

  async function publish() {
    if (!preview) return;
    setBusy("publish"); setError("");
    try {
      const response = await fetch("/api/portal/ttg/dashboard-refresh/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: preview.token, acknowledgeWarnings: acknowledged }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not publish this refresh.");
      setReceipt(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not publish this refresh."); }
    finally { setBusy(null); }
  }

  async function restore(item: HistoryItem) {
    if (!window.confirm(`Restore the ${item.period} dashboard values from this refresh? The current version will remain in history.`)) return;
    setRestoring(item.refreshId); setError("");
    try {
      const response = await fetch("/api/portal/ttg/dashboard-refresh/rollback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshId: item.refreshId, confirmation: "RESTORE" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not restore that refresh.");
      setReceipt(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not restore that refresh."); }
    finally { setRestoring(""); }
  }

  return (
    <div className="ttg-refresh-page">
      <header className="ttg-refresh-hero">
        <div><div className="ttg-eyebrow">Jess’s dashboard refresh</div><h1>Refresh the dashboard<br />in two guided steps.</h1></div>
        <p>Jane reports can refresh clinical and revenue metrics on their own. Add all five bank exports only when Gabby wants cash flow, expenses, and reconciliation brought forward too.</p>
      </header>

      <section className="ttg-refresh-workflow" aria-label="Refresh workflow">
        <span className={!files.length ? "is-active" : "is-done"}>1 <b>Download</b></span><i /><span className={files.length && !preview ? "is-active" : preview ? "is-done" : ""}>2 <b>Select files</b></span><i /><span className={preview && !receipt ? "is-active" : receipt ? "is-done" : ""}>3 <b>Review & publish</b></span>
      </section>

      <div className="ttg-refresh-layout">
        <main>
          {!receipt && <section className="ttg-refresh-card ttg-upload-card">
            <div className="ttg-refresh-window">
              <div><span>Use this exact date range</span><strong>{displayDate(guidance.recommendedStart)} – {displayDate(guidance.recommendedEnd)}</strong><p>Export the full month-to-date range every time. This catches corrections entered against earlier dates.</p></div>
              <dl><div><dt>Jane currently through</dt><dd>{displayDate(guidance?.janeThrough)}</dd><small>{guidance?.janeGapStart ? `Needs ${displayDate(guidance.janeGapStart)} onward` : "No gap detected"}</small></div><div><dt>Bank currently through</dt><dd>{displayDate(guidance?.bankThrough)}</dd><small>{guidance?.bankGapStart ? `Needs ${displayDate(guidance.bankGapStart)} onward` : "No gap detected"}</small></div></dl>
            </div>
            <div className="ttg-guided-action">
              <span>1</span><div><small>Download</small><h2>Open the four core Jane reports</h2><p>The AdminFlow report screens open together. Apply the exact date range above and export each CSV. Hours and Payouts are optional supplements.</p><button className="ttg-primary-action" type="button" onClick={openJanePack}>Open the four reports ↗</button>{packStatus && <em role="status">{packStatus}</em>}</div>
            </div>
            <div className="ttg-guided-action ttg-guided-upload">
              <span>2</span><div><small>Upload</small><h2>Select the reports you have</h2><p>Choose the four core Jane CSVs. You may include overlapping historical segments; repeated rows are removed automatically. Add optional hours, payouts, or all five bank CSVs when available.</p></div>
            </div>
            <label className={`ttg-file-drop ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFiles(Array.from(event.dataTransfer.files)); }}>
              <input type="file" accept=".csv,text/csv" multiple onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))} />
              <span className="ttg-upload-mark">↑</span><strong>{busy === "preview" ? "Checking the package…" : "Choose all CSVs or drop them here"}</strong><small>{files.length ? `${files.length} files selected. The portal is checking names, structures, overlaps and date coverage.` : "Required: 4 core Jane reports. Optional: Hours, Payouts, and all 5 bank exports. Keep the original filenames."}</small>
            </label>
            {files.length > 0 && <div className="ttg-selected-files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span>)}</div>}
            <div className="ttg-privacy-note"><strong>Privacy boundary</strong><p>Sales and Compensation exports can contain patient details. They are aggregated on the server and never stored, logged, returned to this screen, or written to Google Sheets.</p></div>
          </section>}

          {preview && !receipt && <section className="ttg-refresh-card ttg-review-card" id="ttg-refresh-review">
            <div className="ttg-card-heading"><div><span>{preview.payload.periodStatus} reporting period</span><h2>{preview.payload.periodLabel}</h2></div><strong>Through {preview.payload.periodEnd}</strong></div>
            <div className={`ttg-refresh-mode is-${preview.payload.refreshType}`}><strong>{janeOnly ? "Jane refresh ready" : "Full financial refresh ready"}</strong><p>{janeOnly ? "Publishing updates revenue, collections, appointments, team performance, retention, and every included supplemental Jane metric. Existing expenses, profit, cash flow, and bank reconciliation stay unchanged." : "Publishing updates both Jane-backed operating metrics and bank-backed financial controls for this period."}</p></div>
            <div className="ttg-refresh-metrics"><div><span>Gross revenue</span><strong>{cad.format(preview.payload.monthly.grossRevenue)}</strong></div><div><span>Collected</span><strong>{cad.format(preview.payload.monthly.collectedRevenue)}</strong></div>{janeOnly ? <><div><span>Appointments</span><strong>{previewAppointments}</strong></div><div><span>Scheduled hours</span><strong>{previewScheduledHours.toFixed(1)}</strong></div></> : <><div><span>Operating profit</span><strong>{cad.format(preview.payload.monthly.operatingProfit)}</strong></div><div><span>Bank rows</span><strong>{preview.payload.bankRows}</strong></div></>}</div>
            <div className="ttg-file-audit">{preview.payload.fileSummaries.map((file) => <div key={file.name}><span className={`is-${file.status}`}>{file.status === "ready" ? "Ready" : file.status === "warning" ? "Review" : "Blocked"}</span><strong>{file.label}</strong><p>{file.name}</p><small>{file.rows} rows</small></div>)}</div>
            <div className="ttg-calendar-section">
              <div className="ttg-calendar-heading"><div><strong>Jane source coverage</strong><span>{preview.payload.sourceCoverage.filter((source) => source.role === "core" && source.status === "complete").length} of 4 core reports reach the selected cutoff</span></div><div className="ttg-calendar-legend"><i className="is-complete" />Complete<i className="is-partial" />Check range</div></div>
              <div className="ttg-calendar-grid">{preview.payload.coverageCalendar.map((day) => <span key={day.date} className={`is-${day.status}`} title={`${day.date}: ${day.covered} of ${day.expected} reports`}><b>{new Date(`${day.date}T12:00:00Z`).getUTCDate()}</b><small>{day.covered}/{day.expected}</small></span>)}</div>
              <div className="ttg-source-coverage-list">{preview.payload.sourceCoverage.map((source) => <div key={source.kind}><span className={`is-${source.status}`}>{source.status === "complete" ? "Current" : source.status === "partial" ? "Check" : "Missing"}</span><p><strong>{source.label}</strong><small>{source.role === "core" ? "AdminFlow core report" : source.note}</small></p><time>{source.start || "—"} → {source.end || "—"}</time></div>)}</div>
            </div>
            <div className="ttg-check-list">
              {preview.payload.checks.map((check) => <div key={check.check}><span className={`is-${check.status.toLowerCase()}`}>{check.status}</span><p><strong>{check.check}</strong><small>{check.notes}</small></p></div>)}
              {preview.payload.issues.map((issue) => <div key={issue.title}><span className={`is-${issue.status.toLowerCase()}`}>{issue.status}</span><p><strong>{issue.title}</strong><small>{issue.detail}</small></p></div>)}
            </div>
            {warnings && !blocking && <label className="ttg-warning-ack"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><strong>I reviewed the open items</strong><small>The dashboard will label this refresh with a warning.</small></span></label>}
            <div className="ttg-review-actions"><button className="ttg-secondary-action" onClick={() => setPreview(null)}>Change files</button><button className="ttg-primary-action" disabled={Boolean(blocking) || (warnings && !acknowledged) || busy !== null} onClick={publish}>{busy === "publish" ? "Publishing…" : blocking ? "Fix blocked items" : janeOnly ? "Publish Jane refresh" : "Publish full refresh"}</button></div>
          </section>}

          {receipt && <section className="ttg-refresh-card ttg-success-card"><span className="ttg-success-mark">✓</span><div className="ttg-eyebrow">Refresh published</div><h2>{receipt.period} is ready.</h2><p>{janeOnly ? "Jane-backed dashboard metrics were updated. Bank-backed financial controls remain on their previous cutoff." : "Jane and bank reporting tables were updated together."} Dashboard data has been revalidated and its cache cleared.</p><dl><div><dt>Refresh ID</dt><dd>{receipt.refreshId}</dd></div><div><dt>Status</dt><dd>{receipt.status}</dd></div><div><dt>Published</dt><dd>{new Date(receipt.publishedAt).toLocaleString("en-CA")}</dd></div></dl><div className="ttg-success-actions"><Link href="/portal/ttg/dashboard" className="ttg-primary-action">Open refreshed dashboard</Link><button className="ttg-secondary-action" onClick={() => { setFiles([]); setPreview(null); setReceipt(null); }}>Start another refresh</button></div></section>}
          {error && <div className="ttg-refresh-error" role="alert"><strong>Refresh stopped</strong><span>{error}</span></div>}
        </main>

        <aside className="ttg-download-guide">
          <div className="ttg-eyebrow">Export checklist</div><h2>Nothing to remember.</h2><p>Use <strong>{displayDate(guidance.recommendedStart)} – {displayDate(guidance.recommendedEnd)}</strong> for every report. These links are fallbacks if Chrome blocks the one-click report pack.</p>
          <ol>{JANE_STEPS.map((step, index) => <li key={step.report}><span>{index + 1}</span><div><div className="ttg-report-line"><strong>{step.report}</strong><em>{step.role}</em></div><a href={step.href} target="_blank" rel="noreferrer">Open in Jane ↗</a><small>{step.setting}</small></div></li>)}</ol>
          <div className="ttg-guide-rule"><strong>For every report</strong><p>Set the range shown above. Open the ••• menu and choose <b>Export to CSV</b>. Keep Jane’s original filename.</p></div>
          <div className="ttg-guide-rule"><strong>Optional bank package</strong><p>Jane can publish independently. To refresh expenses, profit, cash flow, and reconciliation too, add the same month from Main Chequing, Contractor Pay, Mastercard, Peace of Mind, and Profit. Include all five or none.</p></div>
          <p className="ttg-guide-footnote">The first four match AdminFlow. Hours and Payouts are retained only because Gabby’s dashboard includes utilization and payout-to-bank reconciliation.</p>
        </aside>
      </div>
      <section className="ttg-import-history">
        <div><div className="ttg-eyebrow">Import history</div><h2>Every published refresh can be restored.</h2><p>Rollback restores only aggregated dashboard values. Raw Jane and bank files are never retained.</p></div>
        <div className="ttg-history-list">{history.length ? history.map((item) => <div key={item.refreshId}><span className={item.active ? "is-active" : ""}>{item.active ? "Current" : item.status}</span><p><strong>{item.period}</strong><small>{new Date(item.publishedAt).toLocaleString("en-CA")} · {item.refreshedBy}</small></p>{item.active ? <em>In use</em> : <button disabled={Boolean(restoring)} onClick={() => restore(item)}>{restoring === item.refreshId ? "Restoring…" : "Restore"}</button>}</div>) : <p className="ttg-history-empty">History begins after the first refresh published through this portal.</p>}</div>
      </section>
    </div>
  );
}
