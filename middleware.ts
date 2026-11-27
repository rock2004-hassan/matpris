import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Basic security headers + simple rate limit by IP for /admin and API routes.
 * Point 07 (HTTPS headers) + 08 (rate limit).
 */
const hits = new Map<string, { n: number; t: number }>();

export function middleware(request: NextRequest) {
  const res = NextResponse.next();

  // Security headers (HTTPS / hardening)
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  // HSTS only meaningful on HTTPS production hosts
  if (request.nextUrl.protocol === "https:") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Simple IP rate limit for sensitive paths
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const key = `${ip}:${path.split("/")[1]}`;
    const now = Date.now();
    const windowMs = 60_000;
    const max = 60;
    let h = hits.get(key);
    if (!h || now - h.t > windowMs) {
      h = { n: 0, t: now };
      hits.set(key, h);
    }
    h.n += 1;
    res.headers.set("X-RateLimit-Limit", String(max));
    res.headers.set("X-RateLimit-Remaining", String(Math.max(0, max - h.n)));
    if (h.n > max) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
