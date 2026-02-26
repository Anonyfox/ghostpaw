import { deepStrictEqual, strictEqual } from "node:assert/strict";
import type { ServerResponse } from "node:http";
import { describe, it } from "node:test";
import { applySecurityHeaders } from "./security_headers.ts";

function createMockResponse(): ServerResponse & { headers: Map<string, string> } {
  const headers = new Map<string, string>();
  const res = {
    headers,
    setHeader(name: string, value: string | number | readonly string[]): void {
      headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(", ") : String(value));
    },
  } as ServerResponse & { headers: Map<string, string> };
  return res;
}

describe("applySecurityHeaders", () => {
  it("sets all required headers", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "abc123");
    strictEqual(res.headers.size, 6);
  });

  it("sets Content-Security-Policy with nonce interpolated", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "my-nonce-xyz");
    const csp = res.headers.get("content-security-policy");
    strictEqual(
      csp,
      "default-src 'self'; script-src 'nonce-my-nonce-xyz'; style-src 'nonce-my-nonce-xyz' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    );
  });

  it("interpolates different nonce values correctly", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "base64encoded==");
    const csp = res.headers.get("content-security-policy");
    strictEqual(csp?.includes("'nonce-base64encoded=='"), true);
    strictEqual(csp?.includes("script-src 'nonce-base64encoded=='"), true);
    strictEqual(csp?.includes("style-src 'nonce-base64encoded=='"), true);
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "x");
    strictEqual(res.headers.get("x-content-type-options"), "nosniff");
  });

  it("sets X-Frame-Options to DENY", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "x");
    strictEqual(res.headers.get("x-frame-options"), "DENY");
  });

  it("sets X-XSS-Protection to 0", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "x");
    strictEqual(res.headers.get("x-xss-protection"), "0");
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "x");
    strictEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy with camera, microphone, geolocation disabled", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "x");
    strictEqual(res.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  });

  it("records exactly the expected header set", () => {
    const res = createMockResponse();
    applySecurityHeaders(res, "test-nonce");
    const expected = new Map<string, string>([
      [
        "content-security-policy",
        "default-src 'self'; script-src 'nonce-test-nonce'; style-src 'nonce-test-nonce' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
      ],
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
      ["x-xss-protection", "0"],
      ["referrer-policy", "strict-origin-when-cross-origin"],
      ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
    ]);
    deepStrictEqual(Object.fromEntries(res.headers), Object.fromEntries(expected));
  });
});
