"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RefreshPayload } from "@/lib/portal/ttg/dashboard-refresh";

type Preview = { payload: RefreshPayload; token: string };
type Receipt = { refreshId: string; status: string; period: string; publishedAt: string };
type HistoryItem = { refreshId: string; publishedAt: string; refreshedBy: string; period: string; status: string; active: boolean };
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

const JANE_STEPS = [
  { report: "Appointments", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/appointments", path: "Appointments report", setting: "All locations, all staff and all states" },
  { report: "Compensation", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/compensation", path: "Compensation report", setting: "All locations, all staff and Collected (Cash)" },
  { report: "Sales", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/sales", path: "Sales report", setting: "All locations, staff, income categories and invoice states" },
  { report: "Payments & Refunds", role: "Core", href: "https://traumatherapygroup.janeapp.com/admin#reports/transactions/payments_refunds_and_fees", path: "Payments, Refunds, and Fees", setting: "Detail view, all locations and payment methods" },
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
  const [restoring, setRestoring] = useState("");
  const blocking = useMemo(() => preview?.payload.issues.some((issue) => issue.status === "FAIL") || preview?.payload.checks.some((check) => check.status === "FAIL"), [preview]);
  const warnings = preview?.payload.issues.some((issue) => issue.status === "WARNING") ?? false;

  useEffect(() => {
    fetch("/api/portal/ttg/dashboard-refresh/history", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { history: [] })
      .then((body) => setHistory(body.history ?? []))
      .catch(() => setHistory([]));
  }, [receipt]);

  async function inspect() {
    setBusy("preview"); setError(""); setPreview(null); setReceipt(null); setAcknowledged(false);
    try {
      const form = new FormData(); files.forEach((file) => form.append("files", file));
      const response = await fetch("/api/portal/ttg/dashboard-refresh/preview", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not inspect these files.");
      setPreview(body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not inspect these files."); }
    finally { setBusy(null); }
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
        <div><div className="ttg-eyebrow">Dashboard refresh</div><h1>Drop in the reports.<br />Review the close. Publish.</h1></div>
        <p>Built for Jess’s weekly routine, but safe to run any day. Open each pre-linked report, use one date range, and upload everything together. Patient identifiers are reduced to practice totals and discarded.</p>
      </header>

      <section className="ttg-refresh-workflow" aria-label="Refresh workflow">
        <span className={!preview ? "is-active" : "is-done"}>1 <b>Upload</b></span><i /><span className={preview && !receipt ? "is-active" : receipt ? "is-done" : ""}>2 <b>Review</b></span><i /><span className={receipt ? "is-done" : ""}>3 <b>Publish</b></span>
      </section>

      <div className="ttg-refresh-layout">
        <main>
          {!receipt && <section className="ttg-refresh-card ttg-upload-card">
            <div className="ttg-card-heading"><div><span>Refresh package</span><h2>Upload 6 Jane reports + 5 bank files</h2></div><strong>{files.length} files selected</strong></div>
            <label className="ttg-file-drop">
              <input type="file" accept=".csv,text/csv" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setPreview(null); setError(""); }} />
              <span className="ttg-upload-mark">↑</span><strong>Drop the complete refresh package</strong><small>The four AdminFlow reports are the core. Two clearly labelled supplements preserve utilization and payout reconciliation.</small>
            </label>
            {files.length > 0 && <div className="ttg-selected-files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span>)}</div>}
            <div className="ttg-privacy-note"><strong>Privacy boundary</strong><p>Sales and Compensation exports can contain patient details. They are aggregated on the server and never stored, logged, returned to this screen, or written to Google Sheets.</p></div>
            <button className="ttg-primary-action" disabled={!files.length || busy !== null} onClick={inspect}>{busy === "preview" ? "Checking files…" : preview ? "Review files again" : "Check files"}</button>
          </section>}

          {preview && !receipt && <section className="ttg-refresh-card ttg-review-card">
            <div className="ttg-card-heading"><div><span>{preview.payload.periodStatus} reporting period</span><h2>{preview.payload.periodLabel}</h2></div><strong>Through {preview.payload.periodEnd}</strong></div>
            <div className="ttg-refresh-metrics"><div><span>Gross revenue</span><strong>{cad.format(preview.payload.monthly.grossRevenue)}</strong></div><div><span>Collected</span><strong>{cad.format(preview.payload.monthly.collectedRevenue)}</strong></div><div><span>Operating profit</span><strong>{cad.format(preview.payload.monthly.operatingProfit)}</strong></div><div><span>Bank rows</span><strong>{preview.payload.bankRows}</strong></div></div>
            <div className="ttg-file-audit">{preview.payload.fileSummaries.map((file) => <div key={file.name}><span className={`is-${file.status}`}>{file.status === "ready" ? "Ready" : file.status === "warning" ? "Review" : "Blocked"}</span><strong>{file.label}</strong><p>{file.name}</p><small>{file.rows} rows</small></div>)}</div>
            <div className="ttg-calendar-section">
              <div className="ttg-calendar-heading"><div><strong>Jane source coverage</strong><span>{preview.payload.sourceCoverage.filter((source) => source.status === "complete").length} of {preview.payload.sourceCoverage.length} reports reach the selected cutoff</span></div><div className="ttg-calendar-legend"><i className="is-complete" />Complete<i className="is-partial" />Check range</div></div>
              <div className="ttg-calendar-grid">{preview.payload.coverageCalendar.map((day) => <span key={day.date} className={`is-${day.status}`} title={`${day.date}: ${day.covered} of ${day.expected} reports`}><b>{new Date(`${day.date}T12:00:00Z`).getUTCDate()}</b><small>{day.covered}/{day.expected}</small></span>)}</div>
              <div className="ttg-source-coverage-list">{preview.payload.sourceCoverage.map((source) => <div key={source.kind}><span className={`is-${source.status}`}>{source.status === "complete" ? "Current" : source.status === "partial" ? "Check" : "Missing"}</span><p><strong>{source.label}</strong><small>{source.role === "core" ? "AdminFlow core report" : source.note}</small></p><time>{source.start || "—"} → {source.end || "—"}</time></div>)}</div>
            </div>
            <div className="ttg-check-list">
              {preview.payload.checks.map((check) => <div key={check.check}><span className={`is-${check.status.toLowerCase()}`}>{check.status}</span><p><strong>{check.check}</strong><small>{check.notes}</small></p></div>)}
              {preview.payload.issues.map((issue) => <div key={issue.title}><span className={`is-${issue.status.toLowerCase()}`}>{issue.status}</span><p><strong>{issue.title}</strong><small>{issue.detail}</small></p></div>)}
            </div>
            {warnings && !blocking && <label className="ttg-warning-ack"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span><strong>I reviewed the open items</strong><small>The dashboard will label this refresh with a warning.</small></span></label>}
            <div className="ttg-review-actions"><button className="ttg-secondary-action" onClick={() => setPreview(null)}>Change files</button><button className="ttg-primary-action" disabled={Boolean(blocking) || (warnings && !acknowledged) || busy !== null} onClick={publish}>{busy === "publish" ? "Publishing…" : blocking ? "Fix blocked items" : "Publish dashboard refresh"}</button></div>
          </section>}

          {receipt && <section className="ttg-refresh-card ttg-success-card"><span className="ttg-success-mark">✓</span><div className="ttg-eyebrow">Refresh published</div><h2>{receipt.period} is ready.</h2><p>The normalized reporting tables and refresh log were updated together. Dashboard data has been revalidated and its cache cleared.</p><dl><div><dt>Refresh ID</dt><dd>{receipt.refreshId}</dd></div><div><dt>Status</dt><dd>{receipt.status}</dd></div><div><dt>Published</dt><dd>{new Date(receipt.publishedAt).toLocaleString("en-CA")}</dd></div></dl><div className="ttg-success-actions"><Link href="/portal/ttg/dashboard" className="ttg-primary-action">Open refreshed dashboard</Link><button className="ttg-secondary-action" onClick={() => { setFiles([]); setPreview(null); setReceipt(null); }}>Start another refresh</button></div></section>}
          {error && <div className="ttg-refresh-error" role="alert"><strong>Refresh stopped</strong><span>{error}</span></div>}
        </main>

        <aside className="ttg-download-guide">
          <div className="ttg-eyebrow">Jess’s Jane checklist</div><h2>One date range. Six direct report links.</h2><p>Use the first day of the month through the most recent date covered by the bank exports. Each button opens the right Jane screen.</p>
          <ol>{JANE_STEPS.map((step, index) => <li key={step.report}><span>{index + 1}</span><div><div className="ttg-report-line"><strong>{step.report}</strong><em>{step.role}</em></div><a href={step.href} target="_blank" rel="noreferrer">Open in Jane ↗</a><small>{step.setting}</small></div></li>)}</ol>
          <div className="ttg-guide-rule"><strong>For every report</strong><p>Set the identical start and end date. Open the ••• menu and choose <b>Export to CSV</b>. Keep Jane’s original filename.</p></div>
          <div className="ttg-guide-rule"><strong>Bank package</strong><p>Export the same month for Main Chequing, Contractor Pay, Mastercard, Peace of Mind, and Profit. Upload all five, even if one has only a few rows.</p></div>
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
