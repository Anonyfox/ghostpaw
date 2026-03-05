import { ok } from "node:assert";
import { describe, it } from "node:test";
import { generateWatchdogScript } from "./generate_watchdog.ts";
import type { ServiceConfig } from "./types.ts";

describe("generateWatchdogScript", () => {
  const base: ServiceConfig = {
    workspace: "/home/user/ghostpaw",
    nodePath: "/usr/bin/node",
    ghostpawPath: "/home/user/ghostpaw/ghostpaw.mjs",
    nodeFlags: [],
  };

  it("starts with a shebang", () => {
    const script = generateWatchdogScript(base);
    ok(script.startsWith("#!/bin/sh\n"));
  });

  it("writes a PID file", () => {
    const script = generateWatchdogScript(base);
    ok(script.includes("PIDFILE="));
    ok(script.includes("watchdog.pid"));
    ok(script.includes('echo $$ > "$PIDFILE"'));
  });

  it("loops with restart delay", () => {
    const script = generateWatchdogScript(base);
    ok(script.includes("while true; do"));
    ok(script.includes("sleep 5"));
    ok(script.includes("done"));
  });

  it("invokes node with the ghostpaw script", () => {
    const script = generateWatchdogScript(base);
    ok(script.includes('"/usr/bin/node"'));
    ok(script.includes("ghostpaw.mjs"));
  });

  it("redirects stderr to log file", () => {
    const script = generateWatchdogScript(base);
    ok(script.includes("stderr.log"));
    ok(script.includes("2>>"));
  });

  it("includes node flags when present", () => {
    const config = { ...base, nodeFlags: ["--experimental-sqlite"] };
    const script = generateWatchdogScript(config);
    ok(script.includes("--experimental-sqlite"));
  });

  it("omits extra space when no flags", () => {
    const script = generateWatchdogScript(base);
    ok(script.includes('"/usr/bin/node" "/home/user/ghostpaw/ghostpaw.mjs"'));
  });
});
