"use client";

import { useState, type FormEvent } from "react";
import SectionWrapper from "@/components/ui/SectionWrapper";
import Button from "@/components/ui/Button";

type Status = "idle" | "loading" | "success" | "error";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  return (
    <SectionWrapper id="contact" alternate>
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Let&apos;s Figure It Out Together
          </h2>
          <p className="mb-6 leading-relaxed text-slate-600">
            Tell me what&apos;s eating up your team&apos;s time or where things
            keep falling through the cracks. I&apos;ll take a look and let you
            know if there&apos;s a practical way to fix it with AI — and be
            honest if there isn&apos;t.
          </p>
          <p className="text-sm text-slate-600">
            No sales pitch. Just a straightforward conversation about
            what&apos;s possible.
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-warm-200 bg-white p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold text-slate-900">
              Message sent!
            </h3>
            <p className="mb-6 text-slate-600">
              Thanks for reaching out. I&apos;ll get back to you soon.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            {status === "error" && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Sending..." : "Send Message"}
            </Button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
}
