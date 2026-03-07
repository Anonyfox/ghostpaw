import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { listSchedules } from "./list_schedules.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("listSchedules", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("returns empty array when no schedules exist", () => {
    strictEqual(listSchedules(db).length, 0);
  });

  it("returns all schedules ordered by id", () => {
    createSchedule(db, { name: "b", type: "custom", command: "ls", intervalMs: 60_000 });
    createSchedule(db, { name: "a", type: "custom", command: "pwd", intervalMs: 120_000 });
    const list = listSchedules(db);
    strictEqual(list.length, 2);
    strictEqual(list[0].name, "b");
    strictEqual(list[1].name, "a");
  });
});
