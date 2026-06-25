import WorkflowOfferCards from "@/components/ads/WorkflowOfferCards";
import SectionWrapper from "@/components/ui/SectionWrapper";

export default function WorkflowOffers() {
  return (
    <SectionWrapper id="workflow-examples" alternate>
      <div className="mb-10 max-w-3xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Focused offers
        </p>
        <h2 className="font-display text-4xl leading-tight text-cream">
          Start with the workflow that already costs time, deals, or deadline
          confidence
        </h2>
        <p className="mt-5 leading-7 text-cream-muted">
          I do not sell broad AI transformation. I help you map one admin-heavy
          workflow, decide what should stay human, and build the smallest
          reliable system that moves the work forward.
        </p>
      </div>
      <WorkflowOfferCards compact />
    </SectionWrapper>
  );
}
