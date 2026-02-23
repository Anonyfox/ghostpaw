import { randomBytes } from "node:crypto";

const URL_SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

export function generateId(byteLength = 16): string {
  const bytes = randomBytes(byteLength);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += URL_SAFE_ALPHABET[bytes[i]! & 63];
  }
  return out;
}

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && /^[a-zA-Z0-9_-]+$/.test(value);
}
