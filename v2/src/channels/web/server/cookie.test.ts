import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { clearSessionCookie, parseCookies, setSessionCookie } from "./cookie.ts";

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

describe("parseCookies", () => {
  it("returns empty object for undefined header", () => {
    deepStrictEqual(parseCookies(undefined), {});
  });

  it("returns empty object for empty header", () => {
    deepStrictEqual(parseCookies(""), {});
  });

  it("parses single cookie", () => {
    deepStrictEqual(parseCookies("foo=bar"), { foo: "bar" });
  });

  it("parses multiple cookies", () => {
    deepStrictEqual(parseCookies("foo=bar; baz=qux"), {
      foo: "bar",
      baz: "qux",
    });
  });

  it("handles value with = in it (splits only on first =)", () => {
    deepStrictEqual(parseCookies("token=a=b=c"), { token: "a=b=c" });
  });

  it("trims whitespace around keys and values", () => {
    deepStrictEqual(parseCookies("  foo  =  bar  ;  baz  =  qux  "), {
      foo: "bar",
      baz: "qux",
    });
  });

  it("handles empty value", () => {
    deepStrictEqual(parseCookies("foo="), { foo: "" });
  });
});

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
