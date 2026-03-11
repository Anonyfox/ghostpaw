import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { setConfig } from "../config/api/write/index.ts";
import { initConfigTable } from "../config/runtime/index.ts";
import { resolveMemoryConfig } from "./resolve_config.ts";
import { initMemoryTable } from "./schema.ts";

describe("resolveMemoryConfig", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initConfigTable(db);
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("returns explicit value when provided", () => {
    strictEqual(resolveMemoryConfig(db, "memory_half_life_days", 45), 45);
  });

  it("returns explicit value even when config is set", () => {
    setConfig(db, "memory_half_life_days", 180, "agent");
    strictEqual(resolveMemoryConfig(db, "memory_half_life_days", 45), 45);
  });

  it("returns config value when no explicit value", () => {
    setConfig(db, "memory_half_life_days", 180, "agent");
    strictEqual(resolveMemoryConfig(db, "memory_half_life_days", undefined), 180);
  });

  it("returns code default when no explicit value and no config entry", () => {
    strictEqual(resolveMemoryConfig(db, "memory_half_life_days", undefined), 90);
  });

  it("resolves each of the 8 memory keys to their defaults", () => {
    const expected: [string, number][] = [
      ["memory_half_life_days", 90],
      ["memory_candidate_pool_multiplier", 20],
      ["memory_ema_alpha", 0.3],
      ["memory_max_confidence", 0.99],
      ["memory_fallback_threshold", 0.15],
      ["memory_fallback_min_results", 3],
      ["memory_min_score", 0.01],
      ["memory_recall_k", 10],
    ];
    for (const [key, defaultVal] of expected) {
      strictEqual(resolveMemoryConfig(db, key, undefined), defaultVal, `${key} default`);
    }
  });

  it("falls back to known default when config table does not exist", async () => {
    const bareDb = await openTestDatabase();
    strictEqual(resolveMemoryConfig(bareDb, "memory_half_life_days", undefined), 90);
    strictEqual(resolveMemoryConfig(bareDb, "memory_recall_k", undefined), 10);
    bareDb.close();
  });
});
