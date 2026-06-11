import { readLatestLeadDigest } from "@/lib/portal/admin/leads";

export const runtime = "nodejs";

export default async function AdminLeadsPage() {
  const digest = await readLatestLeadDigest();

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-cream-muted mb-2">
            Reddit lead monitor
          </p>
          <h1 className="font-display text-4xl">Lead Digest</h1>
        </div>
        {digest && (
          <div className="text-sm text-cream-muted sm:text-right">
            <div>{digest.fileName}</div>
            <div>{digest.generatedAt}</div>
          </div>
        )}
      </div>

      {!digest ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Feeds checked" value={digest.feedsChecked || "0"} />
            <Metric label="Included leads" value={digest.candidatesIncluded || "0"} />
            <Metric label="Rejected posts" value={digest.rejectedCount || "0"} />
          </div>

          {digest.leads.length > 0 ? (
            <div className="space-y-4">
              {digest.leads.map((lead) => (
                <article
                  key={`${lead.url}-${lead.title}`}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm text-cream-muted mb-1">
                        {lead.score} · r/{lead.subreddit} · u/{lead.author}
                      </div>
                      <h2 className="font-display text-2xl">{lead.title}</h2>
                    </div>
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm hover:border-accent hover:text-accent transition-colors"
                    >
                      Open Reddit
                    </a>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-cream-muted">Category</dt>
                      <dd>{lead.category}</dd>
                    </div>
                    <div>
                      <dt className="text-cream-muted">Action</dt>
                      <dd>{lead.recommendedAction}</dd>
                    </div>
                  </dl>

                  {lead.reason && (
                    <p className="mt-4 text-sm leading-6 text-cream-muted">{lead.reason}</p>
                  )}

                  {(lead.suggestedComment || lead.suggestedDm) && (
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <ReplyBox title="Suggested comment" body={lead.suggestedComment} />
                      <ReplyBox title="Suggested DM" body={lead.suggestedDm} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-2xl mb-2">No actionable leads in this run.</h2>
              <p className="text-sm text-cream-muted">
                The stricter filter is working. Try again later when Reddit rate limits clear or
                when new posts land.
              </p>
            </div>
          )}

          {digest.feedErrors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <h2 className="font-medium mb-2">Feed errors</h2>
              <ul className="space-y-1 text-sm">
                {digest.feedErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-display text-2xl mb-2">No digest found.</h2>
      <p className="text-sm text-cream-muted mb-4">
        Run the monitor locally, then refresh this page.
      </p>
      <code className="inline-flex rounded-lg bg-surface-elevated border border-border px-3 py-2 text-sm">
        npm run leads:reddit
      </code>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-sm text-cream-muted">{label}</div>
      <div className="font-display text-3xl mt-1">{value}</div>
    </div>
  );
}

function ReplyBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4">
      <h3 className="font-medium mb-2">{title}</h3>
      {body ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-cream-muted">{body}</p>
      ) : (
        <p className="text-sm text-cream-muted">None suggested.</p>
      )}
    </div>
  );
}
