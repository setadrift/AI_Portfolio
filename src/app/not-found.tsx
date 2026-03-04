import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-widest text-amber-600">
        404
      </p>
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mb-8 max-w-md text-lg text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button href="/">Back to Home</Button>
    </section>
  );
}
