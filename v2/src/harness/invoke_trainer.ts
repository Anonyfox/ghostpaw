import type { Tool } from "chatoyant";
import type { TurnResult } from "../core/chat/index.ts";
import { closeSession, createSession } from "../core/chat/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { Entity } from "./types.ts";

export interface TrainerResult {
  content: string;
  succeeded: boolean;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
}

export interface TrainerProposeResult extends TrainerResult {
  sessionId: number;
}

/**
 * Single-turn trainer invocation (backward compat).
 * Creates a session, runs one turn, closes the session.
 */
export async function invokeTrainer(
  entity: Entity,
  db: DatabaseHandle,
  prompt: string,
  options?: { model?: string; purpose?: string; tools?: Tool[] },
): Promise<TrainerResult> {
  const session = createSession(db, `system:trainer:${Date.now()}`, {
    purpose: (options?.purpose ?? "system") as "system",
  });
  const sessionId = session.id as number;

  try {
    const result = await entity.executeTurn(sessionId, prompt, {
      soulId: MANDATORY_SOUL_IDS.trainer,
      model: options?.model,
      tools: options?.tools,
    });
    return {
      content: result.content,
      succeeded: result.succeeded,
      usage: result.usage,
      cost: result.cost,
    };
  } finally {
    await entity.flush();
    closeSession(db, sessionId);
  }
}

/**
 * Phase 1: propose. Creates a session, runs one turn, keeps session open.
 * The session ID is returned so phase 2 can resume it with full context.
 */
export async function invokeTrainerPropose(
  entity: Entity,
  db: DatabaseHandle,
  prompt: string,
  options?: { model?: string; purpose?: string },
): Promise<TrainerProposeResult> {
  const session = createSession(db, `system:trainer:${Date.now()}`, {
    purpose: (options?.purpose ?? "system") as "system",
  });
  const sessionId = session.id as number;

  const result = await entity.executeTurn(sessionId, prompt, {
    soulId: MANDATORY_SOUL_IDS.trainer,
    model: options?.model,
  });

  return {
    sessionId,
    content: result.content,
    succeeded: result.succeeded,
    usage: result.usage,
    cost: result.cost,
  };
}

/**
 * Phase 2: execute. Resumes an existing session with the user's selection,
 * runs one turn, then closes the session.
 */
export async function invokeTrainerExecute(
  entity: Entity,
  db: DatabaseHandle,
  sessionId: number,
  prompt: string,
  options?: { model?: string },
): Promise<TrainerResult> {
  try {
    const result = await entity.executeTurn(sessionId, prompt, {
      soulId: MANDATORY_SOUL_IDS.trainer,
      model: options?.model,
    });
    return {
      content: result.content,
      succeeded: result.succeeded,
      usage: result.usage,
      cost: result.cost,
    };
  } finally {
    await entity.flush();
    closeSession(db, sessionId);
  }
}
