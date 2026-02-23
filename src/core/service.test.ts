import { match, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { ServiceConfig } from "./service.js";
import {
  detectInitSystem,
  generateLaunchdPlist,
  generateSystemdUnit,
  generateWatchdogScript,
} from "./service.js";

const SAMPLE_CONFIG: ServiceConfig = {
  workspace: "/opt/myagent",
  nodePath: "/usr/local/bin/node",
  ghostpawPath: "/usr/local/bin/ghostpaw",
};

describe("service", () => {
  describe("detectInitSystem", () => {
    it("returns a valid init system", () => {
      const result = detectInitSystem();
      ok(
        result === "systemd" || result === "launchd" || result === "cron",
        `Expected systemd|launchd|cron, got ${result}`,
      );
    });

    it("returns launchd on macOS", () => {
      if (process.platform !== "darwin") return;
      strictEqual(detectInitSystem(), "launchd");
    });
  });

  describe("generateSystemdUnit", () => {
    const unit = generateSystemdUnit(SAMPLE_CONFIG);

    it("includes Description", () => {
      ok(unit.includes("Description=Ghostpaw AI Agent"));
    });

    it("quotes ExecStart paths for space safety", () => {
      match(
        unit,
        /ExecStart="\/usr\/local\/bin\/node" --experimental-sqlite "\/usr\/local\/bin\/ghostpaw"/,
      );
    });

    it("includes WorkingDirectory", () => {
      ok(unit.includes("WorkingDirectory=/opt/myagent"));
    });

    it("includes Restart=on-failure", () => {
      ok(unit.includes("Restart=on-failure"));
    });

    it("includes RestartSec=5", () => {
      ok(unit.includes("RestartSec=5"));
    });

    it("includes [Install] section with WantedBy", () => {
      ok(unit.includes("[Install]"));
      ok(unit.includes("WantedBy=default.target"));
    });

    it("handles paths with spaces", () => {
      const cfg: ServiceConfig = {
        workspace: "/opt/my agent",
        nodePath: "/usr/local/my node/bin/node",
        ghostpawPath: "/usr/local/my bin/ghostpaw",
      };
      const u = generateSystemdUnit(cfg);
      ok(u.includes('"/usr/local/my node/bin/node"'));
      ok(u.includes('"/usr/local/my bin/ghostpaw"'));
    });
  });

  describe("generateLaunchdPlist", () => {
    const plist = generateLaunchdPlist(SAMPLE_CONFIG);

    it("is valid XML plist", () => {
      match(plist, /^<\?xml version="1.0"/);
      ok(plist.includes('<plist version="1.0">'));
      ok(plist.includes("</plist>"));
    });

    it("uses correct label", () => {
      ok(plist.includes("<string>com.ghostpaw.agent</string>"));
    });

    it("includes ProgramArguments with node + sqlite flag + ghostpaw", () => {
      ok(plist.includes("<string>/usr/local/bin/node</string>"));
      ok(plist.includes("<string>--experimental-sqlite</string>"));
      ok(plist.includes("<string>/usr/local/bin/ghostpaw</string>"));
    });

    it("includes WorkingDirectory", () => {
      ok(plist.includes("<string>/opt/myagent</string>"));
    });

    it("sets KeepAlive and RunAtLoad", () => {
      ok(plist.includes("<key>KeepAlive</key>"));
      ok(plist.includes("<key>RunAtLoad</key>"));
    });

    it("captures stderr to .ghostpaw directory", () => {
      ok(plist.includes("/opt/myagent/.ghostpaw/stderr.log"));
    });

    it("XML-escapes paths with special characters", () => {
      const cfg: ServiceConfig = {
        workspace: "/opt/my&agent",
        nodePath: "/usr/local/bin/node",
        ghostpawPath: "/usr/local/bin/ghostpaw",
      };
      const p = generateLaunchdPlist(cfg);
      ok(p.includes("/opt/my&amp;agent"));
      ok(!p.includes("/opt/my&agent"));
    });
  });

  describe("generateWatchdogScript", () => {
    const script = generateWatchdogScript(SAMPLE_CONFIG);

    it("starts with shebang", () => {
      ok(script.startsWith("#!/bin/sh"));
    });

    it("writes PID file", () => {
      ok(script.includes("echo $$ > "));
      ok(script.includes("watchdog.pid"));
    });

    it("quotes paths in the exec line", () => {
      ok(script.includes('"/usr/local/bin/node" --experimental-sqlite "/usr/local/bin/ghostpaw"'));
    });

    it("restarts with 5s backoff", () => {
      ok(script.includes("sleep 5"));
    });

    it("captures stderr to .ghostpaw directory", () => {
      ok(script.includes("stderr.log"));
    });

    it("uses while true loop", () => {
      ok(script.includes("while true; do"));
    });

    it("handles paths with spaces", () => {
      const cfg: ServiceConfig = {
        workspace: "/opt/my agent",
        nodePath: "/my tools/node",
        ghostpawPath: "/my tools/ghostpaw",
      };
      const s = generateWatchdogScript(cfg);
      ok(s.includes('"/my tools/node" --experimental-sqlite "/my tools/ghostpaw"'));
    });
  });

  describe("path handling", () => {
    it("uses absolute paths from config in all generators", () => {
      const config: ServiceConfig = {
        workspace: "/home/user/agent",
        nodePath: "/home/user/.nvm/versions/node/v22.0.0/bin/node",
        ghostpawPath: "/home/user/.local/bin/ghostpaw",
      };

      const unit = generateSystemdUnit(config);
      ok(unit.includes(config.nodePath));
      ok(unit.includes(config.ghostpawPath));
      ok(unit.includes(config.workspace));

      const plist = generateLaunchdPlist(config);
      ok(plist.includes(config.nodePath));
      ok(plist.includes(config.ghostpawPath));
      ok(plist.includes(config.workspace));

      const watchdog = generateWatchdogScript(config);
      ok(watchdog.includes(config.nodePath));
      ok(watchdog.includes(config.ghostpawPath));
    });
  });
});
