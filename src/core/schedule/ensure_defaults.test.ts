import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { ensureDefaultSchedules } from "./ensure_defaults.ts";
import { getScheduleByName } from "./get_schedule_by_name.ts";
import { listSchedules } from "./list_schedules.ts";
import { initScheduleTables } from "./schema.ts";
import { updateSchedule } from "./update_schedule.ts";

let db: DatabaseHandle;

describe("ensureDefaultSchedules", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("creates default schedules", () => {
    ensureDefaultSchedules(db);
    const all = listSchedules(db);
    ok(all.length >= 2);
    ok(all.some((s) => s.name === "haunt"));
    ok(all.some((s) => s.name === "distill"));
  });

  it("is idempotent — does not overwrite existing schedules", () => {
    ensureDefaultSchedules(db);
    const haunt = getScheduleByName(db, "haunt")!;
    updateSchedule(db, haunt.id, { intervalMs: 999_000 });

    ensureDefaultSchedules(db);
    const after = getScheduleByName(db, "haunt")!;
    strictEqual(after.intervalMs, 999_000);
  });

  it("haunt is disabled by default", () => {
    ensureDefaultSchedules(db);
    const haunt = getScheduleByName(db, "haunt")!;
    strictEqual(haunt.enabled, false);
  });

  it("distill is enabled by default", () => {
    ensureDefaultSchedules(db);
    const distill = getScheduleByName(db, "distill")!;
    strictEqual(distill.enabled, true);
  });

  it("haunt has a 10-minute timeout", () => {
    ensureDefaultSchedules(db);
    const haunt = getScheduleByName(db, "haunt")!;
    strictEqual(haunt.timeoutMs, 600_000);
  });

  it("distill has a 30-minute timeout", () => {
    ensureDefaultSchedules(db);
    const distill = getScheduleByName(db, "distill")!;
    strictEqual(distill.timeoutMs, 1_800_000);
  });
});
