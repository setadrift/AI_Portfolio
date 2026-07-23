import assert from "node:assert/strict";
import test from "node:test";
import type { AppointmentJourneyFact } from "@/lib/portal/ttg/dashboard";
import { patientJourneyMetrics } from "./AdminFlowViews";

const fact = (
  date: string,
  patientKey: string,
  practitioner: string,
  state: string,
  consultation = false,
): AppointmentJourneyFact => ({
  date,
  patientKey,
  practitioner,
  state,
  consultation,
  firstVisit: false,
});

test("patient journey metrics link consults to later therapy without client identities", () => {
  const facts = [
    fact("2026-07-02", "hashed-client-1", "Therapist A", "arrived", true),
    fact("2026-07-03", "hashed-client-2", "Therapist B", "completed", true),
    fact("2026-07-05", "hashed-client-1", "Therapist A", "arrived"),
    fact("2026-07-12", "hashed-client-1", "Therapist A", "completed"),
    fact("2026-07-06", "hashed-client-2", "Therapist B", "cancelled"),
  ];
  const metrics = patientJourneyMetrics(facts, {
    kind: "custom",
    offset: 0,
    start: "2026-07-01",
    end: "2026-07-10",
    label: "Jul 1–10, 2026",
  });

  assert.equal(metrics.consultationAppointments, 2);
  assert.equal(metrics.completedConsultations, 2);
  assert.equal(metrics.consultClients, 2);
  assert.equal(metrics.bookedTherapyClients, 1);
  assert.equal(metrics.attendedTherapyClients, 1);
  assert.equal(metrics.therapyClients, 1);
  assert.equal(metrics.therapySessions, 1);
  assert.equal(metrics.practitioners.find((row) => row.label === "Therapist A")?.consultConversion, 1);
  assert.doesNotMatch(JSON.stringify(metrics), /client names|first_name|last_name/i);
});
