import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { resolveServiceConfig } from "./resolve_config.ts";

describe("resolveServiceConfig", () => {
  it("returns a valid ServiceConfig", () => {
    const config = resolveServiceConfig(".");
    ok(typeof config.workspace === "string");
    ok(typeof config.nodePath === "string");
    ok(typeof config.ghostpawPath === "string");
    ok(Array.isArray(config.nodeFlags));
  });

  it("uses process.execPath as nodePath", () => {
    const config = resolveServiceConfig(".");
    strictEqual(config.nodePath, process.execPath);
  });

  it("resolves workspace to absolute path", () => {
    const config = resolveServiceConfig(".");
    ok(config.workspace.startsWith("/"));
  });

  it("sets ghostpawPath relative to workspace", () => {
    const config = resolveServiceConfig("/tmp/test");
    ok(config.ghostpawPath.endsWith("ghostpaw.mjs"));
    ok(config.ghostpawPath.startsWith("/tmp/test"));
  });

  it("includes experimental-sqlite flag for Node < 24", () => {
    const major = Number.parseInt(process.versions.node.split(".")[0]!, 10);
    const config = resolveServiceConfig(".");
    if (major < 24) {
      ok(config.nodeFlags.includes("--experimental-sqlite"));
    } else {
      strictEqual(config.nodeFlags.length, 0);
    }
  });
});
