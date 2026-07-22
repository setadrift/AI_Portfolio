"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { BOOKING_URL, SITE } from "@/lib/constants";
import BookingConversionLink from "@/components/ads/BookingConversionLink";

const NAV_KEYS = [
  { key: "services", href: "/#services" },
  { key: "work", href: "/#projects" },
  { key: "about", href: "/#about" },
] as const;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const bookingLabel = locale === "fr" ? "Commencer une conversation" : "Start a conversation";

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
    <header className="editorial-header">
      <div className="editorial-header-inner">
        <Link href="/" className="editorial-brand">
          <span>{SITE.name}</span><small>{locale === "fr" ? "Systèmes indépendants" : "Independent systems"}</small>
        </Link>

        <nav className="editorial-nav hidden md:flex">
          {NAV_KEYS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="editorial-nav-link"
            >
              {t(link.key)}
            </Link>
          ))}
          <button
            onClick={switchLocale}
            className="editorial-locale"
            aria-label={locale === "en" ? "Passer au français" : "Switch to English"}
          >
            {locale === "en" ? "FR" : "EN"}
          </button>
          {isHome ? (
            <BookingConversionLink
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-header-cta"
            >
              {bookingLabel}
            </BookingConversionLink>
          ) : (
            <Link className="editorial-header-cta" href="/ai-workflow-audit">{t("getInTouch")}</Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={switchLocale}
            className="editorial-locale"
            aria-label={locale === "en" ? "Passer au français" : "Switch to English"}
          >
            {locale === "en" ? "FR" : "EN"}
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center text-black hover:text-[#ef503a]"
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
        <nav className="border-t border-black bg-[#f4f0e8] px-6 pb-6 pt-4 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-4">
            {NAV_KEYS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 text-lg font-medium text-black transition-colors hover:text-[#ef503a]"
              >
                {t(link.key)}
              </Link>
            ))}
            {isHome ? (
              <BookingConversionLink
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="editorial-header-cta mt-2 min-h-12 justify-center"
              >
                {bookingLabel}
              </BookingConversionLink>
            ) : (
              <Link className="editorial-header-cta mt-2 min-h-12 justify-center" href="/ai-workflow-audit" onClick={() => setMenuOpen(false)}>
                {t("getInTouch")}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
