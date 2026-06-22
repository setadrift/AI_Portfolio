import ReceiptExtractionDemo from "./ReceiptExtractionDemo";

export default function AlexReceiptsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cream-muted">
        Receipt extraction demo
      </p>
      <h1 className="mb-3 font-display text-4xl">Upload or paste a receipt</h1>
      <p className="mb-10 max-w-3xl text-lg leading-8 text-cream-muted">
        Test the review-first path for receipts, invoices, and field notes. The extraction result
        is shown for review before anything is written to Airtable.
      </p>
      <ReceiptExtractionDemo />
    </div>
  );
}
