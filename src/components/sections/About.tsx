import Image from "next/image";
import SectionWrapper from "@/components/ui/SectionWrapper";

export default function About() {
  return (
    <SectionWrapper id="about">
      <div className="grid gap-16 md:grid-cols-5 md:items-center">
        <div className="flex justify-center md:col-span-2">
          <div className="relative">
            <Image
              src="/duncan.jpeg"
              alt="Duncan Anderson — data scientist and AI engineer"
              width={400}
              height={400}
              className="h-72 w-72 object-cover transition-all duration-500 hover:scale-[1.03] md:h-80 md:w-80"
              priority
            />
            <div className="absolute -inset-3 -z-10 border border-accent/20" />
          </div>
        </div>

        <div className="md:col-span-3">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
            About
          </p>
          <h2 className="mb-6 font-display text-3xl text-cream md:text-4xl">
            About Me
          </h2>
          <div className="space-y-5 text-cream-muted leading-relaxed">
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
