"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
