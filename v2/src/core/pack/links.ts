import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToLink } from "./internal/rows/row_to_link.ts";
import type { PackLink } from "./types.ts";

export function addLink(
  db: DatabaseHandle,
  memberId: number,
  targetId: number,
  label: string,
  role?: string,
): PackLink {
  const trimmedLabel = label.trim().toLowerCase();
  if (!trimmedLabel) throw new Error("Link label must be non-empty.");
  if (memberId === targetId) throw new Error("Cannot link a member to itself.");
  const now = Date.now();
  const trimmedRole = role?.trim() || null;
  db.prepare(
    `INSERT INTO pack_links (member_id, target_id, label, role, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)
     ON CONFLICT (member_id, target_id, label)
     DO UPDATE SET role = excluded.role, active = 1, updated_at = excluded.updated_at`,
  ).run(memberId, targetId, trimmedLabel, trimmedRole, now, now);
  const row = db
    .prepare("SELECT * FROM pack_links WHERE member_id = ? AND target_id = ? AND label = ?")
    .get(memberId, targetId, trimmedLabel) as Record<string, unknown>;
  return rowToLink(row);
}

export function removeLink(
  db: DatabaseHandle,
  memberId: number,
  targetId: number,
  label: string,
): void {
  db.prepare("DELETE FROM pack_links WHERE member_id = ? AND target_id = ? AND label = ?").run(
    memberId,
    targetId,
    label.trim().toLowerCase(),
  );
}

export function deactivateLink(
  db: DatabaseHandle,
  memberId: number,
  targetId: number,
  label: string,
): void {
  const trimmedLabel = label.trim().toLowerCase();
  const now = Date.now();
  db.prepare(
    "UPDATE pack_links SET active = 0, updated_at = ? WHERE member_id = ? AND target_id = ? AND label = ?",
  ).run(now, memberId, targetId, trimmedLabel);
}

export function listLinks(db: DatabaseHandle, memberId: number): PackLink[] {
  const rows = db
    .prepare("SELECT * FROM pack_links WHERE member_id = ? ORDER BY label, target_id")
    .all(memberId) as Record<string, unknown>[];
  return rows.map(rowToLink);
}

export function listLinkedMembers(
  db: DatabaseHandle,
  targetId: number,
  label?: string,
): PackLink[] {
  if (label) {
    const rows = db
      .prepare("SELECT * FROM pack_links WHERE target_id = ? AND label = ? ORDER BY member_id")
      .all(targetId, label.trim().toLowerCase()) as Record<string, unknown>[];
    return rows.map(rowToLink);
  }
  const rows = db
    .prepare("SELECT * FROM pack_links WHERE target_id = ? ORDER BY label, member_id")
    .all(targetId) as Record<string, unknown>[];
  return rows.map(rowToLink);
}
