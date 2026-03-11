"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { SITE } from "@/lib/constants";
import Button from "@/components/ui/Button";

const NAV_KEYS = [
  { key: "projects", href: "/#projects" },
  { key: "about", href: "/#about" },
  { key: "contact", href: "/#contact" },
] as const;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function switchLocale() {
    const next = locale === "en" ? "fr" : "en";
    router.replace(pathname, { locale: next });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-lg text-cream">
          {SITE.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="text-sm font-medium text-cream-muted transition-colors hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          ))}
          <button
            onClick={switchLocale}
            className="border border-border px-2.5 py-1 font-mono text-xs font-semibold text-cream-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={locale === "en" ? "Passer au français" : "Switch to English"}
          >
            {locale === "en" ? "FR" : "EN"}
          </button>
          <Button href="/#contact">{t("getInTouch")}</Button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={switchLocale}
            className="border border-border px-2.5 py-1 font-mono text-xs font-semibold text-cream-muted transition-colors hover:border-accent hover:text-accent"
            aria-label={locale === "en" ? "Passer au français" : "Switch to English"}
          >
            {locale === "en" ? "FR" : "EN"}
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center text-cream-muted hover:text-cream"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <nav className="border-t border-border bg-white px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_KEYS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-cream-muted transition-colors hover:text-foreground"
              >
                {t(link.key)}
              </Link>
            ))}
            <Button href="/#contact" onClick={() => setMenuOpen(false)}>
              {t("getInTouch")}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
