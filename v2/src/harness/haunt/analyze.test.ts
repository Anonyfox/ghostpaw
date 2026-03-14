import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ChatSession } from "../../core/chat/api/read/index.ts";
import { createSession, renameSession } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import { storeMemory } from "../../core/memory/api/write/index.ts";
import { initMemoryTable } from "../../core/memory/runtime/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import {
  analyzeHauntContext,
  detectTopicCluster,
  extractCoveredTopics,
  sampleAntiRecencyMemories,
} from "./analyze.ts";

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

function makeHauntSession(displayName: string): ChatSession {
  const s = createSession(db, `haunt:test:${Date.now()}:${Math.random()}`, { purpose: "haunt" });
  renameSession(db, s.id as number, displayName);
  return { ...s, displayName } as ChatSession;
}

describe("detectTopicCluster", () => {
  it("returns null for fewer than 3 haunts", () => {
    strictEqual(detectTopicCluster([]), null);
    const s1 = makeHauntSession("Explored MCP tools");
    const s2 = makeHauntSession("Built MCP server");
    strictEqual(detectTopicCluster([s1, s2]), null);
  });

  it("detects cluster when 3+ summaries share a word", () => {
    const haunts = [
      makeHauntSession("Explored MCP tools and protocols"),
      makeHauntSession("Built MCP server integration"),
      makeHauntSession("Tested MCP connection caching"),
    ];
    const cluster = detectTopicCluster(haunts);
    ok(cluster !== null);
  });

  it("returns null when summaries are diverse", () => {
    const haunts = [
      makeHauntSession("Explored deployment pipeline"),
      makeHauntSession("Researched quantum computing"),
      makeHauntSession("Wrote haiku about silence"),
    ];
    strictEqual(detectTopicCluster(haunts), null);
  });

  it("filters out stopwords", () => {
    const haunts = [
      makeHauntSession("Explored this and that"),
      makeHauntSession("Found this from there"),
      makeHauntSession("About this through that"),
    ];
    strictEqual(detectTopicCluster(haunts), null);
  });
});

describe("extractCoveredTopics", () => {
  it("returns empty for no haunts", () => {
    strictEqual(extractCoveredTopics([]).length, 0);
  });

  it("extracts topics appearing in 2+ summaries", () => {
    const haunts = [
      makeHauntSession("Audited memory system and tooling"),
      makeHauntSession("Reviewed memory management patterns"),
      makeHauntSession("Explored workspace layout and configs"),
    ];
    const topics = extractCoveredTopics(haunts);
    ok(topics.includes("memory"));
  });

  it("limits to maxTopics", () => {
    const haunts = [
      makeHauntSession("alpha beta gamma delta epsilon"),
      makeHauntSession("alpha beta gamma delta epsilon"),
    ];
    const topics = extractCoveredTopics(haunts, 2);
    ok(topics.length <= 2);
  });
});

describe("sampleAntiRecencyMemories", () => {
  it("returns empty array when no memories exist", () => {
    const result = sampleAntiRecencyMemories(db, null);
    strictEqual(result.length, 0);
  });

  it("returns memories across categories", () => {
    storeMemory(db, "User prefers dark mode", { category: "preference" });
    storeMemory(db, "Node 22 is required", { category: "fact" });
    storeMemory(db, "Run tests with node --test", { category: "procedure" });

    const result = sampleAntiRecencyMemories(db, null);
    ok(result.length >= 3);
  });

  it("excludes memories matching topic cluster", () => {
    storeMemory(db, "MCP servers use stdio transport", {
      category: "fact",
      confidence: 0.8,
    });
    storeMemory(db, "SQLite is the database", {
      category: "fact",
      confidence: 0.8,
    });

    const withCluster = sampleAntiRecencyMemories(db, "mcp");
    const hasMcp = withCluster.some((m) => m.claim.toLowerCase().includes("mcp"));
    strictEqual(hasMcp, false);
  });

  it("falls back to unfiltered when exclusion yields nothing", () => {
    storeMemory(db, "MCP is the only protocol", {
      category: "fact",
      confidence: 0.8,
    });

    const result = sampleAntiRecencyMemories(db, "mcp");
    ok(result.length >= 1);
  });
});

describe("analyzeHauntContext", () => {
  it("returns valid structure with no data", () => {
    const analysis = analyzeHauntContext(db);
    strictEqual(analysis.hauntCount, 0);
    strictEqual(analysis.recentTopicCluster, null);
    ok(Array.isArray(analysis.coveredTopics));
    ok(analysis.seed.length > 0);
    ok(Array.isArray(analysis.seedMemories));
    ok(Array.isArray(analysis.recentHaunts));
    ok(analysis.novelty !== undefined);
  });

  it("seed is non-empty", () => {
    ok(analyzeHauntContext(db).seed.length > 0);
  });

  it("seed varies across calls (probabilistic)", () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seeds.add(analyzeHauntContext(db).seed);
    }
    ok(seeds.size > 1, `Expected diverse seeds, got ${seeds.size} unique out of 20`);
  });

  it("novelty detects new memories since last haunt", () => {
    const s = createSession(db, "haunt:nov:1", { purpose: "haunt" });
    renameSession(db, s.id as number, "Old session");

    storeMemory(db, "Brand new insight", {
      category: "fact",
      confidence: 0.8,
    });

    const analysis = analyzeHauntContext(db);
    ok(analysis.novelty.newMemories.length > 0);
    ok(analysis.novelty.newMemories.some((m) => m.claim.includes("Brand new insight")));
  });
});
