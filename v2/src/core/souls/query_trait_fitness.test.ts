import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/index.ts";
import { addTrait, ensureMandatorySouls, initSoulsTables, MANDATORY_SOUL_IDS } from "./index.ts";
import { queryTraitFitness } from "./query_trait_fitness.ts";

const DAY = 86_400_000;

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

function insertDelegation(db: DatabaseHandle, soulId: number, ageMs: number): void {
  const ts = Date.now() - ageMs;
  const key = `d:${ts}:${Math.random()}`;
  const parent = createSession(db, `p:${key}`, { purpose: "chat" });
  const s = createSession(db, key, {
    purpose: "delegate",
    model: "test-model",
    parentSessionId: parent.id as number,
    soulId,
  });
  db.prepare(
    `UPDATE sessions
     SET cost_usd = 0.01, tokens_in = 100, tokens_out = 50,
         closed_at = ?, created_at = ?, last_active_at = ?
     WHERE id = ?`,
  ).run(ts, ts, ts, s.id);
}

describe("queryTraitFitness", () => {
  it("returns stats since each trait was added", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    const traitTs = Date.now() - 10 * DAY;
    const trait = addTrait(db, soulId, { principle: "Test", provenance: "Test" });
    db.prepare("UPDATE soul_traits SET created_at = ? WHERE id = ?").run(traitTs, trait.id);

    insertDelegation(db, soulId, 15 * DAY);
    insertDelegation(db, soulId, 5 * DAY);

    const result = queryTraitFitness(db, soulId, [
      {
        id: trait.id,
        principle: "Test",
        provenance: "Test",
        generation: 0,
        status: "active",
        createdAt: traitTs,
      },
    ]);
    strictEqual(result.length, 1);
    strictEqual(result[0].statsSinceAdded.total, 1);
  });
});
