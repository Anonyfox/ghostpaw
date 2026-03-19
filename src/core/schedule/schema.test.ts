import { doesNotThrow } from "node:assert";
import { describe, it } from "node:test";
import { openTestDatabase } from "../../lib/index.ts";
import { initScheduleTables } from "./schema.ts";

describe("initScheduleTables", () => {
  it("creates the schedules table without error", async () => {
    const db = await openTestDatabase();
    doesNotThrow(() => initScheduleTables(db));
  });

  it("is idempotent", async () => {
    const db = await openTestDatabase();
    initScheduleTables(db);
    doesNotThrow(() => initScheduleTables(db));
  });
});
