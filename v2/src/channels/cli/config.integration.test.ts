import { ok, strictEqual } from "node:assert";
import type { SpawnSyncReturns } from "node:child_process";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

const ENTRY = resolve(import.meta.dirname, "../../index.ts");

interface CliResult extends SpawnSyncReturns<string> {
  tmp: string;
}

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "gp-cfg-int-test-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function cli(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [ENTRY, `--workspace=${tmp}`, ...args], {
    encoding: "utf-8",
    timeout: 10_000,
  });
  return { ...result, tmp };
}

describe("CLI: config help", () => {
  it("bare config and --help both show subcommand descriptions", () => {
    const bare = cli(["config"]);
    const bareTxt = bare.stdout + bare.stderr;
    ok(bareTxt.includes("set"), "Bare: should mention set");
    ok(bareTxt.includes("get"), "Bare: should mention get");
    ok(bareTxt.includes("list"), "Bare: should mention list");
    ok(bareTxt.includes("reset"), "Bare: should mention reset");
    ok(bareTxt.includes("undo"), "Bare: should mention undo");
    ok(bareTxt.includes("Manage configuration"), "Bare: should show description");

    const help = cli(["config", "--help"]);
    strictEqual(help.status, 0);
    const helpTxt = help.stdout + help.stderr;
    ok(helpTxt.includes("set"), "Help: should list set");
    ok(helpTxt.includes("get"), "Help: should list get");
  });

  it("--help mentions config in global help", () => {
    const help = spawnSync(process.execPath, [ENTRY, "--help"], {
      encoding: "utf-8",
      timeout: 10_000,
    });
    const out = help.stdout + help.stderr;
    ok(out.includes("config"), "Global help should mention config command");
  });
});

describe("CLI: config set + get round-trip", () => {
  it("sets and gets a string value", () => {
    const set = cli(["config", "set", "default_model", "gpt-4o"]);
    strictEqual(set.status, 0);
    const setTxt = set.stdout + set.stderr;
    ok(setTxt.includes("default_model"), "Should mention key");
    ok(setTxt.includes("gpt-4o"), "Should mention value");

    const get = cli(["config", "get", "default_model"]);
    strictEqual(get.status, 0);
    const getTxt = get.stdout + get.stderr;
    ok(getTxt.includes("gpt-4o"), "Should show stored value");
  });

  it("sets and gets an integer value for known key", () => {
    const set = cli(["config", "set", "max_tokens_per_session", "50000"]);
    strictEqual(set.status, 0);

    const get = cli(["config", "get", "max_tokens_per_session"]);
    strictEqual(get.status, 0);
    ok((get.stdout + get.stderr).includes("50000"));
  });

  it("sets and gets a number value", () => {
    const set = cli(["config", "set", "max_cost_per_day", "5.5"]);
    strictEqual(set.status, 0);

    const get = cli(["config", "get", "max_cost_per_day"]);
    strictEqual(get.status, 0);
    ok((get.stdout + get.stderr).includes("5.5"));
  });

  it("sets and gets a custom boolean value", () => {
    const set = cli(["config", "set", "my_flag", "true"]);
    strictEqual(set.status, 0);

    const get = cli(["config", "get", "my_flag"]);
    strictEqual(get.status, 0);
    ok((get.stdout + get.stderr).includes("true"));
  });

  it("shows overwrite with previous -> new", () => {
    cli(["config", "set", "default_model", "old"]);
    const set2 = cli(["config", "set", "default_model", "new"]);
    strictEqual(set2.status, 0);
    const txt = set2.stdout + set2.stderr;
    ok(txt.includes("old"), "Should show previous value");
    ok(txt.includes("new"), "Should show new value");
    ok(txt.includes("->"), "Should show arrow");
  });
});

describe("CLI: config set with --type override", () => {
  it("forces string type for numeric-looking value", () => {
    const set = cli(["config", "set", "port", "8080", "--type=string"]);
    strictEqual(set.status, 0);
    ok((set.stdout + set.stderr).includes("string"), "Should confirm string type");
  });

  it("rejects invalid --type value", () => {
    const set = cli(["config", "set", "key", "val", "--type=json"]);
    ok(set.status !== 0, `Expected non-zero exit, got ${set.status}`);
    ok((set.stdout + set.stderr).includes("json") || (set.stdout + set.stderr).includes("Invalid"));
  });
});

describe("CLI: config set error handling", () => {
  it("rejects type mismatch on known key", () => {
    const set = cli(["config", "set", "max_cost_per_day", "banana"]);
    ok(set.status !== 0, "Should fail for non-numeric value on number key");
    const txt = set.stdout + set.stderr;
    ok(txt.includes("number") || txt.includes("banana"), "Error should be actionable");
  });

  it("rejects constraint violation on known key", () => {
    const set = cli(["config", "set", "warn_at_percentage", "150"]);
    ok(set.status !== 0, "Should fail for out-of-range value");
  });

  it("handles negative number as value", () => {
    const set = cli(["config", "set", "my_offset", "--", "-5"]);
    strictEqual(set.status, 0);
    const get = cli(["config", "get", "my_offset"]);
    strictEqual(get.status, 0);
    ok((get.stdout + get.stderr).includes("-5"));
  });
});

describe("CLI: config get", () => {
  it("returns default value for known key not set", () => {
    const get = cli(["config", "get", "default_model"]);
    strictEqual(get.status, 0);
    ok(get.stdout.includes("claude-sonnet-4-6"), "Should show default value");
  });

  it("exits with error for unknown custom key not set", () => {
    const get = cli(["config", "get", "nonexistent"]);
    ok(get.status !== 0, "Should fail for unconfigured custom key");
    ok((get.stdout + get.stderr).includes("not configured"));
  });
});

describe("CLI: config list", () => {
  it("shows all categories with defaults", () => {
    const list = cli(["config", "list"]);
    strictEqual(list.status, 0);
    const txt = list.stdout;
    ok(txt.includes("model"), "Should show model category");
    ok(txt.includes("cost"), "Should show cost category");
    ok(txt.includes("default_model"), "Should show known keys");
  });

  it("shows overridden values and custom keys", () => {
    cli(["config", "set", "default_model", "gpt-4o"]);
    cli(["config", "set", "my_thing", "hello"]);
    const list = cli(["config", "list"]);
    strictEqual(list.status, 0);
    const txt = list.stdout;
    ok(txt.includes("gpt-4o"), "Should show overridden value");
    ok(txt.includes("custom"), "Should show custom category");
    ok(txt.includes("my_thing"), "Should show custom key");
  });

  it("filters by --category", () => {
    const list = cli(["config", "list", "--category=cost"]);
    strictEqual(list.status, 0);
    const txt = list.stdout;
    ok(txt.includes("max_cost_per_day"), "Should include cost keys");
    ok(!txt.includes("default_model"), "Should not include model keys");
  });

  it("rejects invalid --category", () => {
    const list = cli(["config", "list", "--category=bogus"]);
    ok(list.status !== 0, "Should fail for invalid category");
  });
});

describe("CLI: config reset", () => {
  it("resets overridden known key to default", () => {
    cli(["config", "set", "default_model", "gpt-4o"]);
    const reset = cli(["config", "reset", "default_model"]);
    strictEqual(reset.status, 0);
    const txt = reset.stdout + reset.stderr;
    ok(txt.includes("reset"), "Should confirm reset");
    ok(txt.includes("default"), "Should mention default");

    const get = cli(["config", "get", "default_model"]);
    ok((get.stdout + get.stderr).includes("claude-sonnet-4-6"));
  });

  it("reports known key already at default", () => {
    const reset = cli(["config", "reset", "default_model"]);
    strictEqual(reset.status, 0);
    const txt = reset.stdout + reset.stderr;
    ok(txt.includes("already"), "Should say already at default");
  });

  it("removes custom key", () => {
    cli(["config", "set", "my_key", "val"]);
    const reset = cli(["config", "reset", "my_key"]);
    strictEqual(reset.status, 0);
    ok((reset.stdout + reset.stderr).includes("removed"));

    const get = cli(["config", "get", "my_key"]);
    ok(get.status !== 0, "Key should be gone");
  });

  it("reports custom key not configured", () => {
    const reset = cli(["config", "reset", "nonexistent"]);
    strictEqual(reset.status, 0);
    ok((reset.stdout + reset.stderr).includes("not configured"));
  });
});

describe("CLI: config undo", () => {
  it("walks back to previous value", () => {
    cli(["config", "set", "max_cost_per_day", "5"]);
    cli(["config", "set", "max_cost_per_day", "10"]);
    const undo = cli(["config", "undo", "max_cost_per_day"]);
    strictEqual(undo.status, 0);
    const txt = undo.stdout + undo.stderr;
    ok(txt.includes("restored"), "Should say restored");
    ok(txt.includes("5"), "Should show restored value");

    const get = cli(["config", "get", "max_cost_per_day"]);
    ok((get.stdout + get.stderr).includes("5"));
  });

  it("undo to default for known key", () => {
    cli(["config", "set", "default_model", "gpt-4o"]);
    const undo = cli(["config", "undo", "default_model"]);
    strictEqual(undo.status, 0);
    const txt = undo.stdout + undo.stderr;
    ok(txt.includes("default"), "Should mention default");
    ok(txt.includes("gpt-4o"), "Should show what was undone");
  });

  it("reports no history to undo", () => {
    const undo = cli(["config", "undo", "default_model"]);
    strictEqual(undo.status, 0);
    ok((undo.stdout + undo.stderr).includes("no change history"));
  });
});
