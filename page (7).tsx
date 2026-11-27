"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { lastUpdated, stores, products } from "@/lib/data";
import { getSession, logout, type Session } from "@/lib/auth";
import { getLogs, clearLogs, log, type LogEntry } from "@/lib/logger";

const LINKS_KEY = "matpris-weekly-links";
const MESSAGES_KEY = "matpris-contact-messages";

type WeeklyLink = {
  id: string;
  storeId: string;
  url: string;
  addedAt: string;
};

type ContactMsg = {
  id: string;
  name: string;
  email: string;
  message: string;
  at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ar");
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [links, setLinks] = useState<WeeklyLink[]>([]);
  const [url, setUrl] = useState("");
  const [storeId, setStoreId] = useState("ica");
  const [msg, setMsg] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inbox, setInbox] = useState<ContactMsg[]>([]);
  const [tab, setTab] = useState<"links" | "logs" | "backup" | "inbox">("links");

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setReady(true);
    try {
      const raw = localStorage.getItem(LINKS_KEY);
      if (raw) setLinks(JSON.parse(raw));
      const m = localStorage.getItem(MESSAGES_KEY);
      if (m) setInbox(JSON.parse(m));
    } catch {}
    setLogs(getLogs());
    log("info", "Admin panel opened");
  }, [router]);

  function saveLinks(next: WeeklyLink[]) {
    setLinks(next);
    localStorage.setItem(LINKS_KEY, JSON.stringify(next));
  }

  function addLink() {
    if (!url.trim()) return;
    const entry: WeeklyLink = {
      id: crypto.randomUUID(),
      storeId,
      url: url.trim(),
      addedAt: new Date().toISOString(),
    };
    saveLinks([entry, ...links]);
    setUrl("");
    setMsg(t(lang, "importSuccess"));
    log("info", "Weekly link added", { storeId });
    setTimeout(() => setMsg(""), 3000);
  }

  function removeLink(id: string) {
    saveLinks(links.filter((l) => l.id !== id));
  }

  function handleLogout() {
    log("info", "Admin logged out");
    logout();
    router.replace("/login");
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      lastUpdated,
      productsCount: products.length,
      stores,
      products,
      weeklyLinks: links,
      contactMessages: inbox,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `matpris-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    log("info", "Backup exported");
    setMsg(t(lang, "backupDone"));
    setTimeout(() => setMsg(""), 3000);
  }

  function refreshLogs() {
    setLogs(getLogs());
  }

  const dir = lang === "ar" ? "rtl" : "ltr";

  if (!ready || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        …
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{t(lang, "adminTitle")}</h1>
            <p className="text-xs text-slate-500">
              {session.email} · {t(lang, "roleAdmin")}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
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
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:underline"
            >
              {t(lang, "logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {msg && (
          <div className="bg-emerald-50 text-emerald-800 text-sm rounded-lg px-3 py-2 border border-emerald-100">
            {msg}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["links", t(lang, "weeklyLinks")],
              ["inbox", t(lang, "inbox")],
              ["logs", t(lang, "logs")],
              ["backup", t(lang, "backup")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                if (id === "logs") refreshLogs();
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                tab === id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-slate-600 text-sm">
          {t(lang, "lastUpdated")}: {lastUpdated} · {products.length}{" "}
          {t(lang, "products")}
        </p>

        {tab === "links" && (
          <>
            <p className="text-slate-600 text-sm">{t(lang, "adminHint")}</p>
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === "ar" ? s.nameAr : s.name}
                    </option>
                  ))}
                </select>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t(lang, "pasteUrl")}
                  className="flex-1 border rounded-lg px-3 py-2"
                  dir="ltr"
                />
                <button
                  onClick={addLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  {t(lang, "addLink")}
                </button>
              </div>
              <p className="text-xs text-slate-400">{t(lang, "extractNote")}</p>
            </div>

            <ul className="space-y-2">
              {links.map((l) => {
                const st = stores.find((s) => s.id === l.storeId);
                return (
                  <li
                    key={l.id}
                    className="bg-white border rounded-xl p-3 flex justify-between gap-2 items-start"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {lang === "ar" ? st?.nameAr : st?.name}
                      </p>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 break-all"
                        dir="ltr"
                      >
                        {l.url}
                      </a>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(l.addedAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeLink(l.id)}
                      className="text-red-600 text-xs shrink-0"
                    >
                      {t(lang, "remove")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {tab === "inbox" && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{t(lang, "inboxHint")}</p>
            {inbox.length === 0 && (
              <p className="text-slate-400 text-sm">{t(lang, "inboxEmpty")}</p>
            )}
            {inbox.map((m) => (
              <div key={m.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-slate-400 text-xs">
                    {new Date(m.at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-blue-600" dir="ltr">
                  {m.email}
                </p>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                  {m.message}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={refreshLogs}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white"
              >
                {t(lang, "refresh")}
              </button>
              <button
                onClick={() => {
                  clearLogs();
                  setLogs([]);
                }}
                className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1.5 bg-white"
              >
                {t(lang, "clearLogs")}
              </button>
            </div>
            {logs.length === 0 && (
              <p className="text-slate-400 text-sm">{t(lang, "logsEmpty")}</p>
            )}
            <ul className="space-y-1 max-h-96 overflow-auto">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className={`text-xs font-mono rounded-lg px-3 py-2 border ${
                    l.level === "error"
                      ? "bg-red-50 border-red-100"
                      : l.level === "warn"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-white border-slate-100"
                  }`}
                >
                  <span className="text-slate-400">
                    {new Date(l.at).toLocaleTimeString()}
                  </span>{" "}
                  <span className="uppercase font-bold">{l.level}</span> —{" "}
                  {l.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "backup" && (
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <p className="text-sm text-slate-600">{t(lang, "backupHint")}</p>
            <button
              onClick={exportBackup}
              className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-700"
            >
              {t(lang, "exportBackup")}
            </button>
            <p className="text-xs text-slate-400">{t(lang, "backupNote")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
