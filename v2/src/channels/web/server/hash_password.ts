import { randomBytes } from "node:crypto";
import { SALT_LEN } from "./password_constants.ts";
import { scryptAsync } from "./scrypt_async.ts";

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = await scryptAsync(plain, salt);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}
