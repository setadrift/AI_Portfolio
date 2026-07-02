import {
  buildEnrollmentChecks,
  coursePurchase,
  edgeCaseChecks,
  makeModuleBlueprint,
  student,
} from "@/lib/mindbody-enrollment/prototype-data";
import ScenarioRunner from "./ScenarioRunner";

const enrollmentChecks = buildEnrollmentChecks();
const alreadyBooked = enrollmentChecks.filter((check) => check.status === "Already enrolled");
const missingSessions = enrollmentChecks.filter((check) => check.status === "Missing");

function DecisionBadge({ status }: { status: string }) {
  const classes =
    status === "Already enrolled"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-amber-200 bg-amber-50 text-amber-950";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}

export default function MindbodyEnrollmentAutomationPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f1] px-5 py-24 text-slate-950">
      <article className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
          <p className="text-sm text-slate-500">Work sample: Mindbody enrollment check</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
            Course purchase handled without duplicate class bookings.
          </h1>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8 px-6 py-7 sm:px-8">
            <section className="max-w-3xl space-y-4 text-base leading-7 text-slate-700">
              <p>
                This example shows the core rule for the first build: before adding a student to course
                sessions in Mindbody, check their current class visits and add only the sessions that are
                missing.
              </p>
              <p>
                In this sample purchase, two sessions are already booked and two are missing. The existing
                bookings are left alone; only the missing sessions move forward.
              </p>
            </section>

            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Sample input</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{coursePurchase.courseName}</h2>
                </div>
                <p className="text-sm text-slate-500">
                  {alreadyBooked.length} already booked, {missingSessions.length} to add
                </p>
              </div>

              <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Session</th>
                      <th className="px-4 py-3 font-semibold">Mindbody class</th>
                      <th className="px-4 py-3 font-semibold">Current check</th>
                      <th className="px-4 py-3 font-semibold">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrollmentChecks.map((check) => (
                      <tr key={check.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{check.title}</div>
                          <div className="text-xs text-slate-500">
                            {check.coach} - {check.room}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{check.mindbodyClassId}</td>
                        <td className="px-4 py-3">
                          <DecisionBadge status={check.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {check.action === "skip" ? "Do nothing" : "Add this session"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 border-t border-slate-200 pt-7 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Automation behavior</h2>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  <li>Receive the course purchase.</li>
                  <li>Search current Mindbody class visits for the student.</li>
                  <li>Compare current visits to required course sessions.</li>
                  <li>Add only sessions that are missing.</li>
                  <li>Write the result to HubSpot, the log sheet, and the template payload.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-950">Fields protected</h2>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  <li>Appiant-owned contact identity fields in HubSpot.</li>
                  <li>Existing Mindbody bookings that already match the course.</li>
                  <li>Post-enrollment template payload until the booking result is known.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-950">Output record</h2>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 sm:grid-cols-2">
                <p>Mindbody: two add-class actions prepared.</p>
                <p>HubSpot: course status and list membership ready to update.</p>
                <p>Google Sheet: purchase result ready to append.</p>
                <p>Staff review: two missing sessions flagged with the exact add-class result.</p>
              </div>
            </section>

            <ScenarioRunner />
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 px-6 py-7 sm:px-8 lg:border-l lg:border-t-0">
            <div className="space-y-6">
              <section>
                <p className="text-sm font-semibold text-slate-500">Sample student</p>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Student</dt>
                    <dd className="font-semibold text-slate-950">{student.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Notification recipient</dt>
                    <dd className="font-semibold text-slate-950">{student.guardianEmail}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Course</dt>
                    <dd className="font-semibold text-slate-950">{coursePurchase.courseName}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                Net result: no duplicate sessions, two missing sessions prepared, HubSpot identity fields protected.
              </section>

              <details className="rounded-md border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-950">Technical notes</summary>
                <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                  <div>
                    <p className="font-semibold text-slate-950">Connector steps I would expect</p>
                    <ul className="mt-2 space-y-2">
                      {makeModuleBlueprint.map((step) => (
                        <li key={step.module}>{step.module}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">Edge cases to test</p>
                    <ul className="mt-2 space-y-2">
                      {edgeCaseChecks.slice(0, 4).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
