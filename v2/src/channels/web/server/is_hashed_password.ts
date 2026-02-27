import { HASH_HEX_LEN, SALT_HEX_LEN } from "./password_constants.ts";

export function isHashedPassword(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  if (salt.length !== SALT_HEX_LEN || hash.length !== HASH_HEX_LEN) return false;
  const hex = /^[0-9a-f]+$/;
  return hex.test(salt) && hex.test(hash);
}
