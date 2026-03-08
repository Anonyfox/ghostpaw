import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import {
  embedText,
  initMemoryTable,
  storeMemory,
  supersedeMemories,
} from "../../core/memory/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { selectSeed } from "./seeds.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  initConfigTable(db);
  ensureMandatorySouls(db);
});

afterEach(() => {
  db.close();
});

describe("selectSeed", () => {
  it("returns a non-empty string with no data", () => {
    const seed = selectSeed(db, null);
    ok(seed.length > 0);
  });

  it("returns a non-empty string with topic cluster", () => {
    const seed = selectSeed(db, "deployment");
    ok(seed.length > 0);
  });

  it("seeds are under 200 characters", () => {
    for (let i = 0; i < 30; i++) {
      const seed = selectSeed(db, null);
      ok(seed.length < 200, `Seed too long (${seed.length}): ${seed}`);
    }
  });

  it("produces dynamic seeds when memories exist", () => {
    storeMemory(db, "The user likes TypeScript", embedText("typescript"), {
      category: "preference",
      confidence: 0.9,
    });
    storeMemory(db, "Node 22 is required", embedText("node version"), {
      category: "fact",
      confidence: 0.7,
    });

    const seeds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      seeds.add(selectSeed(db, null));
    }
    ok(seeds.size > 3, `Expected diverse seeds, got ${seeds.size} unique out of 50`);
  });

  it("counter-pattern seeds reference the cluster topic", () => {
    const seeds: string[] = [];
    for (let i = 0; i < 50; i++) {
      seeds.push(selectSeed(db, "deployment"));
    }
    const hasClusterRef = seeds.some((s) => s.includes("deployment"));
    ok(hasClusterRef, "Expected at least one seed referencing the cluster topic");
  });

  it("produces heavily-revised seeds when revision chains exist", () => {
    const m1 = storeMemory(db, "Old belief alpha", embedText("alpha"));
    const m2 = storeMemory(db, "Old belief beta", embedText("beta"));
    const m3 = storeMemory(db, "Current belief gamma", embedText("gamma"));
    supersedeMemories(db, [m1.id], m3.id);
    supersedeMemories(db, [m2.id], m3.id);

    const seeds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seeds.add(selectSeed(db, null));
    }
    const hasRevised = [...seeds].some((s) => s.includes("revised"));
    ok(hasRevised, "Expected at least one seed about revised beliefs");
  });
});
