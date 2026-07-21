import Link from "next/link";

export default function TtgHome() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 lg:py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-cream-muted mb-4">Private client portal</p>
      <h1 className="font-display text-5xl md:text-6xl mb-5 max-w-2xl">A clearer view of the practice.</h1>
      <p className="text-cream-muted text-lg mb-12 max-w-2xl">Review the latest financial and capacity picture, or turn a finished Google Doc into a WordPress draft.</p>
      <div className="grid md:grid-cols-2 gap-5">
        <Link href="/portal/ttg/dashboard" className="group block p-7 md:p-9 border border-[#d8ded9] rounded-[10px] bg-white hover:border-[#2f6f6d] hover:shadow-[0_12px_32px_rgba(32,48,47,0.08)] transition-all">
          <div className="text-xs uppercase tracking-[0.18em] text-[#2f6f6d] mb-12">Practice operations</div>
          <div className="flex items-end justify-between gap-6"><div><h2 className="font-display text-3xl mb-2">CEO dashboard</h2><p className="text-cream-muted text-sm max-w-sm">Revenue, margin, cash flow, therapist capacity, and monthly-close controls.</p></div><span className="text-2xl text-[#2f6f6d] group-hover:translate-x-1 transition-transform">→</span></div>
        </Link>
        <Link href="/portal/ttg/publish" className="group block p-7 md:p-9 border border-[#d8ded9] rounded-[10px] bg-white hover:border-[#2f6f6d] hover:shadow-[0_12px_32px_rgba(32,48,47,0.08)] transition-all">
          <div className="text-xs uppercase tracking-[0.18em] text-[#2f6f6d] mb-12">Content workflow</div>
          <div className="flex items-end justify-between gap-6"><div><h2 className="font-display text-3xl mb-2">Blog publisher</h2><p className="text-cream-muted text-sm max-w-sm">Clean up a Google Doc, create a featured image, and send a draft to WordPress.</p></div><span className="text-2xl text-[#2f6f6d] group-hover:translate-x-1 transition-transform">→</span></div>
        </Link>
      </div>
    </div>
  );
}
