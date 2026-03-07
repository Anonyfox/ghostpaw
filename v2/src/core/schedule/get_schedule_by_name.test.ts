import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { getScheduleByName } from "./get_schedule_by_name.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getScheduleByName", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("returns a schedule by name", () => {
    createSchedule(db, {
      name: "my-job",
      type: "custom",
      command: "echo hi",
      intervalMs: 120_000,
    });
    const found = getScheduleByName(db, "my-job");
    strictEqual(found?.command, "echo hi");
  });

  it("returns undefined for unknown name", () => {
    strictEqual(getScheduleByName(db, "nope"), undefined);
  });
});
