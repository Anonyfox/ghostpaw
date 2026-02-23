import { ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initWorkspace } from "./init.js";
import { DEFAULT_SOUL } from "./soul.js";

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-init-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("initWorkspace - fresh directory", () => {
  it("creates all expected files and directories", () => {
    const result = initWorkspace(workDir);

    ok(existsSync(join(workDir, "agents")));
    ok(existsSync(join(workDir, "skills")));
    ok(existsSync(join(workDir, ".ghostpaw")));
    ok(existsSync(join(workDir, "SOUL.md")));
    ok(existsSync(join(workDir, "config.json")));
    ok(existsSync(join(workDir, ".gitignore")));

    strictEqual(result.created.length, 6);
    strictEqual(result.skipped.length, 0);
  });

  it("writes the default SOUL to SOUL.md", () => {
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "SOUL.md"), "utf-8");
    ok(content.includes("# Ghostpaw"));
    ok(content.includes("autonomous AI agent"));
    ok(content.includes("agents/"));
    ok(content.includes("skills/"));
  });

  it("writes valid JSON to config.json", () => {
    initWorkspace(workDir);
    const raw = readFileSync(join(workDir, "config.json"), "utf-8");
    const config = JSON.parse(raw);
    ok(config.models);
    ok(config.costControls);
    ok(typeof config.providers === "object");
  });

  it("config.json includes default model tiers", () => {
    initWorkspace(workDir);
    const config = JSON.parse(readFileSync(join(workDir, "config.json"), "utf-8"));
    strictEqual(config.models.default, "anthropic/claude-sonnet-4");
    ok(config.models.cheap);
    ok(config.models.powerful);
  });

  it("creates .gitignore with ghostpaw entries", () => {
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, ".gitignore"), "utf-8");
    ok(content.includes("ghostpaw.db"));
    ok(content.includes("ghostpaw.db-wal"));
    ok(content.includes(".ghostpaw/"));
  });
});

describe("initWorkspace - idempotency", () => {
  it("skips existing files and directories", () => {
    initWorkspace(workDir);
    const result = initWorkspace(workDir);

    strictEqual(result.created.length, 0);
    strictEqual(result.skipped.length, 6);
  });

  it("does not overwrite existing SOUL.md", () => {
    writeFileSync(join(workDir, "SOUL.md"), "Custom personality here.");
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "SOUL.md"), "utf-8");
    strictEqual(content, "Custom personality here.");
  });

  it("does not overwrite existing config.json", () => {
    writeFileSync(join(workDir, "config.json"), '{"custom": true}');
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "config.json"), "utf-8");
    strictEqual(content, '{"custom": true}');
  });

  it("appends missing entries to existing .gitignore", () => {
    writeFileSync(join(workDir, ".gitignore"), "node_modules/\n");
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, ".gitignore"), "utf-8");
    ok(content.includes("node_modules/"));
    ok(content.includes("ghostpaw.db"));
    ok(content.includes("# ghostpaw"));
  });

  it("skips .gitignore if all entries already present", () => {
    writeFileSync(
      join(workDir, ".gitignore"),
      "ghostpaw.db\nghostpaw.db-wal\nghostpaw.db-shm\n.ghostpaw/\n",
    );
    const result = initWorkspace(workDir);
    ok(result.skipped.some((p) => p.includes(".gitignore")));
  });
});

describe("initWorkspace - partial state", () => {
  it("creates only missing pieces", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "SOUL.md"), "Existing soul.");

    const result = initWorkspace(workDir);

    ok(result.skipped.some((p) => p.includes("agents")));
    ok(result.skipped.some((p) => p.includes("SOUL.md")));
    ok(result.created.some((p) => p.includes("skills")));
    ok(result.created.some((p) => p.includes(".ghostpaw")));
    ok(result.created.some((p) => p.includes("config.json")));
    ok(result.created.some((p) => p.includes(".gitignore")));
  });
});

describe("DEFAULT_SOUL", () => {
  it("is a non-empty string", () => {
    ok(DEFAULT_SOUL.length > 100);
  });

  it("contains key sections", () => {
    ok(DEFAULT_SOUL.includes("# Ghostpaw"));
    ok(DEFAULT_SOUL.includes("## Tools"));
    ok(DEFAULT_SOUL.includes("## Delegation"));
    ok(DEFAULT_SOUL.includes("## Workspace Structure"));
    ok(DEFAULT_SOUL.includes("## Guidelines"));
  });

  it("describes all core tools", () => {
    ok(DEFAULT_SOUL.includes("read"));
    ok(DEFAULT_SOUL.includes("write"));
    ok(DEFAULT_SOUL.includes("edit"));
    ok(DEFAULT_SOUL.includes("bash"));
    ok(DEFAULT_SOUL.includes("web_fetch"));
    ok(DEFAULT_SOUL.includes("web_search"));
    ok(DEFAULT_SOUL.includes("delegate"));
    ok(DEFAULT_SOUL.includes("check_run"));
  });

  it("documents workspace conventions", () => {
    ok(DEFAULT_SOUL.includes("SOUL.md"));
    ok(DEFAULT_SOUL.includes("config.json"));
    ok(DEFAULT_SOUL.includes("agents/"));
    ok(DEFAULT_SOUL.includes("skills/"));
    ok(DEFAULT_SOUL.includes("ghostpaw.db"));
  });
});
