import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSchedule } from "../../core/schedule/api/write/index.ts";
import { ensureDefaultSchedules, initScheduleTables } from "../../core/schedule/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createScheduleListTool } from "./schedule_list.ts";

describe("schedule_list tool", () => {
  let db: DatabaseHandle;
  let execute: () => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
    const tool = createScheduleListTool(db);
    execute = () => tool.execute({ args: {}, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("returns empty list when no schedules exist", async () => {
    const result = (await execute()) as { schedules: unknown[] };
    strictEqual(result.schedules.length, 0);
  });

  it("returns default schedules after ensure", async () => {
    ensureDefaultSchedules(db);
    const result = (await execute()) as { schedules: { name: string }[] };
    ok(result.schedules.length >= 2);
    ok(result.schedules.some((s) => s.name === "haunt"));
    ok(result.schedules.some((s) => s.name === "distill"));
  });

  it("includes custom schedules", async () => {
    createSchedule(db, { name: "my-job", type: "custom", command: "echo", intervalMs: 60_000 });
    const result = (await execute()) as { schedules: { name: string; type: string }[] };
    strictEqual(result.schedules.length, 1);
    strictEqual(result.schedules[0].type, "custom");
  });

  it("includes timeoutMs in output", async () => {
    createSchedule(db, {
      name: "timed",
      type: "custom",
      command: "echo",
      intervalMs: 60_000,
      timeoutMs: 120_000,
    });
    const result = (await execute()) as {
      schedules: { name: string; timeoutMs: number | null }[];
    };
    strictEqual(result.schedules[0].timeoutMs, 120_000);
  });
});
