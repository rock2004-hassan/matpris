"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, getSession } from "@/lib/auth";
import { log } from "@/lib/logger";
import { t, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/admin");
  }, [router]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = login(email, password);
    if (!result.ok) {
      setError(
        result.error === "invalid"
          ? t(lang, "loginInvalid")
          : t(lang, "loginMissing")
      );
      log("warn", "Failed login attempt", { email: email.slice(0, 3) + "***" });
      setLoading(false);
      return;
    }
    log("info", "Admin logged in", { email: result.session.email });
    router.replace("/admin");
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">{t(lang, "loginTitle")}</h1>
          <div className="flex gap-2 items-center">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="text-sm border rounded-lg px-2 py-1"
            >
              <option value="ar">العربية</option>
              <option value="sv">Svenska</option>
            </select>
            <Link href="/" className="text-blue-600 text-sm hover:underline">
              {t(lang, "home")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full max-w-md space-y-4"
        >
          <p className="text-sm text-slate-600">{t(lang, "loginHint")}</p>

          <div>
            <label className="block text-sm font-medium mb-1">{t(lang, "email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t(lang, "password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "…" : t(lang, "loginBtn")}
          </button>

          <p className="text-xs text-slate-400 text-center">
            {t(lang, "loginDemoNote")}
          </p>
        </form>
      </main>
    </div>
  );
}
