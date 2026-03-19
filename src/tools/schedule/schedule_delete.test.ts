import { ok, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSchedule } from "../../core/schedule/api/read/index.ts";
import { createSchedule } from "../../core/schedule/api/write/index.ts";
import { initScheduleTables } from "../../core/schedule/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createScheduleDeleteTool } from "./schedule_delete.ts";

describe("schedule_delete tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
    const tool = createScheduleDeleteTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("deletes a custom schedule", async () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    const result = (await execute({ id: s.id })) as { deleted: string };
    strictEqual(result.deleted, "a");
    strictEqual(getSchedule(db, s.id), undefined);
  });

  it("rejects deletion of builtin", async () => {
    const s = createSchedule(db, {
      name: "b",
      type: "builtin",
      command: "haunt",
      intervalMs: 120_000,
    });
    await rejects(() => execute({ id: s.id }), /builtin/);
  });

  it("rejects unknown id", async () => {
    await rejects(() => execute({ id: 999 }), /not found/);
  });

  it("has a tool name", () => {
    const tool = createScheduleDeleteTool(db);
    strictEqual(tool.name, "schedule_delete");
    ok(tool.description.length > 20);
  });
});
