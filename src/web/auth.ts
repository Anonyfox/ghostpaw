import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK = 8;
const SCRYPT_PARALLEL = 1;
const COOKIE_NAME = "ghostpaw_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// ── Password hashing ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK,
    parallelization: SCRYPT_PARALLEL,
  });
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const key = scryptSync(password, salt, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK,
    parallelization: SCRYPT_PARALLEL,
  });
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(key, expected);
}

// ── Session tokens ──────────────────────────────────────────────────────────

function deriveSigningKey(passwordHash: string): Buffer {
  return Buffer.from(createHmac("sha256", "ghostpaw-web-session").update(passwordHash).digest());
}

function sign(payload: string, signingKey: Buffer): string {
  const mac = createHmac("sha256", signingKey).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verifySignature(token: string, signingKey: Buffer): string | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 0) return null;
  const payload = token.slice(0, dotIdx);
  const expected = sign(payload, signingKey);
  if (token.length !== expected.length) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (!timingSafeEqual(a, b)) return null;
  return payload;
}

export function createSessionToken(passwordHash: string): string {
  const signingKey = deriveSigningKey(passwordHash);
  const nonce = randomBytes(16).toString("base64url");
  const expires = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${nonce}:${expires}`;
  return sign(payload, signingKey);
}

export function validateSessionToken(token: string, passwordHash: string): boolean {
  const signingKey = deriveSigningKey(passwordHash);
  const payload = verifySignature(token, signingKey);
  if (!payload) return false;
  const parts = payload.split(":");
  if (parts.length !== 2) return false;
  const expires = Number.parseInt(parts[1]!, 10);
  if (Number.isNaN(expires)) return false;
  return Math.floor(Date.now() / 1000) < expires;
}

// ── Cookie helpers ──────────────────────────────────────────────────────────

export function setSessionCookie(res: ServerResponse, token: string, isLocalhost: boolean): void {
  const flags = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (!isLocalhost) flags.push("Secure");
  res.setHeader("Set-Cookie", flags.join("; "));
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`);
}

export function getSessionCookie(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return null;
}

export function getBearerToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ── Rate limiting ───────────────────────────────────────────────────────────

interface RateBucket {
  count: number;
  resetAt: number;
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILURES = 5;
const rateBuckets = new Map<string, RateBucket>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 0, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  return bucket.count < RATE_MAX_FAILURES;
}

export function recordFailure(ip: string): void {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    bucket.count++;
  }
}

export function cleanupRateBuckets(): void {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(ip);
  }
}

// ── CSRF: Origin validation ─────────────────────────────────────────────────

export function validateOrigin(req: IncomingMessage, expectedOrigin: string): boolean {
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser client (curl, etc.)
  return origin === expectedOrigin;
}

// ── Request IP extraction ───────────────────────────────────────────────────

export function getClientIP(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}
