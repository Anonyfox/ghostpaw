import { deepStrictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCookies } from "./parse_cookies.ts";

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
