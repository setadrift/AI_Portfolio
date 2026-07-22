"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RefreshPayload } from "@/lib/portal/ttg/dashboard-refresh";

type Preview = { payload: RefreshPayload; token: string };
type Receipt = { refreshId: string; status: string; period: string; publishedAt: string };
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

const JANE_STEPS = [
  { report: "Sales", path: "Reports → Billing → Sales", setting: "All locations, disciplines, staff, income categories, and invoice states" },
  { report: "Hours Scheduled / Booked", path: "Reports → Appointments → Hours Scheduled / Booked", setting: "All locations and all staff" },
  { report: "Compensation", path: "Reports → Payroll → Compensation", setting: "All locations, all staff, Collected (Cash); the CSV includes the required detail rows" },
  { report: "Jane Payments Payouts", path: "Reports → Billing → Jane Payments Payouts", setting: "All accounts" },
];

export default function DashboardRefreshWizard() {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<"preview" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const blocking = useMemo(() => preview?.payload.issues.some((issue) => issue.status === "FAIL") || preview?.payload.checks.some((check) => check.status === "FAIL"), [preview]);
  const warnings = preview?.payload.issues.some((issue) => issue.status === "WARNING") ?? false;

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

  return (
    <div className="ttg-refresh-page">
      <header className="ttg-refresh-hero">
        <div><div className="ttg-eyebrow">Dashboard refresh</div><h1>Drop in the reports.<br />Review the close. Publish.</h1></div>
        <p>Built for Jess’s weekly routine, but safe to run any day. Files are read in memory, reduced to practice-level totals, and discarded. Patient identifiers never enter the dashboard workbook.</p>
      </header>

      <section className="ttg-refresh-workflow" aria-label="Refresh workflow">
        <span className={!preview ? "is-active" : "is-done"}>1 <b>Upload</b></span><i /><span className={preview && !receipt ? "is-active" : receipt ? "is-done" : ""}>2 <b>Review</b></span><i /><span className={receipt ? "is-done" : ""}>3 <b>Publish</b></span>
      </section>

      <div className="ttg-refresh-layout">
        <main>
          {!receipt && <section className="ttg-refresh-card ttg-upload-card">
            <div className="ttg-card-heading"><div><span>Refresh package</span><h2>Upload 4 Jane reports + 5 bank files</h2></div><strong>{files.length} files selected</strong></div>
            <label className="ttg-file-drop">
              <input type="file" accept=".csv,text/csv" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setPreview(null); setError(""); }} />
              <span className="ttg-upload-mark">↑</span><strong>Choose all CSV files together</strong><small>Original filenames are used to confirm the reporting period and five bank accounts.</small>
            </label>
            {files.length > 0 && <div className="ttg-selected-files">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span>)}</div>}
            <div className="ttg-privacy-note"><strong>Privacy boundary</strong><p>Sales and Compensation exports can contain patient details. They are aggregated on the server and never stored, logged, returned to this screen, or written to Google Sheets.</p></div>
            <button className="ttg-primary-action" disabled={!files.length || busy !== null} onClick={inspect}>{busy === "preview" ? "Checking files…" : preview ? "Review files again" : "Check files"}</button>
          </section>}

          {preview && !receipt && <section className="ttg-refresh-card ttg-review-card">
            <div className="ttg-card-heading"><div><span>{preview.payload.periodStatus} reporting period</span><h2>{preview.payload.periodLabel}</h2></div><strong>Through {preview.payload.periodEnd}</strong></div>
            <div className="ttg-refresh-metrics"><div><span>Gross revenue</span><strong>{cad.format(preview.payload.monthly.grossRevenue)}</strong></div><div><span>Collected</span><strong>{cad.format(preview.payload.monthly.collectedRevenue)}</strong></div><div><span>Operating profit</span><strong>{cad.format(preview.payload.monthly.operatingProfit)}</strong></div><div><span>Bank rows</span><strong>{preview.payload.bankRows}</strong></div></div>
            <div className="ttg-file-audit">{preview.payload.fileSummaries.map((file) => <div key={file.name}><span className={`is-${file.status}`}>{file.status === "ready" ? "Ready" : file.status === "warning" ? "Review" : "Blocked"}</span><strong>{file.label}</strong><p>{file.name}</p><small>{file.rows} rows</small></div>)}</div>
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
          <div className="ttg-eyebrow">Jess’s Jane checklist</div><h2>Download the same date range from four reports.</h2><p>For a Monday refresh, use the first day of the month through the most recent date covered by the bank exports.</p>
          <ol>{JANE_STEPS.map((step, index) => <li key={step.report}><span>{index + 1}</span><div><strong>{step.report}</strong><p>{step.path}</p><small>{step.setting}</small></div></li>)}</ol>
          <div className="ttg-guide-rule"><strong>For every report</strong><p>Set the identical start and end date. Open the ••• menu and choose <b>Export to CSV</b>. Keep Jane’s original filename.</p></div>
          <div className="ttg-guide-rule"><strong>Bank package</strong><p>Export the same month for Main Chequing, Contractor Pay, Mastercard, Peace of Mind, and Profit. Upload all five, even if one has only a few rows.</p></div>
          <p className="ttg-guide-footnote">“Sales by Staff Member” is intentionally omitted: its CSV contains the same rows and columns as Sales, only sorted differently.</p>
        </aside>
      </div>
    </div>
  );
}
