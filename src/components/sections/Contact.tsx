"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import BookingConversionLink from "@/components/ads/BookingConversionLink";
import SectionWrapper from "@/components/ui/SectionWrapper";
import Button from "@/components/ui/Button";
import { BOOKING_URL } from "@/lib/constants";

type Status = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    businessName: "",
    message: "",
    companyTrap: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const t = useTranslations("contact");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("genericError"));
      }

      setStatus("success");
      window.gtag?.("event", "workflow_inquiry_submit", {
        event_category: "lead",
        event_label: "homepage_contact",
      });
      setForm({ name: "", email: "", businessName: "", message: "", companyTrap: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : t("genericError"),
      );
    }
  }

  const inputStyles =
    "w-full border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-cream-dim focus:border-accent focus:ring-1 focus:ring-accent/30";

  return (
    <SectionWrapper id="contact" alternate>
      <div className="grid gap-16 md:grid-cols-2">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent">
            {t("label")}
          </p>
          <h2 className="mb-6 font-display text-3xl text-cream md:text-4xl">
            {t("heading")}
          </h2>
          <p className="mb-6 leading-relaxed text-cream-muted">
            {t("description")}
          </p>
          <p className="text-sm leading-6 text-cream-dim">
            {t("noPitch")}
          </p>
          <BookingConversionLink
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex border border-accent px-5 py-3 text-sm font-medium uppercase tracking-wide text-accent transition-colors hover:bg-[#EFF6FF]"
          >
            {t("bookCall")}
          </BookingConversionLink>
          <p className="mt-5 text-sm leading-6 text-cream-muted">
            {t("directEmail")} <a className="font-semibold text-accent underline underline-offset-4" href="mailto:duncan@duncananderson.ca">duncan@duncananderson.ca</a>
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center border border-border bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <h3 className="mb-3 font-display text-xl text-cream">
              {t("successHeading")}
            </h3>
            <p className="mb-6 text-cream-muted">
              {t("successMessage")}
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              {t("sendAnother")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot field */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="companyTrap">Company website</label>
              <input
                id="companyTrap"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.companyTrap}
                onChange={(e) => setForm({ ...form, companyTrap: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="businessName" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-cream-dim">{t("companyLabel")}</label>
              <input id="businessName" type="text" autoComplete="organization" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={inputStyles} />
            </div>
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-cream-dim"
              >
                {t("nameLabel")}
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputStyles}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-cream-dim"
              >
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputStyles}
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-cream-dim"
              >
                {t("messageLabel")}
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={inputStyles}
              />
            </div>
            {status === "error" && (
              <p className="text-sm text-red-700" role="alert">{errorMsg}</p>
            )}
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? t("sending") : t("sendMessage")}
            </Button>
            <p className="text-xs leading-5 text-cream-dim">{t("privacyNote")}</p>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
