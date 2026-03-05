import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initRunsTable } from "../../core/runs/index.ts";
import {
  addTrait,
  ensureMandatorySouls,
  initSoulsTables,
  MANDATORY_SOUL_IDS,
} from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createRevertTraitTool } from "./revert_trait.ts";

const CTX = { model: "test", provider: "test" };

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initMemoryTable(db);
  initRunsTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

describe("revert_trait tool", () => {
  it("reverts an active trait", async () => {
    const db = await setup();
    const trait = addTrait(db, MANDATORY_SOUL_IDS["js-engineer"], {
      principle: "To be reverted",
      provenance: "Testing evidence",
    });
    const tool = createRevertTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: trait.id }, ctx: CTX })) as {
      reverted: boolean;
      status: string;
    };
    strictEqual(result.reverted, true);
    strictEqual(result.status, "reverted");
  });

  it("returns error for non-existent trait", async () => {
    const db = await setup();
    const tool = createRevertTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: 99999 }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error.includes("not found"));
  });

  it("returns error for already reverted trait", async () => {
    const db = await setup();
    const trait = addTrait(db, MANDATORY_SOUL_IDS["js-engineer"], {
      principle: "Will be reverted",
      provenance: "Testing",
    });
    db.prepare("UPDATE soul_traits SET status = 'reverted', updated_at = ? WHERE id = ?").run(
      Date.now(),
      trait.id,
    );
    const tool = createRevertTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: trait.id }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error.includes("not active"));
  });

  it("returns error for invalid trait_id", async () => {
    const db = await setup();
    const tool = createRevertTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: 0 }, ctx: CTX })) as { error: string };
    ok(result.error.includes("positive integer"));
  });
});
