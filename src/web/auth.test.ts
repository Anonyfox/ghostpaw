import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { describe, it } from "node:test";
import {
  checkRateLimit,
  cleanupRateBuckets,
  createSessionToken,
  getBearerToken,
  getSessionCookie,
  hashPassword,
  recordFailure,
  validateOrigin,
  validateSessionToken,
  verifyPassword,
} from "./auth.js";

function fakeReq(headers: Record<string, string> = {}, method = "GET"): IncomingMessage {
  return { headers, method } as unknown as IncomingMessage;
}

describe("auth", () => {
  describe("password hashing", () => {
    it("hashes and verifies a password", () => {
      const hash = hashPassword("hunter2");
      assert.ok(hash.includes(":"), "hash contains salt separator");
      assert.ok(verifyPassword("hunter2", hash));
    });

    it("rejects wrong password", () => {
      const hash = hashPassword("correct-horse");
      assert.ok(!verifyPassword("wrong-battery", hash));
    });

    it("produces different hashes for same password (unique salts)", () => {
      const a = hashPassword("same");
      const b = hashPassword("same");
      assert.notEqual(a, b);
    });

    it("rejects malformed stored hash", () => {
      assert.ok(!verifyPassword("anything", "noseparator"));
      assert.ok(!verifyPassword("anything", ""));
    });
  });

  describe("session tokens", () => {
    const hash = hashPassword("testpass");

    it("creates a valid token", () => {
      const token = createSessionToken(hash);
      assert.ok(token.includes("."), "token has signature separator");
      assert.ok(validateSessionToken(token, hash));
    });

    it("rejects token signed with different password hash", () => {
      const token = createSessionToken(hash);
      const otherHash = hashPassword("otherpass");
      assert.ok(!validateSessionToken(token, otherHash));
    });

    it("rejects tampered token", () => {
      const token = createSessionToken(hash);
      const tampered = `x${token.slice(1)}`;
      assert.ok(!validateSessionToken(tampered, hash));
    });

    it("rejects empty or garbage token", () => {
      assert.ok(!validateSessionToken("", hash));
      assert.ok(!validateSessionToken("garbage", hash));
      assert.ok(!validateSessionToken("a.b.c", hash));
    });
  });

  describe("cookie parsing", () => {
    it("extracts session cookie", () => {
      const req = fakeReq({ cookie: "ghostpaw_session=abc123; other=val" });
      assert.equal(getSessionCookie(req), "abc123");
    });

    it("returns null when no cookie header", () => {
      assert.equal(getSessionCookie(fakeReq()), null);
    });

    it("returns null when session cookie missing", () => {
      const req = fakeReq({ cookie: "other=val" });
      assert.equal(getSessionCookie(req), null);
    });
  });

  describe("bearer token parsing", () => {
    it("extracts bearer token", () => {
      const req = fakeReq({ authorization: "Bearer mytoken123" });
      assert.equal(getBearerToken(req), "mytoken123");
    });

    it("returns null for non-Bearer auth", () => {
      assert.equal(getBearerToken(fakeReq({ authorization: "Basic abc" })), null);
    });

    it("returns null when no auth header", () => {
      assert.equal(getBearerToken(fakeReq()), null);
    });
  });

  describe("rate limiting", () => {
    it("allows initial requests", () => {
      cleanupRateBuckets();
      assert.ok(checkRateLimit("10.0.0.1"));
    });

    it("blocks after max failures", () => {
      cleanupRateBuckets();
      const ip = "10.0.0.2";
      for (let i = 0; i < 5; i++) recordFailure(ip);
      assert.ok(!checkRateLimit(ip));
    });

    it("allows requests from different IPs independently", () => {
      cleanupRateBuckets();
      for (let i = 0; i < 5; i++) recordFailure("10.0.0.3");
      assert.ok(checkRateLimit("10.0.0.4"));
    });
  });

  describe("CSRF origin validation", () => {
    it("allows GET requests regardless of origin", () => {
      const req = fakeReq({ origin: "https://evil.com" }, "GET");
      assert.ok(validateOrigin(req, "http://localhost:3000"));
    });

    it("allows POST without origin header (non-browser client)", () => {
      const req = fakeReq({}, "POST");
      assert.ok(validateOrigin(req, "http://localhost:3000"));
    });

    it("allows POST with matching origin", () => {
      const req = fakeReq({ origin: "http://localhost:3000" }, "POST");
      assert.ok(validateOrigin(req, "http://localhost:3000"));
    });

    it("rejects POST with mismatched origin", () => {
      const req = fakeReq({ origin: "https://evil.com" }, "POST");
      assert.ok(!validateOrigin(req, "http://localhost:3000"));
    });
  });
});
