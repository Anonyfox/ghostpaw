import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { clearSessionCookie } from "./clear_session_cookie.ts";

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

describe("clearSessionCookie", () => {
  it("sets Set-Cookie with Max-Age=0 and empty value", () => {
    const res = mockRes();
    clearSessionCookie(res, false);
    const value = res.headers["Set-Cookie"];
    ok(typeof value === "string");
    ok(value.includes("ghostpaw_session="));
    ok(value.includes("Max-Age=0"));
    ok(value.includes("HttpOnly"));
    ok(value.includes("SameSite=Strict"));
    ok(value.includes("Path=/"));
  });

  it("adds Secure flag when secure is true", () => {
    const res = mockRes();
    clearSessionCookie(res, true);
    const value = res.headers["Set-Cookie"];
    ok(typeof value === "string");
    ok(value.includes("Secure"));
  });
});
