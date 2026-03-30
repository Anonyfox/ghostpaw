import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface StaleSessionInfo {
  id: number;
  purpose: string;
  soul_id: number;
  updated_at: string;
}

export function listUnsealedStaleSessions(
  db: DatabaseHandle,
  staleAfterMinutes: number,
): StaleSessionInfo[] {
  return db
    .prepare(
      `SELECT s.id, s.purpose, s.soul_id, s.updated_at
       FROM sessions s
       WHERE s.purpose IN ('chat', 'subsystem_turn', 'pulse')
         AND s.soul_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM messages WHERE session_id = s.id)
         AND (
           SELECT m.sealed_at FROM messages m
           WHERE m.session_id = s.id
           ORDER BY m.ordinal DESC LIMIT 1
         ) IS NULL
         AND s.updated_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-${staleAfterMinutes} minutes')`,
    )
    .all() as unknown as StaleSessionInfo[];
}
