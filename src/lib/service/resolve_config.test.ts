import { ok, strictEqual } from "node:assert";
import { resolve } from "node:path";
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

  it("uses the running script as ghostpawPath", () => {
    const config = resolveServiceConfig("/tmp/test");
    strictEqual(config.ghostpawPath, resolve(process.argv[1]!));
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
