import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 2_592_000_000;

export function createSessionToken(secret: string, ttlMs?: number): string {
  const nonce = randomBytes(16).toString("hex");
  const expiresMs = Date.now() + (ttlMs ?? DEFAULT_TTL_MS);
  const payload = `${nonce}:${expiresMs}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): boolean {
  const dot = token.indexOf(".");
  if (dot === -1) return false;

  const encoded = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  if (!encoded || !providedSig) return false;

  const expectedBuf = Buffer.from(
    createHmac("sha256", secret).update(encoded).digest("hex"),
    "hex",
  );
  const providedBuf = Buffer.from(providedSig, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, providedBuf)) return false;

  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString();
  } catch {
    return false;
  }

  const colon = payload.indexOf(":");
  if (colon === -1) return false;

  const expiresStr = payload.slice(colon + 1);
  const expiresMs = Number(expiresStr);
  if (!Number.isFinite(expiresMs)) return false;

  return Date.now() < expiresMs;
}
