import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { generateSystemdUnit } from "./generate_unit.ts";
import type { ServiceConfig } from "./types.ts";

describe("generateSystemdUnit", () => {
  const base: ServiceConfig = {
    workspace: "/home/user/ghostpaw",
    nodePath: "/usr/bin/node",
    ghostpawPath: "/home/user/ghostpaw/ghostpaw.mjs",
    nodeFlags: [],
  };

  it("generates a valid systemd unit file", () => {
    const unit = generateSystemdUnit(base);
    ok(unit.includes("[Unit]"));
    ok(unit.includes("[Service]"));
    ok(unit.includes("[Install]"));
    ok(unit.includes("WantedBy=default.target"));
  });

  it("includes the correct ExecStart", () => {
    const unit = generateSystemdUnit(base);
    ok(unit.includes('ExecStart="/usr/bin/node"'));
    ok(unit.includes("ghostpaw.mjs"));
  });

  it("sets the workspace as WorkingDirectory", () => {
    const unit = generateSystemdUnit(base);
    ok(unit.includes("WorkingDirectory=/home/user/ghostpaw"));
  });

  it("includes restart policy", () => {
    const unit = generateSystemdUnit(base);
    ok(unit.includes("Restart=on-failure"));
    ok(unit.includes("RestartSec=5"));
  });

  it("includes node flags when present", () => {
    const config = { ...base, nodeFlags: ["--experimental-sqlite"] };
    const unit = generateSystemdUnit(config);
    ok(unit.includes("--experimental-sqlite"));
  });

  it("omits flags section when nodeFlags is empty", () => {
    const unit = generateSystemdUnit(base);
    const execLine = unit.split("\n").find((l) => l.startsWith("ExecStart="))!;
    strictEqual(execLine.includes("--experimental"), false);
  });

  it("handles paths with spaces", () => {
    const config = { ...base, nodePath: "/usr/local/bin/node 22", workspace: "/home/my user/gp" };
    const unit = generateSystemdUnit(config);
    ok(unit.includes('"/usr/local/bin/node 22"'));
    ok(unit.includes("WorkingDirectory=/home/my user/gp"));
  });
});
