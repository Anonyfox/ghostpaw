import type { ChatSession } from "../../core/chat/api/read/index.ts";
import type { ChatFactory, TurnResult } from "../../core/chat/api/write/index.ts";
import type { Memory } from "../../core/memory/api/types.ts";

export interface NoveltyInfo {
  newMemories: Array<{ id: number; claim: string }>;
  revisedMemories: Array<{ id: number; claim: string }>;
  timeSinceLastHaunt: number | null;
}

export interface HauntAnalysis {
  hauntCount: number;
  recentTopicCluster: string | null;
  coveredTopics: string[];
  seed: string;
  seedMemories: Memory[];
  recentHaunts: ChatSession[];
  novelty: NoveltyInfo;
}

export interface RunHauntOptions {
  model?: string;
  chatFactory?: ChatFactory;
}

export interface HauntResult {
  sessionId: number;
  summary: string;
  succeeded: boolean;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
  consolidation: ConsolidationResult | null;
}

export interface ConsolidationResult {
  summary: string;
  toolCalls: Record<string, number>;
  highlight: string | null;
  cost: { estimatedUsd: number };
}
