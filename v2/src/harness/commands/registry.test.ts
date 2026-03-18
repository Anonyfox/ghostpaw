import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { COMMANDS, formatHelpText, parseSlashCommand } from "./registry.ts";

describe("parseSlashCommand", () => {
  it("parses a known command without args", () => {
    const result = parseSlashCommand("/new");
    ok(result);
    strictEqual(result.name, "new");
    strictEqual(result.args, "");
  });

  it("parses a known command with args", () => {
    const result = parseSlashCommand("/model grok-3");
    ok(result);
    strictEqual(result.name, "model");
    strictEqual(result.args, "grok-3");
  });

  it("parses /help with a subcommand arg", () => {
    const result = parseSlashCommand("/help model");
    ok(result);
    strictEqual(result.name, "help");
    strictEqual(result.args, "model");
  });

  it("returns null for unrecognized /foo", () => {
    strictEqual(parseSlashCommand("/foo"), null);
  });

  it("returns null for empty string", () => {
    strictEqual(parseSlashCommand(""), null);
  });

  it("returns null for text not starting with /", () => {
    strictEqual(parseSlashCommand("hello /new"), null);
  });

  it("returns null for just /", () => {
    strictEqual(parseSlashCommand("/"), null);
  });

  it("preserves args with multiple spaces", () => {
    const result = parseSlashCommand("/model some model name");
    ok(result);
    strictEqual(result.args, "some model name");
  });
});

describe("COMMANDS", () => {
  it("contains all 5 expected commands", () => {
    strictEqual(COMMANDS.length, 5);
    const names = COMMANDS.map((c) => c.name);
    ok(names.includes("help"));
    ok(names.includes("new"));
    ok(names.includes("undo"));
    ok(names.includes("model"));
    ok(names.includes("costs"));
  });

  it("every command has a name and description", () => {
    for (const cmd of COMMANDS) {
      ok(cmd.name.length > 0);
      ok(cmd.description.length > 0);
      ok(typeof cmd.execute === "function");
    }
  });
});

describe("formatHelpText", () => {
  it("lists all commands when no name given", () => {
    const text = formatHelpText();
    ok(text.includes("/help"));
    ok(text.includes("/new"));
    ok(text.includes("/undo"));
    ok(text.includes("/model"));
    ok(text.includes("/costs"));
  });

  it("shows details for a specific command", () => {
    const text = formatHelpText("model");
    ok(text.includes("/model"));
    ok(text.includes("[name]"));
  });

  it("returns unknown for invalid command name", () => {
    const text = formatHelpText("nonexistent");
    ok(text.includes("Unknown"));
  });
});
