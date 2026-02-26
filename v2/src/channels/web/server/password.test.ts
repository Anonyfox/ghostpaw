import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, isHashedPassword, verifyPassword } from "./password.ts";

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

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const stored = await hashPassword("correct");
    strictEqual(await verifyPassword("correct", stored), true);
  });

  it("returns false for wrong password", async () => {
    const stored = await hashPassword("correct");
    strictEqual(await verifyPassword("wrong", stored), false);
  });

  it("returns false for malformed stored value (no colon)", async () => {
    strictEqual(await verifyPassword("any", "nosaltnohash"), false);
  });

  it("returns false for empty stored string", async () => {
    strictEqual(await verifyPassword("any", ""), false);
  });

  it("returns false for truncated hash", async () => {
    const stored = await hashPassword("test");
    const truncated = stored.slice(0, 100);
    strictEqual(await verifyPassword("test", truncated), false);
  });
});

describe("isHashedPassword", () => {
  it("returns true for a hashed value", async () => {
    const hashed = await hashPassword("secret");
    strictEqual(isHashedPassword(hashed), true);
  });

  it("returns false for plain text", () => {
    strictEqual(isHashedPassword("plaintext"), false);
    strictEqual(isHashedPassword("my-password"), false);
  });

  it("returns false for malformed value (wrong lengths)", () => {
    strictEqual(isHashedPassword("a:b"), false);
    strictEqual(isHashedPassword(`${"a".repeat(64)}:b`), false);
    strictEqual(isHashedPassword(`a:${"b".repeat(128)}`), false);
  });

  it("returns true for valid salt:hash shape (64 hex + 128 hex)", () => {
    const valid = `${"a".repeat(64)}:${"b".repeat(128)}`;
    strictEqual(isHashedPassword(valid), true);
  });

  it("returns false when salt or hash contain non-hex chars", () => {
    const invalidSalt = `${"g".repeat(64)}:${"b".repeat(128)}`;
    const invalidHash = `${"a".repeat(64)}:${"z".repeat(128)}`;
    strictEqual(isHashedPassword(invalidSalt), false);
    strictEqual(isHashedPassword(invalidHash), false);
  });
});
