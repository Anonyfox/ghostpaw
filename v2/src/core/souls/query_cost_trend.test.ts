import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "../chat/api/write/index.ts";
import { initChatTables } from "../chat/runtime/index.ts";
import { initConfigTable } from "../config/runtime/index.ts";
import { MANDATORY_SOUL_IDS } from "./api/read/index.ts";
import { queryCostTrend } from "./query_cost_trend.ts";
import { ensureMandatorySouls, initSoulsTables } from "./runtime/index.ts";

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
  opts: { ageMs: number; costUsd: number },
): void {
  const ts = Date.now() - opts.ageMs;
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
     SET cost_usd = ?, tokens_in = 100, tokens_out = 50,
         closed_at = ?, created_at = ?, last_active_at = ?
     WHERE id = ?`,
  ).run(opts.costUsd, ts, ts, ts, s.id);
}

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
