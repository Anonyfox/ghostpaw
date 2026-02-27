import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HASH_HEX_LEN,
  KEYLEN,
  SALT_HEX_LEN,
  SALT_LEN,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
} from "./password_constants.ts";

describe("password_constants", () => {
  it("has consistent salt hex length (2× byte length)", () => {
    strictEqual(SALT_HEX_LEN, SALT_LEN * 2);
  });

  it("has consistent hash hex length (2× key length)", () => {
    strictEqual(HASH_HEX_LEN, KEYLEN * 2);
  });

  it("scrypt parameters are reasonable", () => {
    ok(SCRYPT_N >= 16384);
    ok(SCRYPT_R >= 8);
    ok(SCRYPT_P >= 1);
  });
});
