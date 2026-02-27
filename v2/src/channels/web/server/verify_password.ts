import { timingSafeEqual } from "node:crypto";
import { HASH_HEX_LEN, SALT_HEX_LEN } from "./password_constants.ts";
import { scryptAsync } from "./scrypt_async.ts";

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [saltHex, expectedHex] = parts;
  if (saltHex.length !== SALT_HEX_LEN || expectedHex.length !== HASH_HEX_LEN) return false;
  const hex = /^[0-9a-f]+$/;
  if (!hex.test(saltHex) || !hex.test(expectedHex)) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  const derived = await scryptAsync(plain, salt);
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
