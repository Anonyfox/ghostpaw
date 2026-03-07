import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { serviceLogs } from "./service_logs.ts";

describe("serviceLogs", () => {
  it("exports a function", () => {
    strictEqual(typeof serviceLogs, "function");
  });

  it("accepts a workspace argument", () => {
    strictEqual(serviceLogs.length, 1);
  });
});
