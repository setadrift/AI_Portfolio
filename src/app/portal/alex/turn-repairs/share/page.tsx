import { listTurnRepairRecords } from "@/lib/portal/alex/turn-repairs";
import ContractorSharePreview from "./ContractorSharePreview";

export default async function ContractorSharePage() {
  const records = await listTurnRepairRecords().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Contractor share
      </p>
      <h1 className="mb-3 font-display text-4xl">Create a clean view-only repair list</h1>
      <p className="mb-8 max-w-3xl text-lg leading-8 text-cream-muted">
        Filter to the property and contractor Alex just walked, remove unrelated items, and use the
        preview as the source for a PDF, email draft, or read-only contractor link.
      </p>
      <ContractorSharePreview records={records} />
    </div>
  );
}
