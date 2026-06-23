import Link from "next/link";

export default function TtgHome() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-3">Welcome.</h1>
      <p className="text-cream-muted text-lg mb-10">
        This is your private workspace for the blog automation tool. Everything you publish here
        lands as a draft in your WordPress dashboard for review before it goes live.
      </p>

      <div className="grid sm:grid-cols-1 gap-4">
        <Link
          href="/portal/ttg/publish"
          className="group block p-6 border border-border rounded-2xl bg-surface hover:border-accent hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-2xl">Publish a blog post</h2>
            <span className="text-accent group-hover:translate-x-1 transition-transform">→</span>
          </div>
          <p className="text-cream-muted text-sm">
            Paste a Google Doc link and the tool will clean up formatting, generate a featured
            image, and create a WordPress draft for you to review.
          </p>
        </Link>
      </div>

      <div className="mt-12 p-5 bg-surface-elevated border border-border rounded-xl">
        <h3 className="font-medium mb-2">Before you start</h3>
        <ul className="text-sm text-cream-muted space-y-1 list-disc list-inside">
          <li>Make sure your Google Doc is shared as &quot;Anyone with the link can view.&quot;</li>
          <li>Drafts always land in WordPress as drafts — nothing publishes automatically.</li>
          <li>You can re-run image generation if the first one isn&apos;t a fit.</li>
        </ul>
      </div>
    </div>
  );
}
