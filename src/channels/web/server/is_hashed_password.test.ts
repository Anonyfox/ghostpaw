import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword } from "./hash_password.ts";
import { isHashedPassword } from "./is_hashed_password.ts";

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
