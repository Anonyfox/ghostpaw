import type { DatabaseHandle } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSessionByKey } from "./get_session_by_key.ts";
import type { ChatSession, CreateSessionInput } from "./types.ts";

export function getOrCreateSession(
  db: DatabaseHandle,
  key: string,
  options?: CreateSessionInput,
): ChatSession {
  const existing = getSessionByKey(db, key);
  if (existing) return existing;
  return createSession(db, key, options);
}
