import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import cmd from "./pack_list.ts";

describe("pack list", () => {
  it("has correct meta", () => {
    const meta = cmd.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "list");
    ok(meta?.description);
  });

  it("has optional status flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.status?.type, "string");
  });

  it("has optional kind flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.kind?.type, "string");
  });

  it("has optional limit flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.limit?.type, "string");
  });

  it("has optional field flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.field?.type, "string");
  });

  it("has optional group flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.group?.type, "string");
  });

  it("has optional search flag", () => {
    const args = cmd.args as Record<string, { type: string }>;
    strictEqual(args.search?.type, "string");
  });

  it("has a run function", () => {
    ok(typeof cmd.run === "function");
  });
});
