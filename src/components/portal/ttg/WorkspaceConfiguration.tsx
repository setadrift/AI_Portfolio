"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WorkspaceAction =
  | {
      action: "create-campaign";
      name: string;
      channel: string;
      startDate: string;
      endDate: string;
      spend: number;
    }
  | {
      action: "create-dashboard";
      name: string;
      description: string;
    }
  | {
      action: "add-widget";
      dashboardId: string;
      widgetType: string;
      title: string;
      metricKey?: string;
    };

async function saveWorkspaceAction(payload: WorkspaceAction) {
  const response = await fetch("/api/portal/ttg/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Could not save that change.");
}

function Dialog({
  title,
  intro,
  open,
  onClose,
  children,
}: {
  title: string;
  intro: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="ttg-workspace-dialog-backdrop" role="presentation">
      <div aria-labelledby="ttg-workspace-dialog-title" aria-modal="true" className="ttg-workspace-dialog" role="dialog">
        <button aria-label="Close" className="ttg-workspace-dialog-close" onClick={onClose} type="button">×</button>
        <h2 id="ttg-workspace-dialog-title">{title}</h2>
        <p>{intro}</p>
        {children}
      </div>
    </div>
  );
}

export function AddCampaignButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <button className="ttg-workspace-button" onClick={() => setOpen(true)} type="button">Add Campaign</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Campaign" intro="Add a marketing campaign to start tracking ROAS and attribution.">
        <form
          className="ttg-workspace-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSaving(true);
            const form = new FormData(event.currentTarget);
            try {
              await saveWorkspaceAction({
                action: "create-campaign",
                name: String(form.get("name") ?? ""),
                channel: String(form.get("channel") ?? ""),
                startDate: String(form.get("startDate") ?? ""),
                endDate: String(form.get("endDate") ?? ""),
                spend: Number(form.get("spend") ?? 0),
              });
              setOpen(false);
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not add that campaign.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>Campaign Name *<input name="name" placeholder="e.g. Google Ads - February" required /></label>
          <label>Platform *<select defaultValue="" name="channel" required><option disabled value="">Select platform</option><option>Google Ads</option><option>Meta Ads</option><option>Other</option></select></label>
          <div className="ttg-workspace-form-grid">
            <label>Start Date *<input name="startDate" required type="date" /></label>
            <label>End Date *<input name="endDate" required type="date" /></label>
          </div>
          <label>Total Spend *<input min="0" name="spend" required step="0.01" type="number" /></label>
          {error && <p className="ttg-workspace-form-error" role="alert">{error}</p>}
          <div className="ttg-workspace-form-actions"><button onClick={() => setOpen(false)} type="button">Cancel</button><button disabled={saving} type="submit">{saving ? "Adding…" : "Add Campaign"}</button></div>
        </form>
      </Dialog>
    </>
  );
}

export function NewDashboardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <button className="ttg-workspace-button" onClick={() => setOpen(true)} type="button">New Dashboard</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create Dashboard" intro="Give your dashboard a name and optional description.">
        <form
          className="ttg-workspace-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSaving(true);
            const form = new FormData(event.currentTarget);
            try {
              await saveWorkspaceAction({
                action: "create-dashboard",
                name: String(form.get("name") ?? ""),
                description: String(form.get("description") ?? ""),
              });
              setOpen(false);
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not create that dashboard.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>Name *<input name="name" placeholder="My Dashboard" required /></label>
          <label>Description<textarea name="description" placeholder="Optional description for this dashboard…" rows={4} /></label>
          {error && <p className="ttg-workspace-form-error" role="alert">{error}</p>}
          <div className="ttg-workspace-form-actions"><button onClick={() => setOpen(false)} type="button">Cancel</button><button disabled={saving} type="submit">{saving ? "Creating…" : "Create Dashboard"}</button></div>
        </form>
      </Dialog>
    </>
  );
}

const widgetOptions = [
  { value: "kpi", label: "KPI Card", detail: "Single metric with comparison" },
  { value: "chart", label: "Chart", detail: "Line, bar, pie, or area chart" },
  { value: "table", label: "Data Table", detail: "Tabular data with sorting" },
];

const metricOptions = [
  { value: "", label: "No metric selected" },
  { value: "total_revenue", label: "Total Revenue" },
  { value: "total_commission", label: "Total Commission" },
  { value: "avg_revenue_per_practitioner", label: "Avg Revenue per Practitioner" },
  { value: "appointments", label: "Appointments" },
  { value: "new_patients", label: "New Patients" },
];

export function AddWidgetButton({ dashboardId }: { dashboardId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <button className="ttg-workspace-button" onClick={() => setOpen(true)} type="button">Add Widget</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Widget" intro="Choose a widget type and the metric it should display.">
        <form
          className="ttg-workspace-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSaving(true);
            const form = new FormData(event.currentTarget);
            const widgetType = String(form.get("widgetType") ?? "kpi");
            const metricKey = String(form.get("metricKey") ?? "");
            try {
              await saveWorkspaceAction({
                action: "add-widget",
                dashboardId,
                widgetType,
                title: String(form.get("title") ?? "") || (widgetType === "kpi" ? "New KPI Card" : widgetType === "chart" ? "New Chart" : "New Data Table"),
                metricKey: metricKey || undefined,
              });
              setOpen(false);
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not add that widget.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <fieldset className="ttg-workspace-widget-options">
            <legend>Widget type</legend>
            {widgetOptions.map((option) => <label key={option.value}><input defaultChecked={option.value === "kpi"} name="widgetType" type="radio" value={option.value} /><span><strong>{option.label}</strong><small>{option.detail}</small></span></label>)}
          </fieldset>
          <label>Title<input name="title" placeholder="New KPI Card" /></label>
          <label>Metric<select defaultValue="" name="metricKey">{metricOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          {error && <p className="ttg-workspace-form-error" role="alert">{error}</p>}
          <div className="ttg-workspace-form-actions"><button onClick={() => setOpen(false)} type="button">Cancel</button><button disabled={saving} type="submit">{saving ? "Adding…" : "Add Widget"}</button></div>
        </form>
      </Dialog>
    </>
  );
}
