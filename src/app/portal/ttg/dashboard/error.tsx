"use client";

export default function TtgDashboardError() {
  return <div className="max-w-2xl mx-auto px-6 py-24"><p className="text-sm uppercase tracking-widest text-cream-muted mb-3">CEO dashboard</p><h1 className="font-display text-4xl mb-4">The reporting source is unavailable.</h1><p className="text-cream-muted mb-8">The dashboard did not substitute old data. Check the private Supabase reporting connection and try again.</p><button className="px-5 py-3 bg-foreground text-white rounded-lg" onClick={() => location.reload()}>Try again</button></div>;
}
