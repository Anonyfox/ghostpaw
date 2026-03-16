import type { ChatFactory } from "../../core/chat/api/write/index.ts";
import type { QuestStatus } from "../../core/quests/api/types.ts";

export interface EmbarkResult {
  sessionId: number;
  questId: number;
  succeeded: boolean;
  finalStatus: QuestStatus;
  turns: number;
  usage: { tokensIn: number; tokensOut: number };
  cost: number;
  xp: number;
}

export interface EmbarkOptions {
  model?: string;
  chatFactory?: ChatFactory;
  maxTurns?: number;
}
