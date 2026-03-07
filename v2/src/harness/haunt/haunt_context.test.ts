import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initChatTables } from "../../core/chat/index.ts";
import { embedText, initMemoryTable, storeMemory } from "../../core/memory/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { assembleHauntContext } from "./haunt_context.ts";
import type { HauntAnalysis } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initSoulsTables(db);
  initMemoryTable(db);
  ensureMandatorySouls(db);
});

afterEach(() => {
  db.close();
});

function makeAnalysis(overrides?: Partial<HauntAnalysis>): HauntAnalysis {
  return {
    hauntCount: 0,
    recentTopicCluster: null,
    coveredTopics: [],
    seed: "What catches your eye?",
    seedMemories: [],
    recentHaunts: [],
    novelty: { newMemories: [], revisedMemories: [], timeSinceLastHaunt: null },
    ...overrides,
  };
}

describe("assembleHauntContext", () => {
  it("produces a non-empty system prompt", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    ok(result.length > 0);
  });

  it("includes private framing section", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    ok(result.includes("Private Session"));
    ok(result.includes("Nobody's here"));
    ok(result.includes("belief"));
    ok(result.includes("workspace"));
  });

  it("includes the ghostpaw soul", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    ok(result.includes("Ghostpaw"));
  });

  it("includes environment info with tools line", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    ok(result.includes("Environment"));
    ok(result.includes("/tmp/test-workspace"));
    ok(result.includes("memory, quests, pack"));
    ok(result.includes("howl"));
  });

  it("does not have a separate Tools section", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    strictEqual(result.includes("## Tools"), false);
  });

  it("includes topic exclusion line when covered topics present", () => {
    const analysis = makeAnalysis({
      coveredTopics: ["memory", "tooling", "audit"],
    });
    const result = assembleHauntContext(db, "/tmp/test-workspace", analysis);
    ok(result.includes("Topics already well-covered"));
    ok(result.includes("memory"));
    ok(result.includes("Look elsewhere"));
  });

  it("shows first haunt indicator when no previous haunts", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    ok(result.includes("first haunt"));
  });

  it("includes novelty section when new memories exist", () => {
    const analysis = makeAnalysis({
      novelty: {
        newMemories: [{ id: 42, claim: "Discovered a new pattern" }],
        revisedMemories: [],
        timeSinceLastHaunt: 3600000,
      },
    });
    const result = assembleHauntContext(db, "/tmp/test-workspace", analysis);
    ok(result.includes("What Changed"));
    ok(result.includes("New belief #42"));
    ok(result.includes("Discovered a new pattern"));
  });

  it("includes time gap in novelty when over 1 day", () => {
    const analysis = makeAnalysis({
      novelty: {
        newMemories: [],
        revisedMemories: [],
        timeSinceLastHaunt: 3 * 24 * 60 * 60 * 1000,
      },
    });
    const result = assembleHauntContext(db, "/tmp/test-workspace", analysis);
    ok(result.includes("What Changed"));
    ok(result.includes("3 days"));
  });

  it("omits novelty section when nothing changed", () => {
    const result = assembleHauntContext(db, "/tmp/test-workspace", makeAnalysis());
    strictEqual(result.includes("What Changed"), false);
  });

  it("includes seed memories when provided", () => {
    const mem = storeMemory(db, "TypeScript is great", embedText("TypeScript is great"), {
      category: "preference",
      confidence: 0.8,
    });

    const analysis = makeAnalysis({ seedMemories: [mem] });
    const result = assembleHauntContext(db, "/tmp/test-workspace", analysis);
    ok(result.includes("What You Know"));
    ok(result.includes("TypeScript is great"));
    ok(result.includes("random sample"));
    ok(result.includes(`#${mem.id}:`));
    ok(result.includes("revise"));
    ok(result.includes("remember"));
  });
});
