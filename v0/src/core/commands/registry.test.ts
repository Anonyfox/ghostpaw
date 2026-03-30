import assert from "node:assert";
import { describe, it } from "node:test";
import { createRegistry } from "./registry.ts";
import type { Command, CommandCtx } from "./types.ts";

function dummyCommand(name: string, overrides?: Partial<Command>): Command {
  return {
    name,
    description: `Test command ${name}`,
    slash: true,
    cli: true,
    async execute(_ctx: CommandCtx, args: string) {
      return { text: `${name}: ${args}` };
    },
    ...overrides,
  };
}

const dummyCtx: CommandCtx = {
  db: {} as CommandCtx["db"],
  codexDb: {} as CommandCtx["codexDb"],
  affinityDb: {} as CommandCtx["affinityDb"],
  soulsDb: {} as CommandCtx["soulsDb"],
  soulIds: { ghostpaw: 1, scribe: 2, innkeeper: 3, mentor: 4 },
  homePath: "/tmp",
  workspace: "/tmp",
  config: {
    model: "test-model",
    model_small: "test-small",
    model_large: "test-large",
    compaction_threshold: 180_000,
    delegation_timeout_ms: 3_600_000,
    pulse_stop_wait_ms: 1_200_000,
    interceptor: {
      enabled: false,
      subsystems: {},
    },
  },
  sessionId: null,
};

describe("createRegistry", () => {
  it("registers and retrieves commands", () => {
    const registry = createRegistry();
    registry.register(dummyCommand("test"));
    const cmd = registry.get("test");
    assert.ok(cmd);
    assert.strictEqual(cmd.name, "test");
  });

  it("returns undefined for unregistered commands", () => {
    const registry = createRegistry();
    assert.strictEqual(registry.get("nope"), undefined);
  });
});

describe("parseSlash", () => {
  it("parses simple slash command", () => {
    const registry = createRegistry();
    const parsed = registry.parseSlash("/help");
    assert.deepStrictEqual(parsed, { name: "help", args: "" });
  });

  it("parses slash command with arguments", () => {
    const registry = createRegistry();
    const parsed = registry.parseSlash("/model gpt-4o");
    assert.deepStrictEqual(parsed, { name: "model", args: "gpt-4o" });
  });

  it("returns null for non-slash input", () => {
    const registry = createRegistry();
    assert.strictEqual(registry.parseSlash("just a message"), null);
  });

  it("trims whitespace", () => {
    const registry = createRegistry();
    const parsed = registry.parseSlash("  /help  ");
    assert.deepStrictEqual(parsed, { name: "help", args: "" });
  });
});

describe("execute", () => {
  it("executes a registered command", async () => {
    const registry = createRegistry();
    registry.register(dummyCommand("test"));
    const result = await registry.execute("test", "hello", dummyCtx);
    assert.strictEqual(result.text, "test: hello");
  });

  it("returns error for unknown command", async () => {
    const registry = createRegistry();
    const result = await registry.execute("nope", "", dummyCtx);
    assert.ok(result.text.includes("Unknown command"));
  });
});

describe("listSlash / listCli", () => {
  it("filters by slash flag", () => {
    const registry = createRegistry();
    registry.register(dummyCommand("both", { slash: true, cli: true }));
    registry.register(dummyCommand("cliOnly", { slash: false, cli: true }));
    registry.register(dummyCommand("slashOnly", { slash: true, cli: false }));

    const slashCmds = registry.listSlash();
    const names = slashCmds.map((c) => c.name);
    assert.ok(names.includes("both"));
    assert.ok(names.includes("slashOnly"));
    assert.ok(!names.includes("cliOnly"));
  });

  it("filters by cli flag", () => {
    const registry = createRegistry();
    registry.register(dummyCommand("both", { slash: true, cli: true }));
    registry.register(dummyCommand("cliOnly", { slash: false, cli: true }));
    registry.register(dummyCommand("slashOnly", { slash: true, cli: false }));

    const cliCmds = registry.listCli();
    const names = cliCmds.map((c) => c.name);
    assert.ok(names.includes("both"));
    assert.ok(names.includes("cliOnly"));
    assert.ok(!names.includes("slashOnly"));
  });

  it("excludes hidden commands", () => {
    const registry = createRegistry();
    registry.register(dummyCommand("visible"));
    registry.register(dummyCommand("hidden", { hidden: true }));

    const slashCmds = registry.listSlash();
    assert.ok(!slashCmds.find((c) => c.name === "hidden"));
  });
});
