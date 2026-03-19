import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword } from "./hash_password.ts";

describe("hashPassword", () => {
  it("returns a string in salt:hash format", async () => {
    const result = await hashPassword("secret");
    const parts = result.split(":");
    strictEqual(parts.length, 2);
    strictEqual(parts[0].length, 64);
    strictEqual(parts[1].length, 128);
    strictEqual(/^[0-9a-f]+$/.test(parts[0]), true);
    strictEqual(/^[0-9a-f]+$/.test(parts[1]), true);
  });

  it("produces different outputs for same input (different salts)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    strictEqual(a !== b, true);
  });

  it("hash output is correct length (64 + 1 + 128 = 193 chars)", async () => {
    const result = await hashPassword("test");
    strictEqual(result.length, 193);
  });
});
