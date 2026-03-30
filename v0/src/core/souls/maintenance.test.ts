import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { write } from "@ghostpaw/souls";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "./bootstrap.ts";
import { runMaintenance } from "./maintenance.ts";

let soulsDb: DatabaseHandle;

beforeEach(() => {
  soulsDb = openMemorySoulsDatabase();
});

afterEach(() => {
  soulsDb.close();
});

describe("runMaintenance", () => {
  it("returns empty readySouls when no shards exist", () => {
    bootstrapSouls(soulsDb);
    const result = runMaintenance(soulsDb);

    assert.strictEqual(result.fadedShardCount, 0);
    assert.ok(Array.isArray(result.readySouls));
    assert.strictEqual(result.readySouls.length, 0);
  });

  it("returns the correct structure with faded count and ready list", () => {
    const ids = bootstrapSouls(soulsDb);

    // biome-ignore lint/suspicious/noExplicitAny: DatabaseHandle satisfies SoulsDb at runtime
    const db = soulsDb as any;
    for (let i = 0; i < 10; i++) {
      write.dropShard(db, {
        content: `shard-${i}`,
        source: `src-${i % 3}`,
        soulIds: [ids.ghostpaw],
      });
    }

    const result = runMaintenance(soulsDb);
    assert.strictEqual(typeof result.fadedShardCount, "number");
    assert.ok(Array.isArray(result.readySouls));
    if (result.readySouls.length > 0) {
      const entry = result.readySouls[0];
      assert.strictEqual(typeof entry.soulId, "number");
      assert.strictEqual(typeof entry.pendingCount, "number");
      assert.strictEqual(typeof entry.priorityScore, "number");
    }
  });
});
