import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatSession, CreateSessionInput } from "./types.ts";

export function createSession(
  db: DatabaseHandle,
  key: string,
  options?: CreateSessionInput,
): ChatSession {
  const now = Date.now();
  const purpose = options?.purpose ?? "chat";
  const model = options?.model ?? null;

  const result = db
    .prepare(
      `INSERT INTO sessions (key, purpose, model, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(key, purpose, model, now, now);

  return {
    id: result.lastInsertRowid,
    key,
    purpose,
    model,
    displayName: null,
    createdAt: now,
    lastActiveAt: now,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    headMessageId: null,
    closedAt: null,
    absorbedAt: null,
  };
}
