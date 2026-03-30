import assert from "node:assert";
import { describe, it } from "node:test";
import { read, write } from "@ghostpaw/souls";
import { openMemorySoulsDatabase } from "./open_souls.ts";

describe("openMemorySoulsDatabase", () => {
  it("opens and initializes souls tables", () => {
    const db = openMemorySoulsDatabase();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    assert.ok(names.includes("souls"), "should have souls table");
    assert.ok(names.includes("soul_traits"), "should have soul_traits table");

    db.close();
  });

  it("supports souls write operations through the handle", () => {
    const db = openMemorySoulsDatabase();

    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const soul = write.createSoul(db as any, {
      name: "Test",
      description: "A test soul",
      essence: "For testing only.",
    });

    assert.ok(soul.id > 0);
    assert.strictEqual(soul.name, "Test");

    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const found = read.getSoul(db as any, soul.id);
    assert.ok(found, "soul should be persisted in the database");
    assert.strictEqual(found.name, "Test");

    db.close();
  });
});
