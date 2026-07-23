"use client";

import { useRef } from "react";

export type MetricHelpContent = {
  title: string;
  description: string;
  calculation: string;
  benchmark?: string;
};

export function MetricHelp({ help }: { help: MetricHelpContent }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        aria-label={`Help: ${help.title}`}
        className="ttg-metric-help-trigger"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        ?
      </button>
      <dialog
        aria-labelledby={`ttg-help-${help.title.replace(/\s+/g, "-").toLowerCase()}`}
        className="ttg-metric-help-dialog"
        ref={dialogRef}
      >
        <form method="dialog">
          <button aria-label="Close metric help" type="submit">×</button>
        </form>
        <h2 id={`ttg-help-${help.title.replace(/\s+/g, "-").toLowerCase()}`}>{help.title}</h2>
        <p>{help.description}</p>
        <span>Calculation</span>
        <code>{help.calculation}</code>
        {help.benchmark && <small>{help.benchmark}</small>}
      </dialog>
    </>
  );
}
