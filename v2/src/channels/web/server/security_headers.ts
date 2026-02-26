import type { ServerResponse } from "node:http";

export function applySecurityHeaders(res: ServerResponse, nonce: string): void {
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`,
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}
