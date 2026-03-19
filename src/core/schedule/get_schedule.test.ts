import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { getSchedule } from "./get_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getSchedule", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("returns a schedule by id", () => {
    const created = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "echo hi",
      intervalMs: 120_000,
    });
    const found = getSchedule(db, created.id);
    strictEqual(found?.name, "test");
  });

  it("returns undefined for unknown id", () => {
    strictEqual(getSchedule(db, 999), undefined);
  });
});
