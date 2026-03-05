import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../core/chat/index.ts";
import { initConfigTable } from "../core/config/index.ts";
import { initMemoryTable } from "../core/memory/index.ts";
import { initRunsTable } from "../core/runs/index.ts";
import { initSecretsTable } from "../core/secrets/index.ts";
import { initPackTables } from "../core/pack/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { createEntityToolSets } from "./tools.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initConfigTable(db);
  initMemoryTable(db);
  initSecretsTable(db);
  initRunsTable(db);
  initPackTables(db);
  ensureMandatorySouls(db);
});

afterEach(() => {
  db.close();
});

const EXPECTED_BASE_TOOLS = [
  "bash",
  "calc",
  "check_run",
  "datetime",
  "delegate",
  "edit",
  "forget",
  "get_config",
  "grep",
  "list_config",
  "list_secrets",
  "ls",
  "mcp",
  "pack_bond",
  "pack_meet",
  "pack_note",
  "pack_sense",
  "read",
  "recall",
  "remember",
  "remove_secret",
  "reset_config",
  "revise",
  "sense",
  "set_config",
  "set_secret",
  "undo_config",
  "web_fetch",
  "web_search",
  "write",
];

const MENTOR_TOOL_NAMES = [
  "execute_level_up",
  "propose_trait",
  "reactivate_trait",
  "revert_level_up",
  "revert_trait",
  "review_soul",
  "revise_trait",
];

const TRAINER_TOOL_NAMES = [
  "checkpoint_skills",
  "create_skill",
  "review_skills",
  "rollback_skill",
  "skill_diff",
  "skill_history",
  "validate_skills",
];

function mockConfig() {
  return {
    db,
    workspace: "/tmp/test-workspace",
    chatFactory: () => ({}) as never,
    getParentSessionId: () => null,
  };
}

describe("createEntityToolSets baseTools", () => {
  it("returns the correct number of base tools", () => {
    const { baseTools } = createEntityToolSets(mockConfig());
    strictEqual(baseTools.length, EXPECTED_BASE_TOOLS.length);
  });

  it("every tool has a non-empty name", () => {
    const { baseTools } = createEntityToolSets(mockConfig());
    for (const tool of baseTools) {
      ok(tool.name, "Tool has a name");
      ok(tool.name.length > 0, "Tool name is non-empty");
    }
  });

  it("no duplicate names", () => {
    const { baseTools } = createEntityToolSets(mockConfig());
    const names = baseTools.map((t) => t.name);
    strictEqual(new Set(names).size, names.length);
  });

  it("tool names match expected set", () => {
    const { baseTools } = createEntityToolSets(mockConfig());
    const names = baseTools.map((t) => t.name).sort();
    deepStrictEqual(names, [...EXPECTED_BASE_TOOLS].sort());
  });
});

describe("createEntityToolSets", () => {
  it("baseTools excludes mentor-only tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.baseTools.map((t) => t.name).sort();
    for (const mentorName of MENTOR_TOOL_NAMES) {
      ok(!names.includes(mentorName), `${mentorName} should not be in baseTools`);
    }
  });

  it("allToolsWithMentor includes mentor tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.allToolsWithMentor.map((t) => t.name).sort();
    for (const mentorName of MENTOR_TOOL_NAMES) {
      ok(names.includes(mentorName), `${mentorName} should be in allToolsWithMentor`);
    }
  });

  it("allToolsWithMentor also includes all base tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const allNames = sets.allToolsWithMentor.map((t) => t.name);
    const baseNames = sets.baseTools.map((t) => t.name);
    for (const baseName of baseNames) {
      ok(allNames.includes(baseName), `${baseName} should be in allToolsWithMentor`);
    }
  });

  it("mentorTools has exactly 7 tools", () => {
    const sets = createEntityToolSets(mockConfig());
    strictEqual(sets.mentorTools.length, 7);
    const names = sets.mentorTools.map((t) => t.name).sort();
    deepStrictEqual(names, MENTOR_TOOL_NAMES);
  });

  it("baseTools excludes trainer-only tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.baseTools.map((t) => t.name).sort();
    for (const trainerName of TRAINER_TOOL_NAMES) {
      ok(!names.includes(trainerName), `${trainerName} should not be in baseTools`);
    }
  });

  it("allToolsWithTrainer includes trainer tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.allToolsWithTrainer.map((t) => t.name).sort();
    for (const trainerName of TRAINER_TOOL_NAMES) {
      ok(names.includes(trainerName), `${trainerName} should be in allToolsWithTrainer`);
    }
  });

  it("allToolsWithTrainer also includes all base tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const allNames = sets.allToolsWithTrainer.map((t) => t.name);
    const baseNames = sets.baseTools.map((t) => t.name);
    for (const baseName of baseNames) {
      ok(allNames.includes(baseName), `${baseName} should be in allToolsWithTrainer`);
    }
  });

  it("trainerTools has exactly 7 tools", () => {
    const sets = createEntityToolSets(mockConfig());
    strictEqual(sets.trainerTools.length, 7);
    const names = sets.trainerTools.map((t) => t.name).sort();
    deepStrictEqual(names, TRAINER_TOOL_NAMES);
  });

  it("allToolsWithTrainer excludes mentor tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.allToolsWithTrainer.map((t) => t.name).sort();
    for (const mentorName of MENTOR_TOOL_NAMES) {
      ok(!names.includes(mentorName), `${mentorName} should not be in allToolsWithTrainer`);
    }
  });

  it("allToolsWithMentor excludes trainer tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.allToolsWithMentor.map((t) => t.name).sort();
    for (const trainerName of TRAINER_TOOL_NAMES) {
      ok(!names.includes(trainerName), `${trainerName} should not be in allToolsWithMentor`);
    }
  });
});
