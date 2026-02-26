import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createSessionToken, verifySessionToken } from "./session_token.ts";

describe("session_token", () => {
  describe("createSessionToken", () => {
    it("returns a string containing a dot", () => {
      const token = createSessionToken("secret");
      strictEqual(token.includes("."), true);
    });

    it("produces different tokens with same secret due to nonce", () => {
      const secret = "my-secret";
      const t1 = createSessionToken(secret);
      const t2 = createSessionToken(secret);
      strictEqual(t1 !== t2, true);
    });

    it("produces different tokens with different secrets", () => {
      const t1 = createSessionToken("secret-a");
      const t2 = createSessionToken("secret-b");
      strictEqual(t1 !== t2, true);
    });
  });

  describe("verifySessionToken", () => {
    it("returns true for a just-created token", () => {
      const secret = "test-secret";
      const token = createSessionToken(secret);
      strictEqual(verifySessionToken(token, secret), true);
    });

    it("returns false when token expires after TTL", async () => {
      const secret = "test-secret";
      const token = createSessionToken(secret, 50);
      await new Promise((r) => setTimeout(r, 60));
      strictEqual(verifySessionToken(token, secret), false);
    });

    it("returns false with wrong secret", () => {
      const token = createSessionToken("correct-secret");
      strictEqual(verifySessionToken(token, "wrong-secret"), false);
    });

    it("returns false for empty string", () => {
      strictEqual(verifySessionToken("", "secret"), false);
    });

    it("returns false for string without dot", () => {
      strictEqual(verifySessionToken("nobase64orsignature", "secret"), false);
    });

    it("returns false for tampered payload", () => {
      const secret = "secret";
      const token = createSessionToken(secret);
      const [encoded, sig] = token.split(".");
      const tampered = `${encoded.slice(0, -1)}X.${sig}`;
      strictEqual(verifySessionToken(tampered, secret), false);
    });

    it("returns false for tampered signature", () => {
      const secret = "secret";
      const token = createSessionToken(secret);
      const [encoded] = token.split(".");
      const tampered = `${encoded}.deadbeef0123456789abcdef0123456789abcdef0123456789abcdef0123456789`;
      strictEqual(verifySessionToken(tampered, secret), false);
    });
  });
});
