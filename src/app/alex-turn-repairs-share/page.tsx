import { verifyContractorShareScope } from "@/lib/portal/alex/contractor-share-access";
import {
  buildContractorSharePreview,
  listTurnRepairRecords,
} from "@/lib/portal/alex/turn-repairs";
import PrintButton from "./PrintButton";

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AlexTurnRepairsSharePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const shareToken = singleValue(params.shareToken);
  const scope = shareToken ? await verifyContractorShareScope(shareToken) : null;

  if (!scope) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Repair list unavailable</h1>
        <p className="mt-4 text-cream-muted">
          This contractor repair list link is missing, expired, or invalid.
        </p>
      </main>
    );
  }

  const records = await listTurnRepairRecords().catch(() => []);
  const preview = buildContractorSharePreview({
    records,
    property: scope.property,
    contractor: scope.contractor,
    excludedIds: scope.excludedIds,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:px-0">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6 print:border-neutral-300">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted print:text-neutral-500">
            Contractor repair list
          </p>
          <h1 className="font-display text-4xl print:text-3xl">{scope.property || "Selected repairs"}</h1>
          {scope.contractor && <p className="mt-2 text-cream-muted print:text-neutral-700">For {scope.contractor}</p>}
        </div>
        <PrintButton />
      </div>

      <section className="space-y-4">
        {preview.records.map((record, index) => (
          <article key={record.id} className="rounded-xl border border-border bg-surface p-5 print:border-neutral-300 print:bg-white">
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-white print:bg-neutral-900">
                {index + 1}
              </div>
              <div>
                <h2 className="font-display text-2xl print:text-xl">{record.repair}</h2>
                <p className="mt-1 text-sm text-cream-muted print:text-neutral-600">
                  {[record.area, record.materialsNeeded && "materials noted"].filter(Boolean).join(" / ")}
                </p>
              </div>
            </div>
            {record.notes && <p className="mt-4 text-sm leading-6 text-cream-muted print:text-neutral-700">{record.notes}</p>}
            {record.materialsNeeded && (
              <p className="mt-3 text-sm leading-6 text-cream-muted print:text-neutral-700">
                <span className="font-medium text-foreground print:text-neutral-900">Materials:</span> {record.materialsNeeded}
              </p>
            )}
            {!!record.photos.length && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {record.photos.slice(0, 4).map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={photo} src={photo} alt="" className="max-h-72 rounded-lg border border-border object-cover print:max-h-56" />
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      {!preview.records.length && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-cream-muted">
          No repair items are included in this contractor list.
        </div>
      )}
    </main>
  );
}

function singleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
