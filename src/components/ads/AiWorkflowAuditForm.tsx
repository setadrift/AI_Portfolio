"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";

type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  gclid: string;
  gbraid: string;
  wbraid: string;
  landing_path: string;
  landing_url: string;
  referrer: string;
  first_touch_at: string;
  current_touch_at: string;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

const emptyAttribution: Attribution = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  gclid: "",
  gbraid: "",
  wbraid: "",
  landing_path: "",
  landing_url: "",
  referrer: "",
  first_touch_at: "",
  current_touch_at: "",
};

declare global {
  interface Window {
    gtag?: (
      command: "event",
      action: string,
      params: Record<string, string | number | undefined>,
    ) => void;
  }
}

function getAttribution() {
  const url = new URL(window.location.href);
  const now = new Date().toISOString();
  const current: Attribution = {
    ...emptyAttribution,
    landing_path: `${url.pathname}${url.search}`,
    landing_url: url.href,
    referrer: document.referrer,
    first_touch_at: now,
    current_touch_at: now,
  };

  for (const key of ATTRIBUTION_KEYS) {
    current[key] = url.searchParams.get(key) || "";
  }

  const stored = window.localStorage.getItem("da_first_touch_attribution");
  if (stored) {
    try {
      const firstTouch = JSON.parse(stored) as Partial<Attribution>;
      return {
        ...current,
        first_touch_at: firstTouch.first_touch_at || current.first_touch_at,
        utm_source: current.utm_source || firstTouch.utm_source || "",
        utm_medium: current.utm_medium || firstTouch.utm_medium || "",
        utm_campaign: current.utm_campaign || firstTouch.utm_campaign || "",
        utm_term: current.utm_term || firstTouch.utm_term || "",
        utm_content: current.utm_content || firstTouch.utm_content || "",
        gclid: current.gclid || firstTouch.gclid || "",
        gbraid: current.gbraid || firstTouch.gbraid || "",
        wbraid: current.wbraid || firstTouch.wbraid || "",
        referrer: current.referrer || firstTouch.referrer || "",
      };
    } catch {
      window.localStorage.removeItem("da_first_touch_attribution");
    }
  }

  window.localStorage.setItem(
    "da_first_touch_attribution",
    JSON.stringify(current),
  );
  return current;
}

type AiWorkflowAuditFormProps = {
  contextLabel?: string;
  defaultWorkflow?: string;
  workflowPlaceholder?: string;
};

export default function AiWorkflowAuditForm({
  contextLabel = "AI workflow audit",
  defaultWorkflow = "",
  workflowPlaceholder = "Example: every week we manually copy data from Airtable into spreadsheets, summarize it, and send status emails.",
}: AiWorkflowAuditFormProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    businessName: "",
    website: "",
    country: "",
    teamSize: "",
    budgetRange: "",
    workflow: defaultWorkflow,
    tools: "",
    timeline: "",
    message: "",
    companyTrap: "",
  });
  const [attribution, setAttribution] =
    useState<Attribution>(emptyAttribution);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setAttribution(getAttribution());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          formType: "ai-workflow-audit",
          attribution,
          landingContext: contextLabel,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Something went wrong.");
      }

      window.gtag?.("event", "conversion", {
        send_to:
          process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_CONVERSION_SEND_TO || "",
      });

      setStatus("success");
      setForm({
        name: "",
        email: "",
        businessName: "",
        website: "",
        country: "",
        teamSize: "",
        budgetRange: "",
        workflow: defaultWorkflow,
        tools: "",
        timeline: "",
        message: "",
        companyTrap: "",
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  const inputStyles =
    "w-full border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-cream-dim focus:border-accent focus:ring-1 focus:ring-accent/30";
  const labelStyles =
    "mb-1.5 block font-mono text-xs uppercase tracking-wider text-cream-dim";

  if (status === "success") {
    return (
      <div className="border border-border bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="mb-3 font-display text-3xl text-cream">
          Request received.
        </h2>
        <p className="text-cream-muted">
          I will review the workflow details and reply directly. If it looks
          like a fit, the next step is a practical audit of the workflow,
          tools, handoffs, and automation options.
        </p>
      </div>
    );
  }

  return (
    <form
      id="audit-form"
      onSubmit={handleSubmit}
      className="border border-border bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:p-8"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="companyTrap">Company</label>
        <input
          id="companyTrap"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.companyTrap}
          onChange={(e) =>
            setForm({ ...form, companyTrap: e.target.value })
          }
        />
      </div>

      <div className="mb-6">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-accent">
          Request an audit
        </p>
        <h2 className="font-display text-3xl text-cream">
          Tell me what workflow you want fixed.
        </h2>
        {contextLabel !== "AI workflow audit" && (
          <p className="mt-3 text-sm leading-6 text-cream-muted">
            Context: {contextLabel}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelStyles}>
            Name
          </label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelStyles}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="businessName" className={labelStyles}>
            Business
          </label>
          <input
            id="businessName"
            value={form.businessName}
            onChange={(e) =>
              setForm({ ...form, businessName: e.target.value })
            }
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="website" className={labelStyles}>
            Website
          </label>
          <input
            id="website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className={inputStyles}
          />
        </div>
        <div>
          <label htmlFor="country" className={labelStyles}>
            Country
          </label>
          <select
            id="country"
            required
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className={inputStyles}
          >
            <option value="">Select</option>
            <option>Canada</option>
            <option>United States</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="teamSize" className={labelStyles}>
            Team size
          </label>
          <select
            id="teamSize"
            value={form.teamSize}
            onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
            className={inputStyles}
          >
            <option value="">Select</option>
            <option>1-5</option>
            <option>6-20</option>
            <option>21-50</option>
            <option>51-200</option>
            <option>200+</option>
          </select>
        </div>
        <div>
          <label htmlFor="budgetRange" className={labelStyles}>
            Budget range
          </label>
          <select
            id="budgetRange"
            value={form.budgetRange}
            onChange={(e) =>
              setForm({ ...form, budgetRange: e.target.value })
            }
            className={inputStyles}
          >
            <option value="">Select</option>
            <option>Under $2,500</option>
            <option>$2,500-$7,500</option>
            <option>$7,500-$20,000</option>
            <option>$20,000+</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <div>
          <label htmlFor="timeline" className={labelStyles}>
            Timeline
          </label>
          <select
            id="timeline"
            value={form.timeline}
            onChange={(e) => setForm({ ...form, timeline: e.target.value })}
            className={inputStyles}
          >
            <option value="">Select</option>
            <option>ASAP</option>
            <option>This month</option>
            <option>This quarter</option>
            <option>Just exploring</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="workflow" className={labelStyles}>
          Workflow to improve
        </label>
        <textarea
          id="workflow"
          required
          rows={4}
          value={form.workflow}
          onChange={(e) => setForm({ ...form, workflow: e.target.value })}
          placeholder={workflowPlaceholder}
          className={inputStyles}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="tools" className={labelStyles}>
          Tools involved
        </label>
        <input
          id="tools"
          value={form.tools}
          onChange={(e) => setForm({ ...form, tools: e.target.value })}
          placeholder="Airtable, Google Sheets, HubSpot, Gmail, Make, n8n, Zapier..."
          className={inputStyles}
        />
      </div>

      <div className="mt-5">
        <label htmlFor="message" className={labelStyles}>
          Anything else
        </label>
        <textarea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={inputStyles}
        />
      </div>

      <p className="mt-5 text-sm text-cream-muted">
        Best fit: a real business workflow, a clear owner, and enough volume
        that saving a few hours every week matters.
      </p>

      {status === "error" && (
        <p className="mt-5 text-sm text-red-500">{errorMsg}</p>
      )}

      <div className="mt-6">
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Request an audit"}
        </Button>
      </div>
    </form>
  );
}
