import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import {
  addTrait,
  ensureMandatorySouls,
  initSoulsTables,
  MANDATORY_SOUL_IDS,
} from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createReactivateTraitTool } from "./reactivate_trait.ts";

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

describe("reactivate_trait tool", () => {
  it("reactivates a reverted trait", async () => {
    const db = await setup();
    const trait = addTrait(db, MANDATORY_SOUL_IDS["js-engineer"], {
      principle: "Will be reverted then reactivated",
      provenance: "Testing",
    });
    db.prepare("UPDATE soul_traits SET status = 'reverted', updated_at = ? WHERE id = ?").run(
      Date.now(),
      trait.id,
    );
    const tool = createReactivateTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: trait.id }, ctx: CTX })) as {
      reactivated: boolean;
      status: string;
    };
    strictEqual(result.reactivated, true);
    strictEqual(result.status, "active");
  });

  it("returns error for already active trait", async () => {
    const db = await setup();
    const trait = addTrait(db, MANDATORY_SOUL_IDS["js-engineer"], {
      principle: "Already active",
      provenance: "Testing",
    });
    const tool = createReactivateTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: trait.id }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error.includes("already active"));
  });

  it("returns error for non-existent trait", async () => {
    const db = await setup();
    const tool = createReactivateTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: 99999 }, ctx: CTX })) as {
      error: string;
    };
    ok(result.error.includes("not found"));
  });

  it("returns error for invalid trait_id", async () => {
    const db = await setup();
    const tool = createReactivateTraitTool(db);
    const result = (await tool.execute({ args: { trait_id: 0 }, ctx: CTX })) as { error: string };
    ok(result.error.includes("positive integer"));
  });
});
