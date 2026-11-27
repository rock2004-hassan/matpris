"use client";

import { useState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { log } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

const MESSAGES_KEY = "matpris-contact-messages";

export default function ContactPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "limit">("idle");
  const dir = lang === "ar" ? "rtl" : "ltr";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rl = checkRateLimit("contact-form", 5, 300_000);
    if (!rl.allowed) {
      setStatus("limit");
      return;
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("err");
      return;
    }
    const entry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      at: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(MESSAGES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(list.slice(0, 50)));
    } catch {}
    log("info", "Contact message received", { email: email.slice(0, 3) + "***" });

    // Open mailto as secondary channel (emails – point 13)
    const subject = encodeURIComponent(`MatPris contact – ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} <${email}>`);
    window.location.href = `mailto:admin@matpris.example?subject=${subject}&body=${body}`;

    setStatus("ok");
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">{t(lang, "contactTitle")}</h1>
          <div className="flex gap-2 items-center text-sm">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="border rounded-lg px-2 py-1"
            >
              <option value="ar">العربية</option>
              <option value="sv">Svenska</option>
            </select>
            <Link href="/" className="text-blue-600 hover:underline">
              {t(lang, "home")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border p-6 space-y-4"
        >
          <p className="text-sm text-slate-600">{t(lang, "contactHint")}</p>

          <div>
            <label className="block text-sm font-medium mb-1">{t(lang, "contactName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t(lang, "email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t(lang, "contactMessage")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full border rounded-xl px-3 py-2.5"
              required
            />
          </div>

          {status === "ok" && (
            <div className="bg-emerald-50 text-emerald-800 text-sm rounded-lg px-3 py-2">
              {t(lang, "contactSuccess")}
            </div>
          )}
          {status === "err" && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">
              {t(lang, "contactError")}
            </div>
          )}
          {status === "limit" && (
            <div className="bg-amber-50 text-amber-800 text-sm rounded-lg px-3 py-2">
              {t(lang, "rateLimited")}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700"
          >
            {t(lang, "contactSend")}
          </button>
        </form>
      </main>
    </div>
  );
}
