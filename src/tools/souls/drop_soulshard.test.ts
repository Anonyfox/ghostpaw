import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSoulShardTables, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createDropSoulshardTool } from "./drop_soulshard.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSoulsTables(db);
  initSoulShardTables(db);
  const now = Date.now();
  db.prepare(
    "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
  ).run(1, "Ghostpaw", now, now);
  db.prepare(
    "INSERT INTO souls (id, name, essence, description, level, created_at, updated_at) VALUES (?, ?, '', '', 0, ?, ?)",
  ).run(2, "JS Engineer", now, now);
});

afterEach(() => {
  db.close();
});

describe("drop_soulshard tool", () => {
  it("has correct tool name", () => {
    const tool = createDropSoulshardTool(db);
    strictEqual(tool.name, "drop_soulshard");
  });

  it("drops a shard with soul attribution", async () => {
    const tool = createDropSoulshardTool(db, { source: "session", sourceId: "s-1" });
    const result = (await tool.execute({
      args: { observation: "Engineer re-reads files often", soul_names: "JS Engineer, Ghostpaw" },
      ctx: { model: "test", provider: "test" },
    })) as { dropped: boolean; soulNames: string[] };

    strictEqual(result.dropped, true);
    strictEqual(result.soulNames.length, 2);

    const shards = db.prepare("SELECT * FROM soul_shards").all();
    strictEqual(shards.length, 1);

    const junctions = db.prepare("SELECT * FROM shard_souls").all();
    strictEqual(junctions.length, 2);
  });

  it("returns error for unknown soul", async () => {
    const tool = createDropSoulshardTool(db);
    const result = (await tool.execute({
      args: { observation: "obs", soul_names: "Nonexistent" },
      ctx: { model: "test", provider: "test" },
    })) as { error: string };

    strictEqual(result.error.includes("not found"), true);
  });

  it("respects sealed option", async () => {
    const tool = createDropSoulshardTool(db, {
      source: "quest",
      sourceId: "q-1",
      sealed: true,
    });
    await tool.execute({
      args: { observation: "obs", soul_names: "JS Engineer" },
      ctx: { model: "test", provider: "test" },
    });

    const shard = db.prepare("SELECT sealed FROM soul_shards WHERE id = 1").get() as {
      sealed: number;
    };
    strictEqual(shard.sealed, 1);
  });
});
