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
  tmp = mkdtempSync(join(tmpdir(), "gp-cli-test-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function cli(args: string[], opts?: { input?: string }): CliResult {
  const result = spawnSync(process.execPath, [ENTRY, `--workspace=${tmp}`, ...args], {
    encoding: "utf-8",
    timeout: 10_000,
    input: opts?.input,
  });
  return { ...result, tmp };
}

function cliRaw(args: string[]): CliResult {
  const result = spawnSync(process.execPath, [ENTRY, ...args], {
    encoding: "utf-8",
    timeout: 10_000,
  });
  return { ...result, tmp };
}

describe("CLI: global", () => {
  it("--version prints a version string and --help shows usage", () => {
    const ver = cliRaw(["--version"]);
    strictEqual(ver.status, 0);
    ok(ver.stdout.trim().match(/^\d+\.\d+\.\d+/), `Expected version, got: ${ver.stdout.trim()}`);

    const help = cliRaw(["--help"]);
    strictEqual(help.status, 0);
    const out = help.stdout + help.stderr;
    ok(out.includes("ghostpaw"), "Should mention ghostpaw");
    ok(out.includes("secrets"), "Should mention secrets command");
    ok(out.includes("workspace"), "Should mention workspace flag");
  });

  it("unknown command shows help", () => {
    const r = cliRaw(["nonexistent"]);
    const out = r.stdout + r.stderr;
    ok(out.includes("ghostpaw") || out.includes("USAGE") || out.includes("secrets"));
  });
});

describe("CLI: secrets help", () => {
  it("bare secrets and --help both show subcommand descriptions", () => {
    const bare = cli(["secrets"]);
    const bareTxt = bare.stdout + bare.stderr;
    ok(bareTxt.includes("set"), "Bare: should mention set");
    ok(bareTxt.includes("delete"), "Bare: should mention delete");
    ok(bareTxt.includes("list"), "Bare: should mention list");
    ok(bareTxt.includes("Manage API keys"), "Bare: should show description");

    const help = cli(["secrets", "--help"]);
    strictEqual(help.status, 0);
    const helpTxt = help.stdout + help.stderr;
    ok(helpTxt.includes("set"), "Help: should list set");
    ok(helpTxt.includes("delete"), "Help: should list delete");
  });
});

describe("CLI: secrets set", () => {
  it("stores a value, shows in list, alias resolves, prefix warns", () => {
    const store = cli(["secrets", "set", "MY_TEST_KEY"], { input: "test-value-123\n" });
    strictEqual(store.status, 0);
    const storeTxt = store.stdout + store.stderr;
    ok(storeTxt.includes("stored"), "Should confirm storage");
    ok(storeTxt.includes("MY_TEST_KEY"), "Should mention key name");

    const list = cli(["secrets", "list"]);
    strictEqual(list.status, 0);
    ok(list.stdout.includes("LLM"), "List should show LLM category");
    ok(list.stdout.includes("Search"), "List should show Search category");
    ok(list.stdout.includes("MY_TEST_KEY"), "Stored key should appear in list");

    const alias = cli(["secrets", "set", "ANTHROPIC_API_KEY"], { input: "sk-ant-test123\n" });
    strictEqual(alias.status, 0);
    const aliasTxt = alias.stdout + alias.stderr;
    ok(aliasTxt.includes("->") || aliasTxt.includes("API_KEY_ANTHROPIC"), "Should show canonical");

    const warn = cli(["secrets", "set", "API_KEY_ANTHROPIC"], { input: "sk-proj-wrong\n" });
    strictEqual(warn.status, 0);
    const warnTxt = warn.stdout + warn.stderr;
    ok(warnTxt.includes("OpenAI") || warnTxt.includes("warning"), "Should warn about mismatch");
  });

  it("empty piped value exits with error", () => {
    const r = cli(["secrets", "set", "MY_TEST_KEY"], { input: "\n" });
    ok(r.status !== 0, `Expected non-zero exit, got ${r.status}`);
  });
});

describe("CLI: secrets delete", () => {
  it("full lifecycle: set, verify, delete, confirm gone", () => {
    cli(["secrets", "set", "MY_TEST_KEY"], { input: "val\n" });

    const del = cli(["secrets", "delete", "MY_TEST_KEY"]);
    strictEqual(del.status, 0);
    const delTxt = del.stdout + del.stderr;
    ok(delTxt.includes("deleted"), "Should confirm deletion");

    const list = cli(["secrets", "list"]);
    strictEqual(list.status, 0);
    ok(!list.stdout.includes("MY_TEST_KEY"), "Deleted key should not appear");
  });

  it("reports when key was not configured", () => {
    const r = cli(["secrets", "delete", "NONEXISTENT_KEY"]);
    strictEqual(r.status, 0);
    const out = r.stdout + r.stderr;
    ok(out.includes("not configured"), "Should indicate key was not present");
  });
});
