import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { VALIDATION_SEVERITIES } from "./types.ts";
import type {
  Skill,
  SkillFrontmatter,
  SkillSummary,
  SkillIndexEntry,
  CheckpointResult,
  SkillPendingChanges,
  PendingChangesResult,
  ValidationIssue,
  ValidationResult,
  RepairAction,
  RepairResult,
  HistoryEntry,
  GitResult,
  CreateSkillInput,
} from "./types.ts";

describe("types", () => {
  it("exports VALIDATION_SEVERITIES as a readonly tuple", () => {
    deepStrictEqual([...VALIDATION_SEVERITIES], ["error", "warning", "info"]);
    strictEqual(VALIDATION_SEVERITIES.length, 3);
  });

  it("allows constructing well-typed domain objects", () => {
    const fm: SkillFrontmatter = {
      name: "test",
      description: "A test skill",
      raw: { name: "test", description: "A test skill" },
    };
    strictEqual(fm.name, "test");

    const skill: Skill = {
      name: "test",
      description: "A test skill",
      frontmatter: fm,
      body: "# Test\nSome body.",
      files: { scripts: [], references: [], assets: [], other: [] },
      path: "skills/test",
      skillMdPath: "skills/test/SKILL.md",
    };
    strictEqual(skill.path, "skills/test");

    const summary: SkillSummary = {
      name: "test",
      description: "A test skill",
      rank: 3,
      hasPendingChanges: false,
      fileCount: 1,
      bodyLines: 2,
    };
    strictEqual(summary.rank, 3);

    const entry: SkillIndexEntry = { name: "test", description: "A test skill" };
    strictEqual(entry.description, "A test skill");

    const cr: CheckpointResult = { committed: true, skills: ["test"], message: "init" };
    strictEqual(cr.committed, true);

    const pc: SkillPendingChanges = {
      name: "test",
      created: [],
      modified: ["SKILL.md"],
      deleted: [],
      totalChanges: 1,
    };
    strictEqual(pc.totalChanges, 1);

    const pcr: PendingChangesResult = { skills: [pc], untracked: [], totalChanges: 1 };
    strictEqual(pcr.totalChanges, 1);

    const vi: ValidationIssue = {
      severity: "error",
      code: "missing-skill-md",
      message: "No SKILL.md found",
      autoFixable: true,
    };
    strictEqual(vi.autoFixable, true);

    const vr: ValidationResult = {
      name: "test",
      path: "skills/test",
      valid: false,
      issues: [vi],
    };
    strictEqual(vr.valid, false);

    const ra: RepairAction = { code: "create-skill-md", description: "Created SKILL.md", applied: true };
    strictEqual(ra.applied, true);

    const rr: RepairResult = { name: "test", actions: [ra], remainingIssues: [] };
    strictEqual(rr.remainingIssues.length, 0);

    const he: HistoryEntry = { hash: "abc123", message: "checkpoint" };
    strictEqual(he.hash, "abc123");

    const gr: GitResult = { stdout: "", ok: true };
    strictEqual(gr.ok, true);

    const ci: CreateSkillInput = { name: "test", description: "A test skill" };
    strictEqual(ci.name, "test");
  });
});
