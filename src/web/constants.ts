import { randomBytes } from "node:crypto";

export const MAX_BODY_BYTES = 1_048_576; // 1 MB
export const BODY_TIMEOUT_MS = 30_000;
export const CLEANUP_INTERVAL_MS = 300_000; // 5 min

export const BOOT_ID = randomBytes(6).toString("hex");

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
};
