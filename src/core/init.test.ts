import { ok, strictEqual } from "node:assert";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ensureWorkspace, initWorkspace } from "./init.js";
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

    strictEqual(result.created.length, 9);
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

  it("writes valid JSON to config.json without providers", () => {
    initWorkspace(workDir);
    const raw = readFileSync(join(workDir, "config.json"), "utf-8");
    const config = JSON.parse(raw);
    ok(config.models);
    ok(config.costControls);
    ok(!("providers" in config));
  });

  it("config.json includes default model", () => {
    initWorkspace(workDir);
    const config = JSON.parse(readFileSync(join(workDir, "config.json"), "utf-8"));
    strictEqual(config.models.default, "claude-sonnet-4-6");
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
    strictEqual(result.skipped.length, 9);
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

describe("default skills", () => {
  it("creates skill-craft.md and skill-training.md in skills/", () => {
    initWorkspace(workDir);
    ok(existsSync(join(workDir, "skills", "skill-craft.md")));
    ok(existsSync(join(workDir, "skills", "skill-training.md")));
  });

  it("skill-craft.md contains key sections", () => {
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "skills", "skill-craft.md"), "utf-8");
    ok(content.includes("# Skill Craft"));
    ok(content.includes("## When to Create a Skill"));
    ok(content.includes("## Skill Structure"));
    ok(content.includes("## Companion Scripts"));
    ok(content.includes("## Evolving Skills"));
    ok(content.includes("## Anti-Patterns"));
  });

  it("skill-training.md contains key sections", () => {
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "skills", "skill-training.md"), "utf-8");
    ok(content.includes("# Skill Training"));
    ok(content.includes("## Step 1: Check Growth Status"));
    ok(content.includes("## Step 5: Identify Gaps"));
    ok(content.includes("## Step 7: Summarize"));
    ok(content.includes("## Skill History"));
    ok(content.includes("## When to Train"));
  });

  it("creates skill-scout.md in skills/", () => {
    initWorkspace(workDir);
    ok(existsSync(join(workDir, "skills", "skill-scout.md")));
  });

  it("skill-scout.md contains key sections", () => {
    initWorkspace(workDir);
    const content = readFileSync(join(workDir, "skills", "skill-scout.md"), "utf-8");
    ok(content.includes("# Skill Scout"));
    ok(content.includes("## What Scouting Is"));
    ok(content.includes("## Step 5: Trail Report"));
    ok(content.includes("## Anti-Patterns"));
  });

  it("does not overwrite existing skill files", () => {
    mkdirSync(join(workDir, "skills"), { recursive: true });
    writeFileSync(join(workDir, "skills", "skill-craft.md"), "Custom craft.");
    writeFileSync(join(workDir, "skills", "skill-training.md"), "Custom training.");
    writeFileSync(join(workDir, "skills", "skill-scout.md"), "Custom scout.");
    initWorkspace(workDir);
    strictEqual(readFileSync(join(workDir, "skills", "skill-craft.md"), "utf-8"), "Custom craft.");
    strictEqual(
      readFileSync(join(workDir, "skills", "skill-training.md"), "utf-8"),
      "Custom training.",
    );
    strictEqual(readFileSync(join(workDir, "skills", "skill-scout.md"), "utf-8"), "Custom scout.");
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

describe("ensureWorkspace", () => {
  it("scaffolds a fresh directory and creates config.json", async () => {
    // Provide a fake API key so it doesn't prompt
    const orig = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-fake-key";
    try {
      await ensureWorkspace(workDir);
      ok(existsSync(join(workDir, "config.json")));
      ok(existsSync(join(workDir, "SOUL.md")));
      ok(existsSync(join(workDir, "agents")));
      ok(existsSync(join(workDir, "skills")));
    } finally {
      if (orig === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it("is idempotent — second call does not fail or re-create", async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-fake-key";
    try {
      await ensureWorkspace(workDir);
      const configBefore = readFileSync(join(workDir, "config.json"), "utf-8");
      await ensureWorkspace(workDir);
      const configAfter = readFileSync(join(workDir, "config.json"), "utf-8");
      strictEqual(configBefore, configAfter);
    } finally {
      if (orig === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it("skips scaffold when config.json already exists", async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-fake-key";
    try {
      writeFileSync(join(workDir, "config.json"), '{"custom": true}');
      await ensureWorkspace(workDir);
      const content = readFileSync(join(workDir, "config.json"), "utf-8");
      strictEqual(content, '{"custom": true}');
    } finally {
      if (orig === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = orig;
    }
  });
});
