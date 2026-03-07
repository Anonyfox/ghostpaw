import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/index.ts";
import { addTrait, ensureMandatorySouls, initSoulsTables, MANDATORY_SOUL_IDS } from "./index.ts";
import { queryCostTrend, queryTraitFitness, queryWindowedStats } from "./query_fitness_signals.ts";

const DAY = 86_400_000;

async function setup(): Promise<DatabaseHandle> {
  const db = await openTestDatabase();
  initSoulsTables(db);
  initChatTables(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
  return db;
}

function insertDelegation(
  db: DatabaseHandle,
  soulId: number,
  opts: { ageMs?: number; costUsd?: number; failed?: boolean },
): void {
  const ts = Date.now() - (opts.ageMs ?? 0);
  const key = `d:${ts}:${Math.random()}`;
  const parent = createSession(db, `p:${key}`, { purpose: "chat" });
  const s = createSession(db, key, {
    purpose: "delegate",
    model: "test-model",
    parentSessionId: parent.id as number,
    soulId,
  });
  const error = opts.failed ? "'tool_error'" : "NULL";
  db.prepare(
    `UPDATE sessions
     SET cost_usd = ?, tokens_in = 100, tokens_out = 50,
         closed_at = ?, created_at = ?, last_active_at = ?,
         error = ${error}
     WHERE id = ?`,
  ).run(opts.costUsd ?? 0.01, ts, ts, ts, s.id);
}

describe("queryWindowedStats", () => {
  it("returns 7d and 30d windows without trait change", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    const result = queryWindowedStats(db, soulId, null);
    strictEqual(result.length, 2);
    strictEqual(result[0].window, "7d");
    strictEqual(result[1].window, "30d");
  });

  it("includes since_last_trait_change when provided", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    const result = queryWindowedStats(db, soulId, Date.now() - 5 * DAY);
    strictEqual(result.length, 3);
    ok(result.some((w) => w.window === "since_last_trait_change"));
  });

  it("counts only sessions within each window", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 3 * DAY });
    insertDelegation(db, soulId, { ageMs: 20 * DAY });
    insertDelegation(db, soulId, { ageMs: 45 * DAY });

    const result = queryWindowedStats(db, soulId, null);
    strictEqual(result[0].stats.total, 1);
    strictEqual(result[1].stats.total, 2);
  });
});

describe("queryTraitFitness", () => {
  it("returns stats since each trait was added", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];

    const traitTs = Date.now() - 10 * DAY;
    const trait = addTrait(db, soulId, { principle: "Test", provenance: "Test" });
    db.prepare("UPDATE soul_traits SET created_at = ? WHERE id = ?").run(traitTs, trait.id);

    insertDelegation(db, soulId, { ageMs: 15 * DAY });
    insertDelegation(db, soulId, { ageMs: 5 * DAY });

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

describe("queryCostTrend", () => {
  it("returns stable when no data exists", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    const result = queryCostTrend(db, soulId);
    strictEqual(result.direction, "stable");
    strictEqual(result.recent7d, 0);
    strictEqual(result.previous7d, 0);
  });

  it("detects cheaper when recent cost is lower", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.1 });
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.02 });

    const result = queryCostTrend(db, soulId);
    strictEqual(result.direction, "cheaper");
  });

  it("detects costlier when recent cost is higher", async () => {
    const db = await setup();
    const soulId = MANDATORY_SOUL_IDS["js-engineer"];
    insertDelegation(db, soulId, { ageMs: 10 * DAY, costUsd: 0.01 });
    insertDelegation(db, soulId, { ageMs: 2 * DAY, costUsd: 0.1 });

    const result = queryCostTrend(db, soulId);
    strictEqual(result.direction, "costlier");
  });
});
