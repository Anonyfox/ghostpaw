import type { DatabaseHandle } from "../../lib/index.ts";
import type { ListMembersOptions, MemberKind, MemberStatus, PackMemberSummary } from "./types.ts";

export function listMembers(
  db: DatabaseHandle,
  options: ListMembersOptions = {},
): PackMemberSummary[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.status) {
    conditions.push("m.status = ?");
    params.push(options.status);
  }
  if (options.kind) {
    conditions.push("m.kind = ?");
    params.push(options.kind);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT m.id, m.name, m.kind, m.trust, m.status, m.last_contact,
              COUNT(i.id) AS interaction_count
       FROM pack_members m
       LEFT JOIN pack_interactions i ON i.member_id = m.id
       ${where}
       GROUP BY m.id
       ORDER BY m.last_contact DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    kind: row.kind as MemberKind,
    trust: row.trust as number,
    status: row.status as MemberStatus,
    lastContact: row.last_contact as number,
    interactionCount: row.interaction_count as number,
  }));
}
