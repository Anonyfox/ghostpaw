import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { serviceStatus } from "./service_status.ts";

describe("serviceStatus", () => {
  it("exports a function", () => {
    strictEqual(typeof serviceStatus, "function");
  });

  it("returns a valid status object", () => {
    const status = serviceStatus("/tmp/nonexistent-ghostpaw-test");
    ok(typeof status.installed === "boolean");
    ok(typeof status.running === "boolean");
    ok(["systemd", "launchd", "cron"].includes(status.initSystem));
  });

  it("reports not installed for a nonexistent workspace", () => {
    const status = serviceStatus("/tmp/nonexistent-ghostpaw-test-" + Date.now());
    strictEqual(status.installed, false);
    strictEqual(status.running, false);
  });
});
