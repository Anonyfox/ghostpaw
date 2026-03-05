import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { uninstallService } from "./uninstall_service.ts";

describe("uninstallService", () => {
  it("exports a function", () => {
    strictEqual(typeof uninstallService, "function");
  });

  it("accepts a workspace argument", () => {
    ok(uninstallService.length >= 1);
  });
});
