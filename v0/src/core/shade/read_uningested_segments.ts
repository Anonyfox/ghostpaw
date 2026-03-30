import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface UningestedSegment {
  session_id: number;
  soul_id: number;
  sealed_msg_id: number;
}

export function readUningestedSegments(db: DatabaseHandle): UningestedSegment[] {
  return db
    .prepare(
      `SELECT m.session_id, s.soul_id, m.id AS sealed_msg_id
       FROM messages m
       JOIN sessions s ON s.id = m.session_id
       WHERE m.sealed_at IS NOT NULL
         AND s.purpose IN ('chat', 'subsystem_turn', 'pulse')
         AND s.soul_id IS NOT NULL
         AND m.id NOT IN (SELECT sealed_msg_id FROM shade_impressions)
       ORDER BY m.id ASC`,
    )
    .all() as unknown as UningestedSegment[];
}
