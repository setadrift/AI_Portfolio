import Button from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="px-6 pb-20 pt-32 md:pb-28 md:pt-40 bg-warm-50">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
          Your business runs on your time.
          <br className="hidden md:block" /> I&apos;ll help you get more of it back.
        </h1>
        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-slate-600">
          I build AI systems that handle the work your team shouldn&apos;t be
          doing manually — from automating repetitive processes to turning
          messy data into clear decisions. No jargon, no science projects.
          Just solutions that save real hours every week.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button href="#contact">Let&apos;s Talk</Button>
          <Button href="#projects" variant="secondary">
            See My Work
          </Button>
        </div>
      </div>
    </section>
  );
}
