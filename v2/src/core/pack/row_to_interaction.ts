import type { InteractionKind, PackInteraction } from "./types.ts";

export function rowToInteraction(row: Record<string, unknown>): PackInteraction {
  return {
    id: row.id as number,
    memberId: row.member_id as number,
    kind: row.kind as InteractionKind,
    summary: row.summary as string,
    significance: row.significance as number,
    sessionId: (row.session_id as number | null) ?? null,
    createdAt: row.created_at as number,
  };
}
