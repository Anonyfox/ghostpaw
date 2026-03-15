import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../lib/index.ts";
import { initChatTables } from "../../chat/runtime/index.ts";
import { initMemoryTable } from "../../memory/runtime/index.ts";
import { initPackTables } from "../../pack/runtime/schema.ts";
import { initQuestTables } from "../../quests/schema.ts";
import { initSkillEventsTables } from "../../skills/runtime/events.ts";
import { initSoulsTables } from "../../souls/runtime/index.ts";
import { initTrailTables } from "../schema.ts";
import type { SweepContext } from "./sweep.ts";
import { runTrailSweep } from "./sweep.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initMemoryTable(db);
  initPackTables(db);
  initQuestTables(db);
  initSkillEventsTables(db);
  initSoulsTables(db);
  initTrailTables(db);
});

describe("runTrailSweep", () => {
  it("runs with empty database and invokes historian", async () => {
    let invoked = false;
    const captured: SweepContext[] = [];

    await runTrailSweep(db, async (_db, context) => {
      invoked = true;
      captured.push(context);
    });

    strictEqual(invoked, true);
    strictEqual(captured.length, 1);
    ok(captured[0].slices);
    ok(captured[0].surprise);
    ok(captured[0].sinceMs > 0);
  });

  it("updates sweep state after completion", async () => {
    await runTrailSweep(db, async () => {});

    const row = db.prepare("SELECT * FROM trail_sweep_state WHERE id = 1").get() as
      | Record<string, unknown>
      | undefined;
    ok(row);
    ok((row!.last_sweep_at as number) > 0);
  });

  it("does not update sweep state if historian throws", async () => {
    try {
      await runTrailSweep(db, async () => {
        throw new Error("historian failed");
      });
    } catch {
      // expected
    }

    const row = db.prepare("SELECT * FROM trail_sweep_state WHERE id = 1").get();
    strictEqual(row, undefined);
  });

  it("applies mechanical decay to open loops", async () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO trail_open_loops (description, significance, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("test loop", 1.0, "alive", now, now);

    await runTrailSweep(db, async () => {});

    const row = db
      .prepare("SELECT significance FROM trail_open_loops WHERE description = 'test loop'")
      .get() as { significance: number };
    ok(row.significance < 1.0, "significance should have decayed");
    ok(row.significance >= 0.89 && row.significance <= 0.91, "decay factor should be ~0.9");
  });

  it("gathers chat sessions into slices when present", async () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at) VALUES (?, ?, ?, ?)",
    ).run("s1", "user", now, now);

    let chatSlice: unknown = null;
    await runTrailSweep(db, async (_db, context) => {
      chatSlice = context.slices.chat;
    });

    ok(chatSlice !== null, "chat slice should be populated");
    ok(Array.isArray(chatSlice));
  });

  it("uses last sweep time as gathering window", async () => {
    const past = Date.now() - 3600_000;
    db.prepare(
      "INSERT INTO trail_sweep_state (id, last_sweep_at, updated_at) VALUES (1, ?, ?)",
    ).run(past, past);

    let sinceMs = 0;
    await runTrailSweep(db, async (_db, context) => {
      sinceMs = context.sinceMs;
    });

    strictEqual(sinceMs, past);
  });
});
