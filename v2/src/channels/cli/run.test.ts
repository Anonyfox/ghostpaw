import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import runCommand from "./run.ts";

describe("run command definition", () => {
  it("exports a valid citty command", () => {
    ok(runCommand);
    ok(typeof runCommand === "object");
  });

  it("has meta with name 'run'", () => {
    const meta = runCommand.meta as { name?: string; description?: string } | undefined;
    strictEqual(meta?.name, "run");
    ok(meta?.description?.includes("prompt"));
  });

  it("defines the prompt as an optional positional argument", () => {
    const args = runCommand.args as Record<string, { type: string; required?: boolean }>;
    ok(args.prompt);
    strictEqual(args.prompt.type, "positional");
    strictEqual(args.prompt.required, false);
  });

  it("defines the --model flag", () => {
    const args = runCommand.args as Record<string, { type: string }>;
    ok(args.model);
    strictEqual(args.model.type, "string");
  });

  it("defines the --system flag", () => {
    const args = runCommand.args as Record<string, { type: string }>;
    ok(args.system);
    strictEqual(args.system.type, "string");
  });

  it("defines the --no-stream flag", () => {
    const args = runCommand.args as Record<string, { type: string; default?: boolean }>;
    ok(args["no-stream"]);
    strictEqual(args["no-stream"].type, "boolean");
    strictEqual(args["no-stream"].default, false);
  });

  it("has a run function", () => {
    ok(typeof runCommand.run === "function");
  });
});
