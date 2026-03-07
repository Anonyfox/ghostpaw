import { ok, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initScheduleTables, listSchedules } from "../../core/schedule/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createScheduleCreateTool } from "./schedule_create.ts";

describe("schedule_create tool", () => {
  let db: DatabaseHandle;
  let execute: (args: Record<string, unknown>) => Promise<unknown>;

  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
    const tool = createScheduleCreateTool(db);
    execute = (args) => tool.execute({ args, ctx: { model: "test", provider: "test" } });
  });

  afterEach(() => db.close());

  it("creates a custom schedule", async () => {
    const result = (await execute({
      name: "my-job",
      command: "echo hello",
      interval_ms: 120_000,
    })) as { created: { name: string; intervalMs: number } };
    strictEqual(result.created.name, "my-job");
    strictEqual(result.created.intervalMs, 120_000);
    strictEqual(listSchedules(db).length, 1);
  });

  it("always creates as custom type", async () => {
    await execute({ name: "a", command: "ls", interval_ms: 60_000 });
    const all = listSchedules(db);
    strictEqual(all[0].type, "custom");
  });

  it("rejects interval below 1 minute", async () => {
    await rejects(
      () => execute({ name: "fast", command: "ls", interval_ms: 30_000 }),
      /at least 60000ms/,
    );
  });

  it("rejects empty command", async () => {
    await rejects(
      () => execute({ name: "bad", command: "  ", interval_ms: 60_000 }),
      /command must not be empty/,
    );
  });

  it("has a tool name", () => {
    const tool = createScheduleCreateTool(db);
    strictEqual(tool.name, "schedule_create");
    ok(tool.description.length > 20);
  });
});
