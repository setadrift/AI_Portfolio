import { listTurnRepairRecords } from "@/lib/portal/alex/turn-repairs";
import TurnRepairWorkViews from "./TurnRepairWorkViews";

export default async function TurnRepairWorkPage() {
  const records = await listTurnRepairRecords().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Mobile work views
      </p>
      <h1 className="mb-3 font-display text-4xl">Shop, walk contractors, and close out repairs</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        These views avoid the wide Airtable table problem. They are shaped around the phone moments
        Alex described: buying materials, walking a contractor, answering contractor calls, and
        checking completion at the end of the night.
      </p>
      <TurnRepairWorkViews initialRecords={records} />
    </div>
  );
}
