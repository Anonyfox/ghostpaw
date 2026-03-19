import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { CommandMeta } from "citty";
import service from "./service.ts";

describe("service CLI command", () => {
  it("exports a citty command with meta", () => {
    ok(service.meta);
    strictEqual((service.meta as CommandMeta).name, "service");
  });

  it("has install subcommand", () => {
    ok("install" in service.subCommands!);
  });

  it("has uninstall subcommand", () => {
    ok("uninstall" in service.subCommands!);
  });

  it("has status subcommand", () => {
    ok("status" in service.subCommands!);
  });

  it("has logs subcommand", () => {
    ok("logs" in service.subCommands!);
  });

  it("has restart subcommand", () => {
    ok("restart" in service.subCommands!);
  });

  it("has stop subcommand", () => {
    ok("stop" in service.subCommands!);
  });

  it("has exactly six subcommands", () => {
    strictEqual(Object.keys(service.subCommands!).length, 6);
  });
});
