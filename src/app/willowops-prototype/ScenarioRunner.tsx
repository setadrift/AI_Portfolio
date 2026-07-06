"use client";

import { useState } from "react";

type Confidence = "High" | "Medium" | "Low";

type Destination =
  | "Spreadsheet row"
  | "Monday board item"
  | "Future central record"
  | "Needs decision";

interface ExtractedField {
  label: string;
  value: string;
  confidence: Confidence;
  evidence: string;
}

interface Extraction {
  generatedBy: "openai" | "fallback";
  recordTitle: string;
  sourceSummary: string;
  confidence: Confidence;
  fields: ExtractedField[];
  missingFields: string[];
  reviewWarnings: string[];
  recommendedDestination: Destination;
  suggestedNextAction: string;
  rawText: string;
}

const SAMPLE_NOTE =
  "Note from Tuesday's call - Marlowe House, drawing room. Client approved the revised scheme on 3 June. Fee invoice sent 5 June, not yet paid. Next milestone: install week starting 14 July. Someone still needs to confirm access with the housekeeper.";

const SAMPLE_FILE_NAME = "manual-data-entry-sample.csv";

const SAMPLE_FILE_TEXT = [
  "client,project,date,status,next_action,owner",
  "Marlowe House,Drawing room,3 June,Revised scheme approved,Confirm access before install week,Unknown",
  "Marlowe House,Fee invoice,5 June,Sent but not yet paid,Check payment status,Accounts",
].join("\n");

const SAMPLE_PDF_NAME = "atelier-fabrics-invoice-sample.pdf";
const SAMPLE_PDF_PATH = `/${SAMPLE_PDF_NAME}`;
const SAMPLE_PDF_LABEL = "Sample supplier invoice";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 20,
  background: "#ffffff",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const buttonPrimary: React.CSSProperties = {
  background: "#111827",
  color: "#ffffff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 15,
  cursor: "pointer",
};

const buttonSecondary: React.CSSProperties = {
  background: "#ffffff",
  color: "#374151",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 16px",
  fontSize: 14,
  cursor: "pointer",
};

const fileButton: React.CSSProperties = {
  ...buttonSecondary,
  display: "inline-flex",
  alignItems: "center",
  minHeight: 37,
};

const buttonDisabled: React.CSSProperties = {
  ...buttonSecondary,
  color: "#9ca3af",
  cursor: "not-allowed",
};

const destinationTile: React.CSSProperties = {
  border: "1px solid #eef0f3",
  borderRadius: 8,
  padding: "12px 14px",
  background: "#f9fafb",
};

const DESTINATIONS: { name: string; fields: string; caveat?: string }[] = [
  {
    name: "Finance / Xero",
    fields:
      "Invoice number, supplier, amount, VAT, due date, and payment status.",
  },
  {
    name: "Project Ops / Monday.com",
    fields:
      "Follow-up owner, delivery or access dates, procurement status, and blockers.",
    caveat:
      "Monday.com can be a useful operational destination for reviewed records, but it is not necessarily the canonical database.",
  },
  {
    name: "Design / Studio Designer or cost sheet",
    fields:
      "Item specs, supplier references, room, quantity, and project budget impact.",
  },
];

function confidenceColor(c: Confidence): string {
  if (c === "High") return "#166534";
  if (c === "Medium") return "#92400e";
  return "#991b1b";
}

function confidenceBg(c: Confidence): string {
  if (c === "High") return "#dcfce7";
  if (c === "Medium") return "#fef3c7";
  return "#fee2e2";
}

function Badge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 999,
        color: confidenceColor(confidence),
        background: confidenceBg(confidence),
      }}
    >
      {confidence}
    </span>
  );
}

function LoadingState() {
  return (
    <section
      style={{
        ...card,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <style>{`
        @keyframes willowSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes willowLoad {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(260%); }
        }
      `}</style>
      <div
        style={{
          width: 22,
          height: 22,
          border: "2px solid #e5e7eb",
          borderTopColor: "#111827",
          borderRadius: "50%",
          animation: "willowSpin 0.8s linear infinite",
          flex: "0 0 auto",
        }}
      />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>
          Extracting fields for review
        </p>
        <p style={{ margin: "2px 0 8px", fontSize: 13, color: "#6b7280" }}>
          Reading the source and checking what needs human confirmation.
        </p>
        <div
          style={{
            height: 3,
            overflow: "hidden",
            borderRadius: 999,
            background: "#e5e7eb",
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              borderRadius: 999,
              background: "#111827",
              animation: "willowLoad 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default function ScenarioRunner() {
  const [rawText, setRawText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extraction | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  function loadSource(text: string, label: string, file: File | null = null) {
    setRawText(text);
    setSourceLabel(label);
    setSourceFile(file);
    setError(null);
    setResult(null);
    setReviewed(false);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large for this prototype. Please use a file under 8MB.");
      event.target.value = "";
      return;
    }
    const isTextPreview =
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".md") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".json");
    if (isTextPreview) {
      const text = await file.text();
      if (!text.includes("\u0000")) {
        loadSource(text, file.name, file);
        return;
      }
    }
    loadSource("", file.name, file);
  }

  async function loadSamplePdf() {
    setError(null);
    try {
      const response = await fetch(SAMPLE_PDF_PATH);
      if (!response.ok) throw new Error("Sample PDF could not be loaded.");
      const blob = await response.blob();
      const sample = new File([blob], SAMPLE_PDF_NAME, {
        type: "application/pdf",
      });
      loadSource("", SAMPLE_PDF_LABEL, sample);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sample PDF could not be loaded.",
      );
    }
  }

  async function handleExtract() {
    setError(null);
    setResult(null);
    setReviewed(false);
    const trimmed = rawText.trim();
    if (!trimmed && !sourceFile) {
      setError("Paste text or upload a file before extracting.");
      return;
    }
    setLoading(true);
    try {
      const body = sourceFile
        ? (() => {
            const form = new FormData();
            form.append("rawText", trimmed);
            form.append("sourceLabel", sourceLabel || sourceFile.name);
            form.append("file", sourceFile);
            return form;
          })()
        : JSON.stringify({
            rawText: trimmed,
            sourceLabel: sourceLabel || undefined,
          });

      const res = await fetch("/api/willowops/data-entry/extract", {
        method: "POST",
        headers: sourceFile ? undefined : { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body && typeof body.error === "string"
            ? body.error
            : `Extraction request failed (${res.status}).`,
        );
      }
      const data = (await res.json()) as { extraction: Extraction };
      setResult(data.extraction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setLoading(false);
    }
  }

  const reviewState = result
    ? reviewed
      ? "Approved - ready to route"
      : "Extracted - awaiting review"
    : "No record yet";

  return (
    <div>
      <section style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 12 }}>
          Messy source
        </h2>
        <label style={label} htmlFor="raw-text">
          Paste a note, email excerpt, list, or upload the source file
        </label>
          <textarea
            id="raw-text"
            value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setSourceLabel("");
            setSourceFile(null);
            setResult(null);
            setReviewed(false);
          }}
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
          }}
          placeholder="Paste messy text here..."
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <button
            type="button"
            style={loading ? { ...buttonPrimary, opacity: 0.6 } : buttonPrimary}
            onClick={handleExtract}
            disabled={loading}
          >
            {loading ? "Extracting..." : "Extract fields"}
          </button>
          <button
            type="button"
            style={buttonSecondary}
            onClick={() => {
              loadSource(SAMPLE_NOTE, "Sample project note");
            }}
          >
            Use sample note
          </button>
          <button
            type="button"
            style={buttonSecondary}
            onClick={() => {
              const sample = new File([SAMPLE_FILE_TEXT], SAMPLE_FILE_NAME, {
                type: "text/csv",
              });
              loadSource(SAMPLE_FILE_TEXT, SAMPLE_FILE_NAME, sample);
            }}
          >
            Use sample file
          </button>
          <button type="button" style={buttonSecondary} onClick={loadSamplePdf}>
            Use sample supplier invoice
          </button>
          <label htmlFor="source-file" style={fileButton}>
            Upload file
            <input
              id="source-file"
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,image/*,text/plain,text/markdown,text/csv,application/json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "10px 0 0" }}>
          Try a supplier invoice, quote, delivery note, project cost sheet, or
          client note.
        </p>
        {sourceLabel ? (
          <p style={{ color: "#6b7280", fontSize: 13, margin: "10px 0 0" }}>
            Source loaded: {sourceLabel}
          </p>
        ) : null}
        {error ? (
          <p style={{ color: "#991b1b", fontSize: 14, marginTop: 12 }}>{error}</p>
        ) : null}
      </section>

      {loading ? <LoadingState /> : null}

      {result ? (
        <>
          <section style={{ ...card, marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <h2 style={{ fontSize: 20, margin: 0 }}>
                Review-ready admin record
              </h2>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Record confidence: <Badge confidence={result.confidence} />
              </div>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {result.recordTitle}
            </p>
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 0 }}>
              {result.sourceSummary}
            </p>

            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#6b7280" }}>
                  <th style={{ padding: "8px 8px 8px 0" }}>Field</th>
                  <th style={{ padding: "8px 8px 8px 0" }}>Value</th>
                  <th style={{ padding: "8px 8px 8px 0" }}>Confidence</th>
                  <th style={{ padding: "8px 0" }}>Where this came from</th>
                </tr>
              </thead>
              <tbody>
                {result.fields.map((f, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 8px 8px 0", fontWeight: 600 }}>
                      {f.label}
                    </td>
                    <td style={{ padding: "8px 8px 8px 0" }}>{f.value}</td>
                    <td style={{ padding: "8px 8px 8px 0" }}>
                      <Badge confidence={f.confidence} />
                    </td>
                    <td style={{ padding: "8px 0", color: "#6b7280" }}>
                      {f.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {result.missingFields.length > 0 ? (
              <div
                style={{
                  marginTop: 16,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                  Missing / needs review
                </p>
                <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 14 }}>
                  {result.missingFields.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.reviewWarnings.length > 0 ? (
              <ul
                style={{
                  margin: "12px 0 0",
                  paddingLeft: 20,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                {result.reviewWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}

            <p style={{ fontSize: 14, marginTop: 16, marginBottom: 0 }}>
              <strong>Suggested next action:</strong> {result.suggestedNextAction}
            </p>
          </section>

          <section style={{ ...card, marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, marginTop: 0 }}>
              Human review before anything moves
            </h2>
            <p style={{ fontSize: 14, color: "#374151", marginTop: 0 }}>
              A team member checks the extracted fields, fixes anything
              uncertain, then chooses where the approved record should go.
            </p>
            <p style={{ fontSize: 14, color: "#374151" }}>
              Current state: <strong>{reviewState}</strong>
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                style={reviewed ? buttonDisabled : buttonPrimary}
                disabled={reviewed}
                onClick={() => setReviewed(true)}
              >
                Approve record
              </button>
              <button type="button" style={buttonDisabled} disabled>
                Edit before sending
              </button>
              <button type="button" style={buttonDisabled} disabled>
                Reject extraction
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "14px 0 0" }}>
              In a pilot, this review step would create the audit trail: who
              approved it, what changed, and where it was sent.
            </p>
          </section>

          <section style={{ ...card, marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, marginTop: 0 }}>
              After approval, route it to the right system
            </h2>
            <p style={{ fontSize: 14, color: "#374151", marginTop: 0 }}>
              Different records should land in different places. A supplier
              invoice might update Xero and a project cost sheet; a delivery
              note might update Monday.com or Studio Designer; a client note
              might become a task or follow-up. Nothing is written anywhere
              from this prototype.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {DESTINATIONS.map((d) => (
                <div key={d.name} style={destinationTile}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                    {d.name}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      margin: "6px 0 0",
                    }}
                  >
                    {d.fields}
                  </p>
                  {d.caveat ? (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        margin: "8px 0 0",
                      }}
                    >
                      {d.caveat}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "14px 0 0" }}>
              The first pilot would not connect every system at once. It would
              prove one repeatable workflow, then map approved fields into the
              right destination. If Willow Grey later chooses a central
              database as the canonical record, approved records are already
              structured for it.
            </p>
            {result.recommendedDestination === "Needs decision" ? (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0" }}>
                The extraction did not suggest a destination - that routing
                decision stays with your team.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#6b7280", margin: "8px 0 0" }}>
                Suggested starting point for this record:{" "}
                <strong>{result.recommendedDestination}</strong> - a suggestion
                only, the routing decision stays with your team.
              </p>
            )}
          </section>

          <details style={{ ...card, marginBottom: 24 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Developer response
            </summary>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Raw structured output from the extraction endpoint
              (generatedBy: {result.generatedBy}). The endpoint only calls a
              GPT model server-side; it performs no writes to any external
              system.
            </p>
            <pre
              style={{
                background: "#111827",
                color: "#e5e7eb",
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </>
      ) : null}
    </div>
  );
}
