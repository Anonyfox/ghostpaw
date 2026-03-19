import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./sessions_list.ts";

describe("sessions list", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "list");
    ok(meta?.description);
  });

  it("has optional channel flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.channel?.type, "string");
  });

  it("has optional status flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.status?.type, "string");
  });

  it("has optional purpose flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.purpose?.type, "string");
  });

  it("has optional sort flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.sort?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});
