import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import { addTrait } from "../../core/souls/api/write/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createReviseTraitTool } from "./revise_trait.ts";

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

describe("revise_trait tool", () => {
  it("revises principle of an active trait", async () => {
    const db = await setup();
    const trait = addTrait(db, MANDATORY_SOUL_IDS["js-engineer"], {
      principle: "Old principle",
      provenance: "Original evidence",
    });
    const tool = createReviseTraitTool(db);
    const result = (await tool.execute({
      args: { trait_id: trait.id, principle: "Revised principle" },
      ctx: CTX,
    })) as { revised: boolean; principle: string };
    strictEqual(result.revised, true);
    strictEqual(result.principle, "Revised principle");
  });

  it("returns error for non-existent trait", async () => {
    const db = await setup();
    const tool = createReviseTraitTool(db);
    const result = (await tool.execute({
      args: { trait_id: 99999, principle: "New" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error when neither principle nor provenance provided", async () => {
    const db = await setup();
    const tool = createReviseTraitTool(db);
    const result = (await tool.execute({
      args: { trait_id: 1 },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("At least one"));
  });

  it("returns error for invalid trait_id", async () => {
    const db = await setup();
    const tool = createReviseTraitTool(db);
    const result = (await tool.execute({
      args: { trait_id: -1, principle: "New" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("positive integer"));
  });
});
