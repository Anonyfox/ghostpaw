import { ok } from "node:assert";
import { describe, it } from "node:test";
import type {
  MemoryDetailResponse,
  MemoryInfo,
  MemoryListResponse,
  MemorySearchResponse,
  MemorySearchResult,
  MemoryStatsResponse,
} from "./memory_types.ts";

describe("memory shared types", () => {
  it("MemoryInfo is structurally valid", () => {
    const info: MemoryInfo = {
      id: 1,
      claim: "User prefers dark mode",
      confidence: 0.85,
      evidenceCount: 3,
      createdAt: Date.now(),
      verifiedAt: Date.now(),
      source: "explicit",
      category: "preference",
      supersededBy: null,
      strength: "strong",
      freshness: 0.92,
    };
    ok(info.id > 0);
  });

  it("MemorySearchResult extends MemoryInfo with score fields", () => {
    const result: MemorySearchResult = {
      id: 2,
      claim: "Project uses TypeScript",
      confidence: 0.7,
      evidenceCount: 1,
      createdAt: Date.now(),
      verifiedAt: Date.now(),
      source: "observed",
      category: "fact",
      supersededBy: null,
      strength: "fading",
      freshness: 0.5,
      score: 0.87,
      similarity: 0.91,
    };
    ok(result.score > 0);
  });

  it("MemoryStatsResponse is structurally valid", () => {
    const stats: MemoryStatsResponse = {
      active: 142,
      total: 189,
      strong: 80,
      fading: 40,
      faint: 22,
      stale: 5,
      byCategory: { preference: 30, fact: 50, procedure: 20, capability: 10, custom: 32 },
    };
    ok(stats.active <= stats.total);
  });

  it("MemoryListResponse wraps memories with total", () => {
    const list: MemoryListResponse = { memories: [], total: 0 };
    ok(list.total === 0);
  });

  it("MemorySearchResponse wraps search results", () => {
    const search: MemorySearchResponse = { memories: [] };
    ok(Array.isArray(search.memories));
  });

  it("MemoryDetailResponse includes supersession info", () => {
    const detail: MemoryDetailResponse = {
      id: 5,
      claim: "User prefers 2-space indent",
      confidence: 0.9,
      evidenceCount: 2,
      createdAt: Date.now(),
      verifiedAt: Date.now(),
      source: "explicit",
      category: "preference",
      supersededBy: null,
      strength: "strong",
      freshness: 0.95,
      supersedes: 3,
    };
    ok(detail.supersedes === 3);
  });
});
