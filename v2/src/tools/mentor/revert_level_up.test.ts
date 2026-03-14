import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { listTraits, MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import { addTrait, levelUp } from "../../core/souls/api/write/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createRevertLevelUpTool } from "./revert_level_up.ts";

const CTX = { model: "test", provider: "test" };

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

describe("revert_level_up tool", () => {
  it("reverts the most recent level-up", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    addTrait(db, soulId, {
      principle: "Test trait for level-up",
      provenance: "Test evidence",
    });
    const allActive = listTraits(db, soulId, { status: "active" });
    const allIds = allActive.map((t) => t.id);
    levelUp(db, soulId, {
      newEssence: "Evolved essence text.",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: allIds,
    });

    const tool = createRevertLevelUpTool(db);
    const result = (await tool.execute({
      args: { soul_name: "JS Engineer" },
      ctx: CTX,
    })) as { reverted: boolean; soulName: string; newLevel: number };
    strictEqual(result.reverted, true);
    strictEqual(result.soulName, "JS Engineer");
    ok(result.newLevel >= 0);
  });

  it("returns error for unknown soul", async () => {
    const db = await setup();
    const tool = createRevertLevelUpTool(db);
    const result = (await tool.execute({
      args: { soul_name: "Nobody" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for soul at base level", async () => {
    const db = await setup();
    const tool = createRevertLevelUpTool(db);
    const result = (await tool.execute({
      args: { soul_name: "JS Engineer" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.length > 0);
  });

  it("returns error for empty soul_name", async () => {
    const db = await setup();
    const tool = createRevertLevelUpTool(db);
    const result = (await tool.execute({ args: { soul_name: "" }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error.includes("must not be empty"));
  });
});
