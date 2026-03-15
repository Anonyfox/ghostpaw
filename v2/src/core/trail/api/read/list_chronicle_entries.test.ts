import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { writeChronicle } from "../write/write_chronicle.ts";
import { listChronicleEntries } from "./list_chronicle_entries.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listChronicleEntries", () => {
  it("returns empty array when none exist", () => {
    strictEqual(listChronicleEntries(db).length, 0);
  });

  it("returns entries in reverse order", () => {
    writeChronicle(db, { date: "2026-03-01", title: "A", narrative: "n" });
    writeChronicle(db, { date: "2026-03-02", title: "B", narrative: "n" });
    const entries = listChronicleEntries(db);
    strictEqual(entries[0].title, "B");
    strictEqual(entries[1].title, "A");
  });

  it("supports cursor pagination via beforeId", () => {
    writeChronicle(db, { date: "2026-03-01", title: "A", narrative: "n" });
    const b = writeChronicle(db, { date: "2026-03-02", title: "B", narrative: "n" });
    const page = listChronicleEntries(db, { beforeId: b.id });
    strictEqual(page.length, 1);
    strictEqual(page[0].title, "A");
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      writeChronicle(db, { date: `2026-03-0${i + 1}`, title: `T${i}`, narrative: "n" });
    }
    strictEqual(listChronicleEntries(db, { limit: 2 }).length, 2);
  });
});
