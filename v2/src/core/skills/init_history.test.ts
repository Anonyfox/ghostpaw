import { describe, it, beforeEach, afterEach } from "node:test";
import { strictEqual } from "node:assert";
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { initHistory } from "./init_history.ts";
import { hasHistory, gitDir, resetGitAvailableCache } from "./git.ts";

let workspace: string;

beforeEach(() => {
  resetGitAvailableCache();
  workspace = mkdtempSync(join(tmpdir(), "ghostpaw-init-history-"));
  mkdirSync(join(workspace, "skills"), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("initHistory", () => {
  it("initializes a new skill history repo", () => {
    strictEqual(hasHistory(workspace), false);
    strictEqual(initHistory(workspace), true);
    strictEqual(hasHistory(workspace), true);
  });

  it("is idempotent — safe to call multiple times", () => {
    strictEqual(initHistory(workspace), true);
    strictEqual(initHistory(workspace), true);
    strictEqual(hasHistory(workspace), true);
  });

  it("removes the .git file from skills/", () => {
    initHistory(workspace);
    const gitLink = join(workspace, "skills", ".git");
    strictEqual(existsSync(gitLink), false);
  });

  it("configures local git identity", () => {
    initHistory(workspace);
    const dir = gitDir(workspace);
    const name = execFileSync("git", [`--git-dir=${dir}`, "config", "user.name"], {
      encoding: "utf-8",
    }).trim();
    const email = execFileSync("git", [`--git-dir=${dir}`, "config", "user.email"], {
      encoding: "utf-8",
    }).trim();
    strictEqual(name, "ghostpaw");
    strictEqual(email, "ghostpaw@local");
  });

  it("writes exclude patterns to git info/exclude", () => {
    initHistory(workspace);
    const excludePath = join(gitDir(workspace), "info", "exclude");
    strictEqual(existsSync(excludePath), true);
    const content = readFileSync(excludePath, "utf-8");
    strictEqual(content.includes(".DS_Store"), true);
    strictEqual(content.includes("node_modules"), true);
  });
});
