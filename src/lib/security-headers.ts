/**
 * HTTP security headers applied to every server response.
 *
 * frame-ancestors allows the Lovable editor/preview to embed the app; every
 * other origin is refused. A hard `X-Frame-Options: DENY` would also block the
 * Lovable preview iframe, so CSP is used as the (more precise) framing control.
 */
const FRAME_ANCESTORS = [
  "'self'",
  "https://*.lovable.app",
  "https://*.lovable.dev",
  "https://lovable.dev",
  "https://*.lovableproject.com",
];

function buildCsp(): string {
  const isDev = process.env["NODE_ENV"] !== "production";

  const connect = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.lovable.dev",
    "https://*.lovable.app",
    "https://api.bazik.io",
    ...(isDev ? ["ws:", "http://localhost:*"] : []),
  ];

  return [
    "default-src 'self'",
    // TanStack Start ships inline hydration scripts.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${connect.join(" ")}`,
    // MonCash / Bazik checkout pages.
    "frame-src 'self' https://*.bazik.io https://*.digicelgroup.com",
    "form-action 'self' https://*.bazik.io",
    `frame-ancestors ${FRAME_ANCESTORS.join(" ")}`,
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function applySecurityHeaders(headers: Headers): void {
  if (!headers.has("Content-Security-Policy")) {
    headers.set("Content-Security-Policy", buildCsp());
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (process.env["NODE_ENV"] === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export const SECURITY_HEADERS_RECORD: Record<string, string> = (() => {
  const headers = new Headers();
  applySecurityHeaders(headers);
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
})();
