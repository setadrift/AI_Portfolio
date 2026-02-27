import type { Project } from "@/lib/constants";

export default function ProjectCard({ clientType, title, challenge, result }: Project) {
  return (
    <div className="flex flex-col rounded-xl border border-warm-200 bg-white p-6 shadow-sm">
      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
        {clientType}
      </span>
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">{challenge}</p>
      <p className="mt-auto text-sm font-medium text-slate-800">{result}</p>
    </div>
  );
}
