import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { generateLaunchdPlist, launchdLabel } from "./generate_plist.ts";
import type { ServiceConfig } from "./types.ts";

describe("launchdLabel", () => {
  it("returns the expected label", () => {
    strictEqual(launchdLabel(), "com.ghostpaw.agent");
  });
});

describe("generateLaunchdPlist", () => {
  const base: ServiceConfig = {
    workspace: "/Users/fox/ghostpaw",
    nodePath: "/usr/local/bin/node",
    ghostpawPath: "/Users/fox/ghostpaw/ghostpaw.mjs",
    nodeFlags: [],
  };

  it("generates valid XML plist", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.startsWith('<?xml version="1.0"'));
    ok(plist.includes("<plist version="));
    ok(plist.includes("</plist>"));
  });

  it("includes the correct label", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.includes("<string>com.ghostpaw.agent</string>"));
  });

  it("includes ProgramArguments with node and script", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.includes("<string>/usr/local/bin/node</string>"));
    ok(plist.includes("<string>/Users/fox/ghostpaw/ghostpaw.mjs</string>"));
  });

  it("sets KeepAlive and RunAtLoad", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.includes("<key>KeepAlive</key>"));
    ok(plist.includes("<true/>"));
    ok(plist.includes("<key>RunAtLoad</key>"));
  });

  it("includes stderr log path", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.includes("stderr.log"));
    ok(plist.includes("<key>StandardErrorPath</key>"));
  });

  it("includes node flags in arguments", () => {
    const config = { ...base, nodeFlags: ["--experimental-sqlite"] };
    const plist = generateLaunchdPlist(config);
    ok(plist.includes("<string>--experimental-sqlite</string>"));
  });

  it("escapes XML special characters", () => {
    const config = { ...base, workspace: "/Users/fox/test&dir<1>" };
    const plist = generateLaunchdPlist(config);
    ok(plist.includes("test&amp;dir&lt;1&gt;"));
    ok(!plist.includes("test&dir<1>"));
  });

  it("sets WorkingDirectory", () => {
    const plist = generateLaunchdPlist(base);
    ok(plist.includes("<key>WorkingDirectory</key>"));
    ok(plist.includes("<string>/Users/fox/ghostpaw</string>"));
  });
});
