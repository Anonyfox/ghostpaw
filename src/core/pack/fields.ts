import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToField } from "./internal/rows/row_to_field.ts";
import type { PackField, PackMemberSummary } from "./types.ts";

export function setField(
  db: DatabaseHandle,
  memberId: number,
  key: string,
  value?: string,
): PackField {
  const trimmedKey = key.trim().toLowerCase();
  if (!trimmedKey) throw new Error("Field key must be non-empty.");
  const now = Date.now();
  const val = value?.trim() || null;
  db.prepare(
    `INSERT INTO pack_fields (member_id, key, value, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (member_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(memberId, trimmedKey, val, now);
  return { key: trimmedKey, value: val, updatedAt: now };
}

export function removeField(db: DatabaseHandle, memberId: number, key: string): void {
  const trimmedKey = key.trim().toLowerCase();
  db.prepare("DELETE FROM pack_fields WHERE member_id = ? AND key = ?").run(memberId, trimmedKey);
}

export function listFields(db: DatabaseHandle, memberId: number): PackField[] {
  const rows = db
    .prepare("SELECT * FROM pack_fields WHERE member_id = ? ORDER BY key")
    .all(memberId) as Record<string, unknown>[];
  return rows.map(rowToField);
}

export function findMembersByField(
  db: DatabaseHandle,
  key: string,
  value?: string,
): PackMemberSummary[] {
  const trimmedKey = key.trim().toLowerCase();
  const base = `SELECT m.id, m.name, m.nickname, m.kind, m.trust, m.status, m.last_contact,
                       COUNT(i.id) AS interaction_count
                FROM pack_members m
                JOIN pack_fields f ON f.member_id = m.id
                LEFT JOIN pack_interactions i ON i.member_id = m.id`;
  const where = value
    ? `WHERE f.key = ? AND f.value = ? AND m.status != 'lost'`
    : `WHERE f.key = ? AND m.status != 'lost'`;
  const tail = `GROUP BY m.id ORDER BY m.last_contact DESC`;
  const sql = `${base} ${where} ${tail}`;

  const params = value ? [trimmedKey, value.trim()] : [trimmedKey];
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    nickname: (r.nickname as string | null) ?? null,
    kind: r.kind as PackMemberSummary["kind"],
    trust: r.trust as number,
    status: r.status as PackMemberSummary["status"],
    lastContact: r.last_contact as number,
    interactionCount: r.interaction_count as number,
  }));
}
