/**
 * Simple client-side admin auth for MatPris.
 * Password is compared against NEXT_PUBLIC_ADMIN_PASSWORD or default "matpris-admin".
 * Session stored in localStorage (demo). For production, use Supabase Auth / NextAuth.
 */

const SESSION_KEY = "matpris-admin-session";
const DEFAULT_PASSWORD = "matpris-admin";

export type Session = {
  role: "admin";
  email: string;
  loggedInAt: string;
};

export function getAdminPassword(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  }
  return DEFAULT_PASSWORD;
}

export function login(email: string, password: string): { ok: true; session: Session } | { ok: false; error: string } {
  const expected = getAdminPassword();
  if (!email.trim() || !password) {
    return { ok: false, error: "missing" };
  }
  if (password !== expected) {
    return { ok: false, error: "invalid" };
  }
  const session: Session = {
    role: "admin",
    email: email.trim().toLowerCase(),
    loggedInAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return { ok: true, session };
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s?.role === "admin" && s.email) return s;
  } catch {}
  return null;
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}
