import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSession, initChatTables } from "../../core/chat/index.ts";
import { initHauntTables, storeHaunt } from "../../core/haunt/index.ts";
import { embedText, initMemoryTable, storeMemory } from "../../core/memory/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "../../core/souls/index.ts";
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
  initHauntTables(db);
  ensureMandatorySouls(db);
});

afterEach(() => {
  db.close();
});

describe("detectTopicCluster", () => {
  it("returns null for fewer than 3 haunts", () => {
    strictEqual(detectTopicCluster([]), null);
    strictEqual(
      detectTopicCluster([
        { id: 1, summary: "Explored MCP tools", createdAt: Date.now() },
        { id: 2, summary: "Built MCP server", createdAt: Date.now() },
      ]),
      null,
    );
  });

  it("detects cluster when 3+ summaries share a word", () => {
    const haunts = [
      { id: 1, summary: "Explored MCP tools and protocols", createdAt: Date.now() },
      { id: 2, summary: "Built MCP server integration", createdAt: Date.now() },
      { id: 3, summary: "Tested MCP connection caching", createdAt: Date.now() },
    ];
    const cluster = detectTopicCluster(haunts);
    ok(cluster !== null);
  });

  it("returns null when summaries are diverse", () => {
    const haunts = [
      { id: 1, summary: "Explored deployment pipeline", createdAt: Date.now() },
      { id: 2, summary: "Researched quantum computing", createdAt: Date.now() },
      { id: 3, summary: "Wrote haiku about silence", createdAt: Date.now() },
    ];
    strictEqual(detectTopicCluster(haunts), null);
  });

  it("filters out stopwords", () => {
    const haunts = [
      { id: 1, summary: "Explored this and that", createdAt: Date.now() },
      { id: 2, summary: "Found this from there", createdAt: Date.now() },
      { id: 3, summary: "About this through that", createdAt: Date.now() },
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
      { id: 1, summary: "Audited memory system and tooling", createdAt: Date.now() },
      { id: 2, summary: "Reviewed memory management patterns", createdAt: Date.now() },
      { id: 3, summary: "Explored workspace layout and configs", createdAt: Date.now() },
    ];
    const topics = extractCoveredTopics(haunts);
    ok(topics.includes("memory"));
  });

  it("limits to maxTopics", () => {
    const haunts = [
      { id: 1, summary: "alpha beta gamma delta epsilon", createdAt: Date.now() },
      { id: 2, summary: "alpha beta gamma delta epsilon", createdAt: Date.now() },
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
    storeMemory(db, "User prefers dark mode", embedText("dark mode"), { category: "preference" });
    storeMemory(db, "Node 22 is required", embedText("node version"), { category: "fact" });
    storeMemory(db, "Run tests with node --test", embedText("testing"), { category: "procedure" });

    const result = sampleAntiRecencyMemories(db, null);
    ok(result.length >= 3);
  });

  it("excludes memories matching topic cluster", () => {
    storeMemory(db, "MCP servers use stdio transport", embedText("mcp stdio"), {
      category: "fact",
      confidence: 0.8,
    });
    storeMemory(db, "SQLite is the database", embedText("sqlite database"), {
      category: "fact",
      confidence: 0.8,
    });

    const withCluster = sampleAntiRecencyMemories(db, "mcp");
    const hasMcp = withCluster.some((m) => m.claim.toLowerCase().includes("mcp"));
    strictEqual(hasMcp, false);
  });

  it("falls back to unfiltered when exclusion yields nothing", () => {
    storeMemory(db, "MCP is the only protocol", embedText("mcp only"), {
      category: "fact",
      confidence: 0.8,
    });

    const result = sampleAntiRecencyMemories(db, "mcp");
    ok(result.length >= 1);
  });

  it("excludes previously seeded memory IDs", () => {
    const m1 = storeMemory(db, "First memory", embedText("first"), {
      category: "fact",
      confidence: 0.8,
    });
    const _m2 = storeMemory(db, "Second memory", embedText("second"), {
      category: "fact",
      confidence: 0.8,
    });

    const excluded = new Set([m1.id]);
    const result = sampleAntiRecencyMemories(db, null, excluded);
    const hasExcluded = result.some((m) => m.id === m1.id);
    strictEqual(hasExcluded, false);
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
    storeHaunt(db, {
      sessionId: s.id as number,
      rawJournal: "old journal",
      summary: "Old session",
    });

    storeMemory(db, "Brand new insight", embedText("new insight"), {
      category: "fact",
      confidence: 0.8,
    });

    const analysis = analyzeHauntContext(db);
    ok(analysis.novelty.newMemories.length > 0);
    ok(analysis.novelty.newMemories.some((m) => m.claim.includes("Brand new insight")));
  });
});
