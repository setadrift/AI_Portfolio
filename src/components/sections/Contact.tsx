"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import SectionWrapper from "@/components/ui/SectionWrapper";
import Button from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    company: "",
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
      setForm({ name: "", email: "", message: "", company: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : t("genericError"),
      );
    }
  }

  const inputStyles =
    "w-full border border-border bg-surface px-4 py-3 text-sm text-cream outline-none transition-colors placeholder:text-cream-dim focus:border-accent focus:ring-1 focus:ring-accent/30";

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
          <p className="text-sm text-cream-dim">
            {t("noPitch")}
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center border border-border bg-surface-elevated p-10 text-center">
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
              <label htmlFor="company">Company</label>
              <input
                id="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
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
              <p className="text-sm text-red-400">{errorMsg}</p>
            )}
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? t("sending") : t("sendMessage")}
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
