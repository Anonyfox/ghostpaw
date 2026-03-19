import { scrypt } from "node:crypto";
import { KEYLEN, SCRYPT_N, SCRYPT_P, SCRYPT_R } from "./password_constants.ts";

export function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}
