import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createMemoryStore, type MemoryStore } from "../core/memory.js";
import { createSessionStore, type SessionStore } from "../core/session.js";
import { commitSkills, initHistory, isGitAvailable } from "../lib/skill-history.js";
import { createSkillsTool } from "./skills.js";

let workDir: string;
let db: GhostpawDatabase;
let sessions: SessionStore;
let memory: MemoryStore;

function exec(tool: ReturnType<typeof createSkillsTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as Parameters<ReturnType<typeof createSkillsTool>["execute"]>[0]);
}

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-skills-tool-"));
  mkdirSync(join(workDir, "skills"), { recursive: true });
  mkdirSync(join(workDir, ".ghostpaw"), { recursive: true });
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  memory = createMemoryStore(db);
});

afterEach(() => {
  db.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe("skills tool - metadata", () => {
  it("has correct name", () => {
    const tool = createSkillsTool(workDir);
    strictEqual(tool.name, "skills");
    ok(tool.description.includes("skill"));
  });
});

describe("skills tool - list", () => {
  it("returns empty list for empty skills dir", async () => {
    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "list" })) as { skills: unknown[]; total: number };
    strictEqual(result.total, 0);
    deepStrictEqual(result.skills, []);
  });

  it("lists skills with titles, paths, and line counts", async () => {
    writeFileSync(
      join(workDir, "skills", "deploy.md"),
      "# Deploy to Vercel\n\nSteps here\nMore steps",
    );
    writeFileSync(join(workDir, "skills", "testing.md"), "# Testing Strategy\n\nRun tests");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "list" })) as {
      skills: { filename: string; path: string; title: string; rank: number; lines: number }[];
      total: number;
    };

    strictEqual(result.total, 2);
    strictEqual(result.skills[0].filename, "deploy.md");
    strictEqual(result.skills[0].path, "skills/deploy.md");
    strictEqual(result.skills[0].title, "Deploy to Vercel");
    strictEqual(result.skills[0].lines, 4);
    strictEqual(result.skills[1].filename, "testing.md");
    strictEqual(result.skills[1].path, "skills/testing.md");
  });

  it("includes rank when git history exists", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV1");
    commitSkills(workDir, "v1");
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV2");
    commitSkills(workDir, "v2");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "list" })) as {
      skills: { filename: string; rank: number }[];
    };

    strictEqual(result.skills[0].rank, 2);
  });

  it("returns rank 0 when no git history", async () => {
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nSteps");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "list" })) as {
      skills: { filename: string; rank: number }[];
    };

    strictEqual(result.skills[0].rank, 0);
  });
});

describe("skills tool - rank", () => {
  it("returns error without filename", async () => {
    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "rank" })) as { error: string };
    ok(result.error.includes("filename"));
  });

  it("returns rank for a tracked file", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nV1");
    commitSkills(workDir, "v1");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "rank", filename: "deploy.md" })) as {
      filename: string;
      title: string;
      rank: number;
    };

    strictEqual(result.filename, "deploy.md");
    strictEqual(result.title, "Deploy");
    strictEqual(result.rank, 1);
  });

  it("returns rank 0 and (not found) for missing file", async () => {
    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "rank", filename: "nope.md" })) as {
      title: string;
      rank: number;
    };

    strictEqual(result.title, "(not found)");
    strictEqual(result.rank, 0);
  });

  it("strips skills/ prefix from filename", async () => {
    writeFileSync(join(workDir, "skills", "deploy.md"), "# Deploy\nSteps");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "rank", filename: "skills/deploy.md" })) as {
      filename: string;
      title: string;
    };

    strictEqual(result.filename, "deploy.md");
    strictEqual(result.title, "Deploy");
  });
});

describe("skills tool - history", () => {
  it("returns history for all skills", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "add a");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "history" })) as {
      entries: string[];
      total: number;
    };

    ok(result.total >= 1);
    ok(result.entries.some((e) => e.includes("add a")));
  });

  it("returns history for a specific file", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    commitSkills(workDir, "add a");
    writeFileSync(join(workDir, "skills", "b.md"), "# B");
    commitSkills(workDir, "add b");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "history", filename: "a.md" })) as {
      entries: string[];
    };

    ok(result.entries.some((e) => e.includes("add a")));
    ok(!result.entries.some((e) => e.includes("add b")));
  });

  it("returns empty without history", async () => {
    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "history" })) as {
      entries: string[];
      total: number;
    };
    strictEqual(result.total, 0);
  });
});

describe("skills tool - diff", () => {
  it("shows uncommitted changes", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "existing.md"), "# Existing");
    commitSkills(workDir, "baseline");

    writeFileSync(join(workDir, "skills", "new.md"), "# New Skill");
    writeFileSync(join(workDir, "skills", "existing.md"), "# Existing\nUpdated");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "diff" })) as {
      tracked: boolean;
      created: string[];
      updated: string[];
      deleted: string[];
      totalChanges: number;
    };

    ok(result.tracked);
    ok(result.created.includes("new.md"));
    ok(result.updated.includes("existing.md"));
    strictEqual(result.totalChanges, 2);
  });

  it("returns tracked: false without history", async () => {
    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "diff" })) as { tracked: boolean };
    strictEqual(result.tracked, false);
  });

  it("shows no changes when clean", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "stable.md"), "# Stable");
    commitSkills(workDir, "baseline");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "diff" })) as {
      tracked: boolean;
      totalChanges: number;
    };

    ok(result.tracked);
    strictEqual(result.totalChanges, 0);
  });
});

describe("skills tool - status", () => {
  it("returns skill count and average rank", async () => {
    writeFileSync(join(workDir, "skills", "a.md"), "# A");
    writeFileSync(join(workDir, "skills", "b.md"), "# B");

    const tool = createSkillsTool({ workspacePath: workDir, sessions, memory });
    const result = (await exec(tool, { action: "status" })) as Record<string, unknown>;

    strictEqual(result.skills_count, 2);
    strictEqual(typeof result.average_rank, "number");
    strictEqual(typeof result.uncommitted_changes, "number");
  });

  it("includes unabsorbed session count", async () => {
    const s1 = sessions.createSession("s1");
    sessions.addMessage(s1.id, { role: "user", content: "hello" });
    const s2 = sessions.createSession("s2");
    sessions.addMessage(s2.id, { role: "user", content: "world" });

    const tool = createSkillsTool({ workspacePath: workDir, sessions, memory });
    const result = (await exec(tool, { action: "status" })) as Record<string, unknown>;

    strictEqual(result.unabsorbed_sessions, 2);
  });

  it("includes memory count", async () => {
    memory.store("learning 1", [], { source: "absorbed" });
    memory.store("learning 2", [], { source: "manual" });

    const tool = createSkillsTool({ workspacePath: workDir, sessions, memory });
    const result = (await exec(tool, { action: "status" })) as Record<string, unknown>;

    strictEqual(result.memories_total, 2);
  });

  it("works without sessions or memory stores", async () => {
    writeFileSync(join(workDir, "skills", "a.md"), "# A");

    const tool = createSkillsTool(workDir);
    const result = (await exec(tool, { action: "status" })) as Record<string, unknown>;

    strictEqual(result.skills_count, 1);
    strictEqual(result.unabsorbed_sessions, undefined);
    strictEqual(result.memories_total, undefined);
  });

  it("average rank reflects git history", async () => {
    if (!isGitAvailable()) return;

    initHistory(workDir);
    writeFileSync(join(workDir, "skills", "a.md"), "# A\nv1");
    commitSkills(workDir, "v1");
    writeFileSync(join(workDir, "skills", "a.md"), "# A\nv2");
    commitSkills(workDir, "v2");
    writeFileSync(join(workDir, "skills", "b.md"), "# B\nv1");
    commitSkills(workDir, "add b");

    const tool = createSkillsTool({ workspacePath: workDir, sessions, memory });
    const result = (await exec(tool, { action: "status" })) as Record<string, unknown>;

    // a.md has rank 2 (2 commits), b.md has rank 1 (1 commit), average = 1.5
    strictEqual(result.average_rank, 1.5);
  });
});
