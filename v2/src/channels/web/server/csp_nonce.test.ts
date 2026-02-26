import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateNonce } from "./csp_nonce.ts";

describe("generateNonce", () => {
  beforeEach(() => {});

  afterEach(() => {});

  it("generates a valid base64 string", () => {
    const nonce = generateNonce();
    const decoded = Buffer.from(nonce, "base64");
    strictEqual(decoded.length, 16);
  });

  it("produces unique value on every call", () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nonces.add(generateNonce());
    }
    strictEqual(nonces.size, 100);
  });

  it("produces valid base64 encoding", () => {
    const nonce = generateNonce();
    strictEqual(/^[A-Za-z0-9+/]+=*$/.test(nonce), true);
  });

  it("produces correct length (~24 chars for 16 bytes base64)", () => {
    const nonce = generateNonce();
    strictEqual(nonce.length, 24);
  });

  it("output is from CSPRNG (all values differ)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const n = generateNonce();
      strictEqual(seen.has(n), false);
      seen.add(n);
    }
  });
});
