import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables, initHowlTables } from "../core/chat/runtime/index.ts";
import { initConfigTable } from "../core/config/runtime/index.ts";
import { initMemoryTable } from "../core/memory/runtime/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import { initQuestTables } from "../core/quests/runtime/index.ts";
import { initSecretsTable } from "../core/secrets/runtime/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../core/souls/runtime/index.ts";
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
  initPackTables(db);
  initHowlTables(db);
  initQuestTables(db);
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
  "grep",
  "howl",
  "ls",
  "mcp",
  "read",
  "sense",
  "web_fetch",
  "web_search",
  "write",
];

const EXPECTED_WARDEN_TOOLS = [
  "contact_add",
  "contact_list",
  "contact_lookup",
  "contact_remove",
  "datetime",
  "forget",
  "pack_bond",
  "pack_link",
  "pack_meet",
  "pack_merge",
  "pack_note",
  "pack_sense",
  "quest_accept",
  "quest_create",
  "quest_dismiss",
  "quest_done",
  "quest_list",
  "quest_update",
  "storyline_create",
  "storyline_list",
  "recall",
  "recall_haunts",
  "remember",
  "revise",
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
  "absorb_fragment",
  "checkpoint_skills",
  "create_skill",
  "review_skills",
  "rollback_skill",
  "skill_diff",
  "skill_history",
  "validate_skills",
];

const EXPECTED_CHAMBERLAIN_TOOLS = [
  "calc",
  "cost_check",
  "cost_summary",
  "datetime",
  "get_config",
  "list_config",
  "list_secrets",
  "remove_secret",
  "reset_config",
  "schedule_create",
  "schedule_delete",
  "schedule_list",
  "schedule_update",
  "set_config",
  "set_secret",
  "undo_config",
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

  it("allToolsWithMentor includes shared tools but not coordinator-only tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const allNames = new Set(sets.allToolsWithMentor.map((t) => t.name));
    for (const shared of [
      "read",
      "write",
      "edit",
      "ls",
      "grep",
      "bash",
      "web_fetch",
      "web_search",
      "mcp",
      "calc",
      "datetime",
      "sense",
    ]) {
      ok(allNames.has(shared), `${shared} should be in allToolsWithMentor`);
    }
    ok(!allNames.has("howl"), "howl should not be in allToolsWithMentor (coordinator-only)");
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

  it("allToolsWithTrainer includes shared tools but not coordinator-only tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const allNames = new Set(sets.allToolsWithTrainer.map((t) => t.name));
    for (const shared of [
      "read",
      "write",
      "edit",
      "ls",
      "grep",
      "bash",
      "web_fetch",
      "web_search",
      "mcp",
      "calc",
      "datetime",
      "sense",
    ]) {
      ok(allNames.has(shared), `${shared} should be in allToolsWithTrainer`);
    }
    ok(!allNames.has("howl"), "howl should not be in allToolsWithTrainer (coordinator-only)");
  });

  it("trainerTools has exactly 8 tools", () => {
    const sets = createEntityToolSets(mockConfig());
    strictEqual(sets.trainerTools.length, 8);
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

  it("wardenTools has correct count", () => {
    const sets = createEntityToolSets(mockConfig());
    strictEqual(sets.wardenTools.length, EXPECTED_WARDEN_TOOLS.length);
  });

  it("wardenTools has correct names", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.wardenTools.map((t) => t.name).sort();
    deepStrictEqual(names, [...EXPECTED_WARDEN_TOOLS].sort());
  });

  it("wardenTools excludes filesystem, web, and delegation tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = new Set(sets.wardenTools.map((t) => t.name));
    for (const excluded of [
      "read",
      "write",
      "edit",
      "ls",
      "grep",
      "bash",
      "web_fetch",
      "web_search",
      "mcp",
      "delegate",
      "check_run",
    ]) {
      ok(!names.has(excluded), `${excluded} should not be in wardenTools`);
    }
  });

  it("baseTools excludes persistence tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = new Set(sets.baseTools.map((t) => t.name));
    for (const excluded of [
      "recall",
      "remember",
      "revise",
      "forget",
      "pack_sense",
      "pack_meet",
      "pack_bond",
      "pack_link",
      "pack_note",
      "pack_merge",
      "contact_add",
      "contact_remove",
      "contact_list",
      "contact_lookup",
      "quest_create",
      "quest_update",
      "quest_done",
      "quest_list",
      "quest_accept",
      "quest_dismiss",
      "storyline_create",
      "storyline_list",
      "recall_haunts",
    ]) {
      ok(!names.has(excluded), `${excluded} should not be in baseTools`);
    }
  });

  it("baseTools excludes infrastructure tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = new Set(sets.baseTools.map((t) => t.name));
    for (const excluded of [
      "get_config",
      "list_config",
      "set_config",
      "undo_config",
      "reset_config",
      "list_secrets",
      "set_secret",
      "remove_secret",
    ]) {
      ok(!names.has(excluded), `${excluded} should not be in baseTools`);
    }
  });

  it("chamberlainTools has correct count", () => {
    const sets = createEntityToolSets(mockConfig());
    strictEqual(sets.chamberlainTools.length, EXPECTED_CHAMBERLAIN_TOOLS.length);
  });

  it("chamberlainTools has correct names", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = sets.chamberlainTools.map((t) => t.name).sort();
    deepStrictEqual(names, [...EXPECTED_CHAMBERLAIN_TOOLS].sort());
  });

  it("chamberlainTools excludes filesystem, web, and delegation tools", () => {
    const sets = createEntityToolSets(mockConfig());
    const names = new Set(sets.chamberlainTools.map((t) => t.name));
    for (const excluded of [
      "read",
      "write",
      "edit",
      "ls",
      "grep",
      "bash",
      "web_fetch",
      "web_search",
      "mcp",
      "delegate",
      "check_run",
    ]) {
      ok(!names.has(excluded), `${excluded} should not be in chamberlainTools`);
    }
  });
});
