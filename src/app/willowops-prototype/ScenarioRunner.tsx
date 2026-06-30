"use client";

import { useState } from "react";

type Scenario = {
  body?: unknown;
  description: string;
  method: "GET" | "POST";
  name: string;
  path: string;
};

const scenarios: Scenario[] = [
  {
    name: "Qualified enquiry",
    description: "Make-style status event to AI brief, Outlook draft, Monday updates, and automation log.",
    method: "POST",
    path: "/api/willowops/scenarios/qualified-enquiry",
    body: {
      board: "Client Enquiries",
      itemId: "monday_item_123",
      projectId: "project_reeves",
      projectName: "Reeves Residence",
      previousStatus: "New",
      newStatus: "Qualified",
      changedAt: "2026-06-30T14:00:00Z",
      changedBy: "Operations",
    },
  },
  {
    name: "Outlook draft",
    description: "Microsoft Graph-shaped draft payload in review mode.",
    method: "POST",
    path: "/api/willowops/microsoft365/outlook-draft",
    body: {
      projectId: "project_reeves",
      mode: "draft",
    },
  },
  {
    name: "Studio import",
    description: "Studio Designer CSV export normalized into procurement review flags.",
    method: "POST",
    path: "/api/willowops/studio-designer/import",
    body: {
      csv: [
        "Project,Room,Supplier,Item,Status,Client Approval,PO Status,Invoice Status,Expected Delivery,Blocked Reason",
        "Shah House,Entrance hall,Heritage Lighting,Statement pendant and wall lights,Delayed,Approved,Acknowledged,Invoiced,2026-07-18,Supplier revised delivery date by 12 days",
        "Brooks Study,Study,Atelier Fabrics,Window treatment fabric,Proposed,Pending,Not started,Not invoiced,2026-07-29,Awaiting client approval",
        "Reeves Residence,Kitchen,Stone & Surface Ltd.,Honed stone worktop sample set,Proposed,Not required,Not started,Not invoiced,2026-07-16,",
      ].join("\n"),
    },
  },
  {
    name: "Xero invoice",
    description: "Overdue invoice event mapped into finance risk and dashboard impact.",
    method: "POST",
    path: "/api/willowops/xero/invoice-event",
    body: {
      eventType: "invoice_overdue",
      invoiceId: "xero_invoice_123",
      invoiceNumber: "INV-1042",
      projectId: "project_brooks",
      projectName: "Brooks Study",
      contactName: "Amelia Brooks",
      total: 12000,
      amountPaid: 0,
      amountDue: 12000,
      currency: "GBP",
      dueDate: "2026-06-24",
      status: "AUTHORISED",
    },
  },
  {
    name: "WhatsApp draft",
    description: "Supplier delay message draft with no external send.",
    method: "POST",
    path: "/api/willowops/whatsapp/message-draft",
    body: {
      projectId: "project_shah",
      itemId: "item_shah_lighting",
      audience: "supplier",
      reason: "supplier_delay",
    },
  },
  {
    name: "Leadership report",
    description: "Weekly management summary across projects, finance, procurement, and automation health.",
    method: "GET",
    path: "/api/willowops/reports/leadership-weekly",
  },
];

export default function ScenarioRunner() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string>("Run a scenario to inspect the response.");

  async function runScenario(scenario: Scenario) {
    setActiveScenario(scenario.name);
    setError(null);
    setResult("Running...");

    try {
      const response = await fetch(scenario.path, {
        body: scenario.body ? JSON.stringify(scenario.body) : undefined,
        headers: scenario.body ? { "Content-Type": "application/json" } : undefined,
        method: scenario.method,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(`Request failed with ${response.status}`);
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
      setResult("Request failed.");
    } finally {
      setActiveScenario(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <button
            className="w-full rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-[#8f7d5d] hover:bg-[#fffdf8] disabled:cursor-wait disabled:opacity-70"
            disabled={activeScenario !== null}
            key={scenario.name}
            onClick={() => void runScenario(scenario)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#24303f]">{scenario.name}</span>
              <span className="rounded-full bg-[#e8eef6] px-2 py-1 text-xs font-semibold text-[#27496d]">
                {scenario.method}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#697586]">{scenario.description}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-stone-200 bg-[#101828] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Scenario response</h3>
          {activeScenario ? (
            <span className="rounded-full bg-amber-300 px-2 py-1 text-xs font-semibold text-amber-950">
              Running {activeScenario}
            </span>
          ) : null}
        </div>
        {error ? (
          <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950">
            {error}
          </div>
        ) : null}
        <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-100">
          {result}
        </pre>
      </div>
    </div>
  );
}
