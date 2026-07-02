"use client";

import { useMemo, useState } from "react";

type RunnerState = "idle" | "running" | "done" | "error";

type EnrollmentCheck = {
  action: "skip" | "add_client_to_class" | "route_to_va_review";
  mindbodyClassId: string;
  status: "Already enrolled" | "Missing" | "Waitlist" | "Conflict";
  title: string;
};

type ScenarioResult = {
  appiantGuardrail: {
    blockedHubSpotWrites: string[];
  };
  googleSheet: {
    appendedRow: {
      addedSessions: number;
      alreadyEnrolled: number;
      requiredSessions: number;
    };
  };
  hubSpot: {
    confirmationEmail: {
      template: string;
    };
    segmentAction: {
      listName: string;
    };
  };
  mindbody: {
    actionsToRun: Array<{
      classId: string;
      module: string;
    }>;
    enrollmentChecks: EnrollmentCheck[];
  };
  vaAlert: {
    required: boolean;
  };
};

const sampleRequest = {
  event: "course_purchase",
  mindbodyClientId: "MB-839104",
  courseId: "exec_function_foundations_fall",
};

function decisionText(check: EnrollmentCheck) {
  return check.action === "skip" ? "Leave booked" : "Add session";
}

export default function ScenarioRunner() {
  const [state, setState] = useState<RunnerState>("idle");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const statusText = useMemo(() => {
    if (state === "running") return "Checking enrollments...";
    if (state === "done") return "Sample purchase checked";
    if (state === "error") return "Request failed";
    return "Ready";
  }, [state]);

  async function runSamplePurchase() {
    setState("running");
    setErrorMessage("");

    try {
      const response = await fetch("/api/mindbody-enrollment/scenarios/course-purchase", {
        body: JSON.stringify(sampleRequest),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ScenarioResult;

      if (!response.ok) {
        throw new Error("The sample purchase could not be checked.");
      }

      setResult(data);
      setState("done");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown request error.");
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Run sample purchase</h2>
          <p className="mt-1 text-sm text-slate-500">{statusText}</p>
        </div>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          disabled={state === "running"}
          onClick={() => void runSamplePurchase()}
          type="button"
        >
          {state === "running" ? "Checking..." : "Run sample"}
        </button>
      </div>

      <div className="grid gap-0 md:grid-cols-[18rem_1fr]">
        <div className="border-b border-slate-200 bg-slate-50 p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Request</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Event</dt>
              <dd className="font-semibold text-slate-950">{sampleRequest.event}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mindbody client</dt>
              <dd className="font-semibold text-slate-950">{sampleRequest.mindbodyClientId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Course</dt>
              <dd className="font-semibold text-slate-950">{sampleRequest.courseId}</dd>
            </div>
          </dl>
        </div>

        <div className="p-5">
          {state === "error" ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-950">
              {errorMessage}
            </div>
          ) : result ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-950">{result.googleSheet.appendedRow.alreadyEnrolled}</p>
                  <p className="text-sm text-slate-500">already booked</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-950">{result.googleSheet.appendedRow.addedSessions}</p>
                  <p className="text-sm text-slate-500">to add</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-950">{result.appiantGuardrail.blockedHubSpotWrites.length}</p>
                  <p className="text-sm text-slate-500">protected fields</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Session</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {result.mindbody.enrollmentChecks.map((check) => (
                      <tr key={check.mindbodyClassId}>
                        <td className="px-3 py-2 font-semibold text-slate-950">{check.title}</td>
                        <td className="px-3 py-2 text-slate-600">{check.status}</td>
                        <td className="px-3 py-2 text-slate-600">{decisionText(check)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
                <p>HubSpot list: {result.hubSpot.segmentAction.listName}</p>
                <p>Email template: {result.hubSpot.confirmationEmail.template}</p>
                <p>Sheet row: {result.googleSheet.appendedRow.requiredSessions} sessions checked</p>
                <p>VA review: {result.vaAlert.required ? "required" : "not required"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              Click the button to run the sample request and see which sessions are skipped or added.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
