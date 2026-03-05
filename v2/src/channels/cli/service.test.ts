import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import service from "./service.ts";

describe("service CLI command", () => {
  it("exports a citty command with meta", () => {
    ok(service.meta);
    strictEqual(service.meta!.name, "service");
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

  it("has exactly four subcommands", () => {
    strictEqual(Object.keys(service.subCommands!).length, 4);
  });
});
