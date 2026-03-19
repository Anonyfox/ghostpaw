import { createHmac, randomBytes } from "node:crypto";

const DEFAULT_TTL_MS = 2_592_000_000;

export function createSessionToken(secret: string, ttlMs?: number): string {
  const nonce = randomBytes(16).toString("hex");
  const expiresMs = Date.now() + (ttlMs ?? DEFAULT_TTL_MS);
  const payload = `${nonce}:${expiresMs}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}
