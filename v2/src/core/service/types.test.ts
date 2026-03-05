import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { InitSystem, ServiceConfig, ServiceResult, ServiceStatus } from "./types.ts";

describe("ServiceConfig", () => {
  it("accepts all required fields", () => {
    const config: ServiceConfig = {
      workspace: "/home/user/ghostpaw",
      nodePath: "/usr/bin/node",
      ghostpawPath: "/home/user/ghostpaw/ghostpaw.mjs",
      nodeFlags: ["--experimental-sqlite"],
    };
    strictEqual(config.workspace, "/home/user/ghostpaw");
    strictEqual(config.nodeFlags.length, 1);
  });

  it("accepts empty nodeFlags for Node 24+", () => {
    const config: ServiceConfig = {
      workspace: "/opt/ghostpaw",
      nodePath: "/usr/local/bin/node",
      ghostpawPath: "/opt/ghostpaw/ghostpaw.mjs",
      nodeFlags: [],
    };
    strictEqual(config.nodeFlags.length, 0);
  });
});

describe("ServiceResult", () => {
  it("represents a successful result", () => {
    const result: ServiceResult = {
      success: true,
      message: "Service installed",
      initSystem: "systemd",
      path: "/etc/systemd/user/ghostpaw.service",
    };
    ok(result.success);
    strictEqual(result.initSystem, "systemd");
  });

  it("represents a failed result without path", () => {
    const result: ServiceResult = {
      success: false,
      message: "Failed to reload",
      initSystem: "launchd",
    };
    ok(!result.success);
    strictEqual(result.path, undefined);
  });
});

describe("ServiceStatus", () => {
  it("represents installed and running", () => {
    const status: ServiceStatus = {
      installed: true,
      running: true,
      initSystem: "systemd",
      pid: 12345,
    };
    ok(status.installed && status.running);
    strictEqual(status.pid, 12345);
  });

  it("represents not installed", () => {
    const status: ServiceStatus = {
      installed: false,
      running: false,
      initSystem: "cron",
    };
    ok(!status.installed);
    strictEqual(status.pid, undefined);
  });
});

describe("InitSystem", () => {
  it("accepts all valid init system types", () => {
    const systems: InitSystem[] = ["systemd", "launchd", "cron"];
    strictEqual(systems.length, 3);
    ok(systems.includes("systemd"));
    ok(systems.includes("launchd"));
    ok(systems.includes("cron"));
  });
});
