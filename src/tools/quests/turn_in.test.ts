import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { initQuestTables } from "../../core/quests/runtime/index.ts";
import { initSkillFragmentsTables } from "../../core/skills/runtime/index.ts";
import { initSoulShardTables, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createQuestTurnInTool } from "./turn_in.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
  initChatTables(db);
  initSoulsTables(db);
  initSoulShardTables(db);
  initSkillFragmentsTables(db);
});

afterEach(() => {
  db.close();
});

function createDoneQuest(title: string): number {
  const now = Date.now();
  db.prepare(
    "INSERT INTO quests (title, status, priority, created_at, created_by, updated_at, completed_at) VALUES (?, 'done', 'normal', ?, 'human', ?, ?)",
  ).run(title, now, now, now);
  return Number((db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id);
}

describe("quest_turnin tool", () => {
  it("turns in a done quest and returns summary", async () => {
    const id = createDoneQuest("Ship feature");
    const tool = createQuestTurnInTool(db);

    const result = (await tool.execute({
      args: { id },
      ctx: { model: "test", provider: "test" },
    })) as { quest: Record<string, unknown>; revealedShards: number; fragmentDropped: boolean };

    strictEqual((result.quest as { status: string }).status, "turned_in");
    strictEqual(result.revealedShards, 0);
    strictEqual(result.fragmentDropped, true);
  });

  it("rejects active quest", async () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, priority, created_at, created_by, updated_at) VALUES (?, 'active', 'normal', ?, 'human', ?)",
    ).run("Active one", now, now);
    const id = Number((db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id);

    const tool = createQuestTurnInTool(db);
    const result = (await tool.execute({
      args: { id },
      ctx: { model: "test", provider: "test" },
    })) as { error: string };

    strictEqual(result.error.includes("active"), true);
  });

  it("rejects already turned_in quest", async () => {
    const id = createDoneQuest("Already done");
    const tool = createQuestTurnInTool(db);

    await tool.execute({ args: { id }, ctx: { model: "test", provider: "test" } });
    const result = (await tool.execute({
      args: { id },
      ctx: { model: "test", provider: "test" },
    })) as { error: string };

    strictEqual(result.error.includes("turned_in"), true);
  });

  it("rejects nonexistent quest", async () => {
    const tool = createQuestTurnInTool(db);
    const result = (await tool.execute({
      args: { id: 999 },
      ctx: { model: "test", provider: "test" },
    })) as { error: string };

    strictEqual(result.error.includes("not found"), true);
  });
});
