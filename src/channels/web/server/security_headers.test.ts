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

const EXPECTED_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

describe("applySecurityHeaders", () => {
  it("sets all required headers", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.size, 6);
  });

  it("sets Content-Security-Policy with self and unsafe-inline", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("content-security-policy"), EXPECTED_CSP);
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("x-content-type-options"), "nosniff");
  });

  it("sets X-Frame-Options to DENY", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("x-frame-options"), "DENY");
  });

  it("sets X-XSS-Protection to 0", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("x-xss-protection"), "0");
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  });

  it("sets Permissions-Policy with camera, microphone, geolocation disabled", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    strictEqual(res.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  });

  it("records exactly the expected header set", () => {
    const res = createMockResponse();
    applySecurityHeaders(res);
    const expected = new Map<string, string>([
      ["content-security-policy", EXPECTED_CSP],
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
      ["x-xss-protection", "0"],
      ["referrer-policy", "strict-origin-when-cross-origin"],
      ["permissions-policy", "camera=(), microphone=(), geolocation=()"],
    ]);
    deepStrictEqual(Object.fromEntries(res.headers), Object.fromEntries(expected));
  });
});
