import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { listTraits, MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import { addTrait } from "../../core/souls/api/write/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createExecuteLevelUpTool } from "./execute_level_up.ts";

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

describe("execute_level_up tool", () => {
  it("performs a level-up with all traits carried", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS.warden;
    const traits = listTraits(db, soulId, { status: "active" });
    const carriedIds = traits.map((t) => t.id);

    const tool = createExecuteLevelUpTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "Warden",
        new_essence: "Evolved Warden essence with deeper understanding.",
        consolidations_json: "[]",
        promoted_trait_ids_json: "[]",
        carried_trait_ids_json: JSON.stringify(carriedIds),
      },
      ctx: CTX,
    })) as { leveledUp: boolean; newLevel: number };
    strictEqual(result.leveledUp, true);
    strictEqual(result.newLevel, 1);
  });

  it("performs a level-up with consolidation", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS.mentor;
    const traits = listTraits(db, soulId, { status: "active" });

    if (traits.length < 2) {
      addTrait(db, soulId, { principle: "Extra A", provenance: "Test" });
      addTrait(db, soulId, { principle: "Extra B", provenance: "Test" });
    }

    const active = listTraits(db, soulId, { status: "active" });
    const toConsolidate = active.slice(0, 2);
    const toCarry = active.slice(2);

    const tool = createExecuteLevelUpTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "Mentor",
        new_essence: "Evolved mentor essence.",
        consolidations_json: JSON.stringify([
          {
            source_trait_ids: toConsolidate.map((t) => t.id),
            merged_principle: "Merged from consolidation",
            merged_provenance: "Consolidation of two traits during level-up",
          },
        ]),
        promoted_trait_ids_json: "[]",
        carried_trait_ids_json: JSON.stringify(toCarry.map((t) => t.id)),
      },
      ctx: CTX,
    })) as { leveledUp: boolean; newLevel: number };
    strictEqual(result.leveledUp, true);
    strictEqual(result.newLevel, 1);
  });

  it("returns error for unknown soul", async () => {
    const db = await setup();
    const tool = createExecuteLevelUpTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "Nobody",
        new_essence: "test",
        consolidations_json: "[]",
        promoted_trait_ids_json: "[]",
        carried_trait_ids_json: "[]",
      },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for empty essence", async () => {
    const db = await setup();
    const tool = createExecuteLevelUpTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "Warden",
        new_essence: "",
        consolidations_json: "[]",
        promoted_trait_ids_json: "[]",
        carried_trait_ids_json: "[]",
      },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("new_essence"));
  });

  it("returns error when traits not fully accounted for", async () => {
    const db = await setup();
    const tool = createExecuteLevelUpTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "Warden",
        new_essence: "New essence",
        consolidations_json: "[]",
        promoted_trait_ids_json: "[]",
        carried_trait_ids_json: "[]",
      },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("not accounted for"));
  });
});
