import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { installService } from "./install_service.ts";

describe("installService", () => {
  it("exports a function", () => {
    strictEqual(typeof installService, "function");
  });

  it("accepts a ServiceConfig argument", () => {
    ok(installService.length >= 1);
  });
});
