import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession, initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/runtime/index.ts";
import { MANDATORY_SOUL_IDS } from "./api/read/index.ts";
import { queryWindowedStats } from "./query_windowed_stats.ts";
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
  opts: { ageMs?: number; costUsd?: number },
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
  db.prepare(
    `UPDATE sessions
     SET cost_usd = ?, tokens_in = 100, tokens_out = 50,
         closed_at = ?, created_at = ?, last_active_at = ?
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
