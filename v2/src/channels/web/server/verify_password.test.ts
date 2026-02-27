import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword } from "./hash_password.ts";
import { verifyPassword } from "./verify_password.ts";

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
