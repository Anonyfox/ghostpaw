import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { writeChronicle } from "../write/write_chronicle.ts";
import { getLatestChronicle } from "./get_latest_chronicle.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getLatestChronicle", () => {
  it("returns null when empty", () => {
    strictEqual(getLatestChronicle(db), null);
  });

  it("returns the most recent chronicle", () => {
    writeChronicle(db, { date: "2026-03-01", title: "Old", narrative: "n" });
    writeChronicle(db, { date: "2026-03-02", title: "New", narrative: "n" });
    const c = getLatestChronicle(db);
    strictEqual(c?.title, "New");
  });
});
