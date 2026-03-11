import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createProposeTraitTool } from "./propose_trait.ts";

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

describe("propose_trait tool", () => {
  it("adds a trait to a known soul", async () => {
    const db = await setup();
    const tool = createProposeTraitTool(db);
    const result = (await tool.execute({
      args: {
        soul_name: "JS Engineer",
        principle: "Always validate function arguments before processing.",
        provenance: "Observed repeated crashes from unchecked null inputs in delegation run #12.",
      },
      ctx: CTX,
    })) as { added: boolean; traitId: number; soulName: string };
    strictEqual(result.added, true);
    ok(result.traitId > 0);
    strictEqual(result.soulName, "JS Engineer");
  });

  it("returns error for unknown soul", async () => {
    const db = await setup();
    const tool = createProposeTraitTool(db);
    const result = (await tool.execute({
      args: { soul_name: "Nobody", principle: "Test", provenance: "Test" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("not found"));
  });

  it("returns error for empty principle", async () => {
    const db = await setup();
    const tool = createProposeTraitTool(db);
    const result = (await tool.execute({
      args: { soul_name: "JS Engineer", principle: "", provenance: "test" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("principle"));
  });

  it("returns error for empty provenance", async () => {
    const db = await setup();
    const tool = createProposeTraitTool(db);
    const result = (await tool.execute({
      args: { soul_name: "JS Engineer", principle: "test", provenance: "" },
      ctx: CTX,
    })) as { error: string };
    ok(result.error.includes("provenance"));
  });
});
