/**
 * Simple client + server logging for MatPris (point 09 – logs).
 * Stores recent events in localStorage for the admin panel.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  at: string;
  meta?: Record<string, string>;
};

const LOG_KEY = "matpris-logs";
const MAX_LOGS = 100;

export function log(level: LogLevel, message: string, meta?: Record<string, string>): void {
  const entry: LogEntry = {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
    level,
    message,
    at: new Date().toISOString(),
    meta,
  };
  if (typeof console !== "undefined") {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[MatPris] ${message}`, meta ?? "");
  }
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const list: LogEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, MAX_LOGS)));
  } catch {}
}

export function getLogs(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLogs(): void {
  if (typeof window !== "undefined") localStorage.removeItem(LOG_KEY);
}
