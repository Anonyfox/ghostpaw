import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import type { TurnResult } from "../../core/chat/index.ts";
import type { Haunt, HauntSummary } from "../../core/haunt/index.ts";
import type { Memory } from "../../core/memory/index.ts";

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
  recentHaunts: HauntSummary[];
  novelty: NoveltyInfo;
}

export interface RunHauntOptions {
  model?: string;
  chatFactory?: ChatFactory;
}

export interface HauntResult {
  haunt: Haunt;
  sessionId: number;
  succeeded: boolean;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
  consolidation: ConsolidationResult | null;
}

export interface ConsolidationResult {
  summary: string;
  toolCalls: { recall: number; remember: number; revise: number; forget: number };
  highlight: string | null;
  cost: { estimatedUsd: number };
}
