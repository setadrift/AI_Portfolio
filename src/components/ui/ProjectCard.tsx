import Link from "next/link";
import type { Project } from "@/lib/constants";

export default function ProjectCard({ slug, clientType, title, challenge, result }: Project) {
  return (
    <Link
      href={`/projects/${slug}`}
      className="group flex flex-col rounded-xl border border-warm-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
    >
      <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
        {clientType}
      </span>
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">{challenge}</p>
      <p className="mt-auto text-sm font-medium text-slate-800">{result}</p>
      <span className="mt-4 text-sm font-medium text-amber-600 transition-colors group-hover:text-amber-700">
        Read case study &rarr;
      </span>
    </Link>
  );
}
