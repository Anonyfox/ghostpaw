import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { ensureReady } from "./ensure_ready.ts";

describe("ensureReady", () => {
  it("exports a function", () => {
    strictEqual(typeof ensureReady, "function");
  });

  it("accepts a DatabaseHandle argument", () => {
    ok(ensureReady.length >= 1);
  });

  it("returns a promise", () => {
    ok(ensureReady.constructor.name === "AsyncFunction");
  });
});
