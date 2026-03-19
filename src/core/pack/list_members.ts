import type { DatabaseHandle } from "../../lib/index.ts";
import type { ListMembersOptions, MemberKind, MemberStatus, PackMemberSummary } from "./types.ts";

export function listMembers(
  db: DatabaseHandle,
  options: ListMembersOptions = {},
): PackMemberSummary[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.status) {
    if (Array.isArray(options.status)) {
      const placeholders = options.status.map(() => "?").join(", ");
      conditions.push(`m.status IN (${placeholders})`);
      params.push(...options.status);
    } else {
      conditions.push("m.status = ?");
      params.push(options.status);
    }
  }
  if (options.kind) {
    conditions.push("m.kind = ?");
    params.push(options.kind);
  }
  if (options.field) {
    conditions.push("EXISTS (SELECT 1 FROM pack_fields WHERE member_id = m.id AND key = ?)");
    params.push(options.field.trim().toLowerCase());
  }
  if (options.groupId) {
    conditions.push(
      "EXISTS (SELECT 1 FROM pack_links WHERE member_id = m.id AND target_id = ? AND active = 1)",
    );
    params.push(options.groupId);
  }
  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      `(m.name LIKE ? OR m.nickname LIKE ? OR m.bond LIKE ?
        OR EXISTS (SELECT 1 FROM pack_fields WHERE member_id = m.id
          AND (key LIKE ? OR value LIKE ?)))`,
    );
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(
      `SELECT m.id, m.name, m.nickname, m.kind, m.trust, m.status, m.last_contact,
              (SELECT COUNT(*) FROM pack_interactions WHERE member_id = m.id) AS interaction_count
       FROM pack_members m
       ${where}
       ORDER BY m.last_contact DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    nickname: (row.nickname as string | null) ?? null,
    kind: row.kind as MemberKind,
    trust: row.trust as number,
    status: row.status as MemberStatus,
    lastContact: row.last_contact as number,
    interactionCount: row.interaction_count as number,
  }));
}
