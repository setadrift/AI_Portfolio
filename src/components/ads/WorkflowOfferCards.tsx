import Button from "@/components/ui/Button";
import { WORKFLOW_OFFER_PATHS } from "@/lib/ai-workflow-offers";

type WorkflowOfferCardsProps = {
  compact?: boolean;
};

export default function WorkflowOfferCards({
  compact = false,
}: WorkflowOfferCardsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {WORKFLOW_OFFER_PATHS.map((offer) => {
        const primaryLink = offer.links[0]
          ? `/ai-workflow-audit/${offer.links[0]}`
          : "/ai-workflow-audit#admin-queue";

        return (
          <article key={offer.id} className="border border-border bg-white p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
              {offer.eyebrow}
            </p>
            <h3 className="mt-4 font-display text-2xl leading-tight text-cream">
              {offer.title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-cream-muted">
              {offer.body}
            </p>
            {!compact && (
              <>
                <div className="mt-5 border-l-2 border-accent pl-4">
                  <p className="text-sm leading-6 text-cream-muted">
                    {offer.outcome}
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {offer.bestFor.map((item) => (
                    <div key={item} className="flex gap-3">
                      <div className="mt-2 h-2 w-2 shrink-0 bg-accent" />
                      <p className="text-sm leading-6 text-cream-muted">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-6">
              <Button href={primaryLink} variant="secondary">
                See workflow
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
