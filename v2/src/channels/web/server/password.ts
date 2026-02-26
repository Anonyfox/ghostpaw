import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_LEN = 32;
const SALT_HEX_LEN = 64;
const HASH_HEX_LEN = 128;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function isHashedPassword(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (salt.length !== SALT_HEX_LEN || hash.length !== HASH_HEX_LEN) return false;
  const hex = /^[0-9a-f]+$/;
  return hex.test(salt) && hex.test(hash);
}

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
  const derived = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
