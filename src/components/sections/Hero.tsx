import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="grain relative overflow-hidden px-6 pb-24 pt-36 md:pb-32 md:pt-44">
      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="animate-fade-in-up mb-6 font-mono text-xs uppercase tracking-[0.3em] text-accent">
          AI Consulting &amp; Engineering
        </p>
        <h1 className="animate-fade-in-up delay-1 mb-8 max-w-4xl font-display text-4xl leading-[1.1] tracking-tight text-cream md:text-6xl lg:text-7xl">
          Your business runs on your time.
          <br className="hidden md:block" />
          <span className="text-accent">I&apos;ll help you get more of it back.</span>
        </h1>
        <p className="animate-fade-in-up delay-2 mb-10 max-w-2xl text-lg leading-relaxed text-cream-muted">
          I build AI systems that handle the work your team shouldn&apos;t be
          doing manually — from automating repetitive processes to turning
          messy data into clear decisions. No jargon, no science projects.
          Just solutions that save real hours every week.
        </p>
        <div className="animate-fade-in-up delay-3 flex flex-col gap-4 sm:flex-row">
          <Button href="/#contact">Let&apos;s Talk</Button>
          <Button href="/#projects" variant="secondary">
            See My Work
          </Button>
        </div>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-light to-transparent" />
    </section>
  );
}
