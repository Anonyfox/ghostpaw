import type { DatabaseHandle } from "../../lib/index.ts";
import type { CreateRunInput, DelegationRun } from "./types.ts";

export function createRun(db: DatabaseHandle, input: CreateRunInput): DelegationRun {
  const now = Date.now();
  const specialist = input.specialist ?? "default";

  const result = db
    .prepare(
      `INSERT INTO delegation_runs (parent_session_id, specialist, model, task, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.parentSessionId, specialist, input.model, input.task, now);

  return {
    id: result.lastInsertRowid as number,
    parentSessionId: input.parentSessionId,
    childSessionId: null,
    specialist,
    model: input.model,
    task: input.task,
    status: "running",
    result: null,
    error: null,
    tokensIn: 0,
    tokensOut: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    costUsd: 0,
    createdAt: now,
    completedAt: null,
  };
}
