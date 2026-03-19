import { ok } from "node:assert";
import { describe, it } from "node:test";
import type { ServiceResult, ServiceStatus } from "../../lib/service/types.ts";
import { executeInstallWith } from "./cmd_install.ts";

const INSTALLED_STATUS: ServiceStatus = {
  installed: true,
  running: true,
  initSystem: "launchd",
};

const NOT_INSTALLED_STATUS: ServiceStatus = {
  installed: false,
  running: false,
  initSystem: "launchd",
};

const SUCCESS_RESULT: ServiceResult = {
  success: true,
  message: "Service installed and started",
  initSystem: "launchd",
};

const FAIL_RESULT: ServiceResult = {
  success: false,
  message: "Failed to load LaunchAgent",
  initSystem: "launchd",
};

describe("executeInstall", () => {
  it("returns error on Windows", async () => {
    const result = await executeInstallWith("/app", {
      platform: "win32",
      status: () => NOT_INSTALLED_STATUS,
      install: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("not available on Windows"));
    ok(result.text.includes("Task Scheduler"));
  });

  it("returns already-installed when service exists", async () => {
    const result = await executeInstallWith("/app", {
      platform: "linux",
      status: () => INSTALLED_STATUS,
      install: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("already installed"));
  });

  it("installs and returns success message", async () => {
    const result = await executeInstallWith("/app", {
      platform: "darwin",
      status: () => NOT_INSTALLED_STATUS,
      install: () => SUCCESS_RESULT,
    });
    ok(result.text.includes("installed"));
    ok(result.text.includes("launchd"));
  });

  it("returns error on install failure", async () => {
    const result = await executeInstallWith("/app", {
      platform: "linux",
      status: () => NOT_INSTALLED_STATUS,
      install: () => FAIL_RESULT,
    });
    ok(result.text.includes("Failed"));
  });
});
