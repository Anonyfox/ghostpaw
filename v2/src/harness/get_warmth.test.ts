import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { storeMemory } from "../core/memory/api/write/index.ts";
import { initMemoryTable } from "../core/memory/runtime/index.ts";
import { meetMember } from "../core/pack/api/write/index.ts";
import { initPackTables } from "../core/pack/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import { getWarmth } from "./get_warmth.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
});

describe("getWarmth", () => {
  it("returns null when no tables exist", () => {
    strictEqual(getWarmth(db), null);
  });

  it("returns null when tables exist but are empty", () => {
    initPackTables(db);
    initMemoryTable(db);
    strictEqual(getWarmth(db), null);
  });

  it("returns user info when pack user exists but no strong memories", () => {
    initPackTables(db);
    initMemoryTable(db);
    meetMember(db, { name: "Fox", kind: "human", isUser: true, bond: "My human companion" });
    const warmth = getWarmth(db);
    ok(warmth !== null);
    strictEqual(warmth.userName, "Fox");
    strictEqual(warmth.userBond, "My human companion");
    strictEqual(warmth.beliefs.length, 0);
  });

  it("returns beliefs when memories exist but no pack user", () => {
    initPackTables(db);
    initMemoryTable(db);
    storeMemory(db, "TypeScript is the preferred language", { confidence: 0.9 });
    const warmth = getWarmth(db);
    ok(warmth !== null);
    strictEqual(warmth.userName, "user");
    strictEqual(warmth.beliefs.length, 1);
    strictEqual(warmth.beliefs[0].claim, "TypeScript is the preferred language");
  });

  it("combines user and beliefs when both exist", () => {
    initPackTables(db);
    initMemoryTable(db);
    meetMember(db, { name: "Fox", kind: "human", isUser: true });
    storeMemory(db, "ESM modules preferred", { confidence: 0.85, category: "preference" });
    storeMemory(db, "Biome for formatting", { confidence: 0.8, category: "fact" });
    const warmth = getWarmth(db);
    ok(warmth !== null);
    strictEqual(warmth.userName, "Fox");
    strictEqual(warmth.beliefs.length, 2);
  });

  it("works when only pack tables exist", () => {
    initPackTables(db);
    meetMember(db, { name: "Fox", kind: "human", isUser: true });
    const warmth = getWarmth(db);
    ok(warmth !== null);
    strictEqual(warmth.userName, "Fox");
    strictEqual(warmth.beliefs.length, 0);
  });

  it("works when only memory tables exist", () => {
    initMemoryTable(db);
    storeMemory(db, "Node 24+", { confidence: 0.9 });
    const warmth = getWarmth(db);
    ok(warmth !== null);
    strictEqual(warmth.userName, "user");
    strictEqual(warmth.beliefs.length, 1);
  });
});
