import SectionWrapper from "@/components/ui/SectionWrapper";

export default function About() {
  return (
    <SectionWrapper id="about">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        {/* Photo placeholder */}
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-warm-200 text-slate-600">
          <span className="text-sm">Photo coming soon</span>
        </div>

        <div>
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            About Me
          </h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              I&apos;m Duncan — a data scientist and AI engineer who helps
              businesses stop wasting time on work that machines should be doing.
            </p>
            <p>
              I spent years building AI systems at a major travel company —
              automating dispute resolution, surfacing real-time deals, and
              turning raw data into decisions that saved real money. I also
              built and run a sports analytics platform used by hundreds of
              subscribers.
            </p>
            <p>
              Now I bring that same approach to small and medium businesses.
              I look at how your operation actually runs, find the bottlenecks,
              and build solutions your team will use on day one. No pilot
              programs that go nowhere — just tools that work.
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
