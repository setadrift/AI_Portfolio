import { SITE } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-warm-200/60 bg-warm-50 px-6 py-10">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-sm text-slate-600">
          &copy; {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
        </p>
      </div>
    </footer>
  );
}
