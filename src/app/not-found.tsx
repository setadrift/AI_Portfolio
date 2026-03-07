import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent">
        404
      </p>
      <h1 className="mb-4 font-display text-4xl tracking-tight text-cream">
        Page not found
      </h1>
      <p className="mb-8 max-w-md text-lg text-cream-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button href="/">Back to Home</Button>
    </section>
  );
}
