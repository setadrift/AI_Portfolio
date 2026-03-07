import Link from "next/link";
import { SITE } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-2xl text-cream md:text-3xl">
            Ready to save your team real time?
          </h2>
          <p className="mb-8 text-cream-muted">
            Let&apos;s have a straightforward conversation about what AI can do
            for your business.
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center bg-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wide text-background transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background"
          >
            Get in Touch
          </Link>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-border/60 pt-10 sm:flex-row sm:justify-between">
          <p className="text-sm text-cream-dim">
            &copy; {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
          </p>
          <div className="flex items-center gap-6">
            <a
              href="mailto:duncan@duncananderson.ca"
              className="text-sm text-cream-dim transition-colors hover:text-cream"
            >
              duncan@duncananderson.ca
            </a>
            <a
              href="https://www.linkedin.com/in/duncan-kg-anderson/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream-dim transition-colors hover:text-cream"
              aria-label="LinkedIn"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
