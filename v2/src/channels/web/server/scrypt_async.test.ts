import { ok, strictEqual } from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { KEYLEN } from "./password_constants.ts";
import { scryptAsync } from "./scrypt_async.ts";

describe("scryptAsync", () => {
  it("returns a buffer of the configured key length", async () => {
    const salt = randomBytes(32);
    const result = await scryptAsync("password", salt);
    ok(Buffer.isBuffer(result));
    strictEqual(result.length, KEYLEN);
  });

  it("produces deterministic output for same input", async () => {
    const salt = randomBytes(32);
    const a = await scryptAsync("test", salt);
    const b = await scryptAsync("test", salt);
    strictEqual(a.equals(b), true);
  });

  it("produces different output for different passwords", async () => {
    const salt = randomBytes(32);
    const a = await scryptAsync("alpha", salt);
    const b = await scryptAsync("beta", salt);
    strictEqual(a.equals(b), false);
  });
});
