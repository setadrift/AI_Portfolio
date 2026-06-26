import { listTurnRepairProperties } from "@/lib/portal/alex/turn-repairs";
import TurnRepairCaptureForm from "./TurnRepairCaptureForm";

export default async function TurnRepairCapturePage() {
  const properties = await listTurnRepairProperties().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Field capture
      </p>
      <h1 className="mb-3 font-display text-4xl">Start a property capture session</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        Pick the property once, add quick context, upload photos, and stage the item for review.
        This is intentionally lighter than Airtable mobile and does not write directly to live data.
      </p>
      <TurnRepairCaptureForm properties={properties} />
    </div>
  );
}
