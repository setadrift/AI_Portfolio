import type { Metadata } from "next";
import ScenarioRunner from "./ScenarioRunner";

export const metadata: Metadata = {
  title: "Willow Grey Data-Entry Prototype",
  description:
    "A review-first prototype that turns messy notes into structured, human-approved records.",
};

const pageStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "104px 24px 80px",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#1f2937",
  lineHeight: 1.55,
};

export default function WillowOpsPrototypePage() {
  return (
    <main style={pageStyle}>
      <p
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 12,
        }}
      >
        Willow Grey data-entry prototype
      </p>

      <h1 style={{ fontSize: 34, lineHeight: 1.2, marginBottom: 16 }}>
        Turn hours of repetitive data entry into review-ready records.
      </h1>

      <p style={{ fontSize: 17, marginBottom: 40 }}>
        A small review-first pilot for turning repetitive manual data entry into
        clean records your team can approve before anything is sent onward.
      </p>

      <ScenarioRunner />

      <section style={{ marginTop: 56 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Next step</h2>
        <p style={{ fontSize: 16, color: "#374151" }}>
          If this direction is useful, the paid first step is to pick one real
          data-entry task, define the target fields together, and run a
          review-first pilot before connecting anything to a live system. The
          question of where approved records should ultimately live stays open
          until the fields are trusted.
        </p>
      </section>
    </main>
  );
}
