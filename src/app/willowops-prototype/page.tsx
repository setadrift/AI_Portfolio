import {
  automationLogs,
  getClient,
  getDashboardSummary,
  getFinanceSnapshot,
  getProjectAutomationLogs,
  getProjectProcurement,
  handoffChecklist,
  mondayBoardBlueprint,
  projects,
  sampleAiBrief,
  sourceOfTruthRows,
  trainingModules,
} from "@/lib/willowops/prototype-data";
import type { ReactNode } from "react";
import ScenarioRunner from "./ScenarioRunner";

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  currency: "GBP",
  maximumFractionDigits: 0,
  style: "currency",
});

function riskClass(riskStatus: string) {
  if (riskStatus === "At risk" || riskStatus === "Blocked") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }

  if (riskStatus === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export default function WillowOpsPrototypePage() {
  const summary = getDashboardSummary();

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#1f2933]">
      <section className="border-b border-stone-200 bg-[#fcfbf8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 lg:px-8">
          <div className="max-w-4xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#6c5f4a]">
              WillowOps Prototype
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#1f2933] md:text-5xl">
              Control tower for a luxury interiors operation
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#52606d]">
              A sandbox dashboard for mapping enquiries, projects, procurement,
              finance, communications, AI drafts, and automation health across
              Monday.com, Make, Microsoft 365, Studio Designer, Xero, and
              WhatsApp-style workflows.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Metric label="Active projects" value={summary.activeProjects} />
            <Metric label="At-risk projects" value={summary.atRiskProjects} tone="danger" />
            <Metric label="Pending approvals" value={summary.pendingApprovals} tone="warn" />
            <Metric label="Delayed items" value={summary.delayedItems} tone="warn" />
            <Metric label="Outstanding" value={moneyFormatter.format(summary.outstandingTotal)} />
            <Metric label="Review queue" value={summary.automationReviewQueue} tone="warn" />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-8">
        <div className="space-y-6">
          <Panel title="Scenario Runner" eyebrow="Clickable local API demo">
            <ScenarioRunner />
          </Panel>

          <Panel title="Project Pipeline" eyebrow="Monday.com operating model">
            <div className="grid gap-4">
              {projects.map((project) => {
                const client = getClient(project.clientId);
                const finance = getFinanceSnapshot(project.id);
                const procurement = getProjectProcurement(project.id);
                const logs = getProjectAutomationLogs(project.id);

                return (
                  <article
                    className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
                    key={project.id}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-[#24303f]">{project.name}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClass(project.riskStatus)}`}>
                            {project.riskStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#697586]">
                          {client?.name} - {project.serviceType} - {project.propertyLocation}
                        </p>
                      </div>
                      <div className="rounded-md border border-stone-200 bg-[#f8fafc] px-3 py-2 text-sm">
                        <div className="font-semibold text-[#24303f]">{project.stage}</div>
                        <div className="text-[#697586]">Install target: {project.targetInstallDate}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Info label="Next action" value={project.nextAction} />
                      <Info
                        label="Finance"
                        value={`${finance?.paymentStatus ?? "Unknown"} / ${moneyFormatter.format(finance?.outstandingTotal ?? 0)} outstanding`}
                      />
                      <Info
                        label="Automation"
                        value={`${logs.length} run${logs.length === 1 ? "" : "s"}, ${logs.filter((log) => log.humanReviewRequired).length} needs review`}
                      />
                    </div>

                    <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#f5f3ee] text-xs uppercase text-[#6c5f4a]">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Supplier</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Blocker</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 bg-white">
                          {procurement.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 font-medium text-[#24303f]">{item.itemName}</td>
                              <td className="px-3 py-2 text-[#52606d]">{item.supplier}</td>
                              <td className="px-3 py-2 text-[#52606d]">{item.status}</td>
                              <td className="px-3 py-2 text-[#52606d]">{item.blockedReason ?? "None"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel title="Source Of Truth Map" eyebrow="Process redesign">
            <div className="overflow-hidden rounded-lg border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#24303f] text-xs uppercase text-white">
                  <tr>
                    <th className="px-4 py-3">Workflow</th>
                    <th className="px-4 py-3">Source of truth</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {sourceOfTruthRows.map((row) => (
                    <tr key={row.workflowArea}>
                      <td className="px-4 py-3 font-medium text-[#24303f]">{row.workflowArea}</td>
                      <td className="px-4 py-3 text-[#52606d]">{row.sourceOfTruth}</td>
                      <td className="px-4 py-3 text-[#52606d]">{row.automationTrigger}</td>
                      <td className="px-4 py-3 text-[#52606d]">{row.humanOwner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Training And Handoff" eyebrow="Change management">
            <div className="grid gap-4 md:grid-cols-2">
              {trainingModules.map((module) => (
                <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm" key={module.title}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c5f4a]">
                        {module.audience}
                      </p>
                      <h3 className="mt-1 font-semibold text-[#24303f]">{module.title}</h3>
                    </div>
                    <span className="rounded-full bg-[#e8eef6] px-2 py-1 text-xs font-semibold text-[#27496d]">
                      {module.duration}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#52606d]">{module.outcome}</p>
                  <ul className="mt-3 space-y-1 text-sm leading-6 text-[#697586]">
                    {module.exercises.map((exercise) => (
                      <li key={exercise}>- {exercise}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-stone-200 bg-[#f8fafc] p-4">
              <h3 className="font-semibold text-[#24303f]">Handoff checklist</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {handoffChecklist.map((item) => (
                  <div className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-[#52606d]" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="AI Discovery Brief" eyebrow="Review-first AI layer">
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <h3 className="font-semibold text-[#24303f]">Reeves Residence</h3>
              <p className="mt-2 text-sm leading-6 text-[#52606d]">{sampleAiBrief.summary}</p>
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c5f4a]">
                  Questions to confirm
                </h4>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[#52606d]">
                  {sampleAiBrief.discoveryQuestions.map((question) => (
                    <li key={question}>- {question}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                Human review required before any client-facing email or WhatsApp message is sent.
              </div>
            </div>
          </Panel>

          <Panel title="Monday Board Blueprint" eyebrow="Manual setup checklist">
            <div className="space-y-4">
              {mondayBoardBlueprint.map((board) => (
                <div className="rounded-lg border border-stone-200 bg-white p-4" key={board.board}>
                  <h3 className="font-semibold text-[#24303f]">{board.board}</h3>
                  <p className="mt-1 text-sm text-[#697586]">{board.purpose}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {board.statuses.map((status) => (
                      <span className="rounded-full bg-[#e8eef6] px-2 py-1 text-xs font-medium text-[#27496d]" key={status}>
                        {status}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#697586]">
                    Columns: {board.columns.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Automation Health" eyebrow="Make/Zapier visibility">
            <div className="space-y-3">
              {automationLogs.map((log) => (
                <div className="rounded-lg border border-stone-200 bg-white p-4" key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#24303f]">{log.eventType}</h3>
                      <p className="mt-1 text-sm text-[#697586]">{log.sourceSystem}</p>
                    </div>
                    <span className="rounded-full border border-stone-200 bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-[#24303f]">
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#697586]">
                    Review required: {log.humanReviewRequired ? "Yes" : "No"} - retries: {log.retryCount}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="First Build Target" eyebrow="What we wire first">
            <ol className="space-y-3 text-sm leading-6 text-[#52606d]">
              <li>1. Create the four Monday boards from the blueprint.</li>
              <li>2. Add one Reeves Residence enquiry/project row.</li>
              <li>3. Create a Make webhook scenario for status changes.</li>
              <li>4. Post the Make payload into this app&apos;s webhook endpoint.</li>
              <li>5. Use AI to generate the discovery brief and Outlook draft.</li>
            </ol>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Metric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "neutral" | "warn" | "danger";
  value: number | string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-stone-200 bg-white text-[#24303f]";

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] opacity-75">{label}</div>
    </div>
  );
}

function Panel({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-[#fcfbf8] p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6c5f4a]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold text-[#24303f]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-[#f8fafc] p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6c5f4a]">{label}</div>
      <div className="mt-1 text-sm leading-6 text-[#24303f]">{value}</div>
    </div>
  );
}
