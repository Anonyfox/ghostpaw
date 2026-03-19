import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { deleteSchedule } from "./delete_schedule.ts";
import { getSchedule } from "./get_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("deleteSchedule", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("deletes a custom schedule", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "echo hi",
      intervalMs: 120_000,
    });
    deleteSchedule(db, s.id);
    strictEqual(getSchedule(db, s.id), undefined);
  });

  it("rejects deletion of builtin schedules", () => {
    const s = createSchedule(db, {
      name: "builtin-test",
      type: "builtin",
      command: "haunt",
      intervalMs: 120_000,
    });
    throws(() => deleteSchedule(db, s.id), /builtin/);
  });

  it("throws for unknown id", () => {
    throws(() => deleteSchedule(db, 999), /not found/);
  });
});
