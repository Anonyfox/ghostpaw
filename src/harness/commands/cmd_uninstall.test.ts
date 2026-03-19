import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { ServiceResult, ServiceStatus } from "../../lib/service/types.ts";
import { executeUninstallWith } from "./cmd_uninstall.ts";

const INSTALLED_STATUS: ServiceStatus = {
  installed: true,
  running: true,
  initSystem: "systemd",
};

const NOT_INSTALLED_STATUS: ServiceStatus = {
  installed: false,
  running: false,
  initSystem: "systemd",
};

const SUCCESS_RESULT: ServiceResult = {
  success: true,
  message: "Service removed",
  initSystem: "systemd",
};

describe("executeUninstall", () => {
  it("returns error on Windows", async () => {
    const result = await executeUninstallWith("/app", {
      platform: "win32",
      status: () => INSTALLED_STATUS,
      uninstall: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("not available on Windows"));
  });

  it("returns not-installed when service does not exist", async () => {
    const result = await executeUninstallWith("/app", {
      platform: "linux",
      status: () => NOT_INSTALLED_STATUS,
      uninstall: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("not installed"));
  });

  it("uninstalls and returns success message", async () => {
    const result = await executeUninstallWith("/app", {
      platform: "linux",
      status: () => INSTALLED_STATUS,
      uninstall: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("removed") || result.text.includes("Removed"));
  });
});
