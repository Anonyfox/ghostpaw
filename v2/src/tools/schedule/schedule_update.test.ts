import { ok, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSchedule, getSchedule, initScheduleTables } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createScheduleUpdateTool } from "./schedule_update.ts";

describe("schedule_update tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
    const tool = createScheduleUpdateTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("updates interval", async () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    const result = (await execute({ id: s.id, interval_ms: 300_000 })) as {
      updated: { intervalMs: number };
    };
    strictEqual(result.updated.intervalMs, 300_000);
  });

  it("toggles enabled", async () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    await execute({ id: s.id, enabled: false });
    strictEqual(getSchedule(db, s.id)!.enabled, false);
  });

  it("rejects command change on builtin", async () => {
    const s = createSchedule(db, {
      name: "b",
      type: "builtin",
      command: "haunt",
      intervalMs: 120_000,
    });
    await rejects(() => execute({ id: s.id, command: "other" }), /builtin/);
  });

  it("has a tool name", () => {
    const tool = createScheduleUpdateTool(db);
    strictEqual(tool.name, "schedule_update");
    ok(tool.description.length > 20);
  });
});
