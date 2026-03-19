import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { setSessionCookie } from "./set_session_cookie.ts";

function mockRes(): {
  setHeader(name: string, value: string | string[]): void;
  headers: Record<string, string | string[]>;
} {
  const headers: Record<string, string | string[]> = {};
  return {
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
    },
    get headers() {
      return headers;
    },
  };
}

describe("setSessionCookie", () => {
  it("sets Set-Cookie header with token and required flags", () => {
    const res = mockRes();
    setSessionCookie(res, "abc123", false);
    const value = res.headers["Set-Cookie"];
    ok(typeof value === "string");
    ok(value.includes("ghostpaw_session=abc123"));
    ok(value.includes("HttpOnly"));
    ok(value.includes("SameSite=Strict"));
    ok(value.includes("Path=/"));
    ok(value.includes("Max-Age=2592000"));
  });

  it("adds Secure flag when secure is true", () => {
    const res = mockRes();
    setSessionCookie(res, "token", true);
    const value = res.headers["Set-Cookie"];
    ok(typeof value === "string");
    ok(value.includes("Secure"));
  });

  it("omits Secure flag when secure is false", () => {
    const res = mockRes();
    setSessionCookie(res, "token", false);
    const value = res.headers["Set-Cookie"];
    ok(typeof value === "string");
    strictEqual(value.includes("Secure"), false);
  });
});
