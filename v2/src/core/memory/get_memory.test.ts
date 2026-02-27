import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { getMemory } from "./get_memory.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("getMemory", () => {
  it("returns a memory by ID", () => {
    const stored = storeMemory(db, "test claim", embedText("test claim"));
    const fetched = getMemory(db, stored.id);
    strictEqual(fetched?.id, stored.id);
    strictEqual(fetched?.claim, "test claim");
  });

  it("returns null for nonexistent ID", () => {
    const result = getMemory(db, 999);
    strictEqual(result, null);
  });

  it("returns superseded memories (they are still gettable)", () => {
    const old = storeMemory(db, "old fact", embedText("old fact"));
    const replacement = storeMemory(db, "new fact", embedText("new fact"));
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(replacement.id, old.id);
    const fetched = getMemory(db, old.id);
    strictEqual(fetched?.supersededBy, replacement.id);
    strictEqual(fetched?.claim, "old fact");
  });
});
