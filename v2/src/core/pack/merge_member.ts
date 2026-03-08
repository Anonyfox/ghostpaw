import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackMember } from "./types.ts";

export function mergeMember(db: DatabaseHandle, keepId: number, mergeId: number): PackMember {
  if (keepId === mergeId) {
    throw new Error("Cannot merge a member with itself.");
  }

  const keepRow = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(keepId) as
    | Record<string, unknown>
    | undefined;
  const mergeRow = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(mergeId) as
    | Record<string, unknown>
    | undefined;

  if (!keepRow) throw new Error(`Pack member with id ${keepId} not found.`);
  if (!mergeRow) throw new Error(`Pack member with id ${mergeId} not found.`);

  const keep = rowToMember(keepRow);
  const merge = rowToMember(mergeRow);

  if (merge.status === "lost") {
    throw new Error(`Pack member ${mergeId} is already lost — cannot merge.`);
  }

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE pack_interactions SET member_id = ? WHERE member_id = ?").run(
      keepId,
      mergeId,
    );

    const mergeContacts = db
      .prepare("SELECT id, type, value FROM pack_contacts WHERE member_id = ?")
      .all(mergeId) as { id: number; type: string; value: string }[];

    for (const c of mergeContacts) {
      const conflict = db
        .prepare("SELECT id FROM pack_contacts WHERE type = ? AND value = ? AND member_id = ?")
        .get(c.type, c.value, keepId);
      if (conflict) {
        db.prepare("DELETE FROM pack_contacts WHERE id = ?").run(c.id);
      } else {
        db.prepare("UPDATE pack_contacts SET member_id = ? WHERE id = ?").run(keepId, c.id);
      }
    }

    // Migrate fields: keep survivor's version on conflict
    const mergeFields = db
      .prepare("SELECT key, value, updated_at FROM pack_fields WHERE member_id = ?")
      .all(mergeId) as { key: string; value: string | null; updated_at: number }[];

    for (const f of mergeFields) {
      const existing = db
        .prepare("SELECT 1 FROM pack_fields WHERE member_id = ? AND key = ?")
        .get(keepId, f.key);
      if (!existing) {
        db.prepare(
          "INSERT INTO pack_fields (member_id, key, value, updated_at) VALUES (?, ?, ?, ?)",
        ).run(keepId, f.key, f.value, f.updated_at);
      }
    }
    db.prepare("DELETE FROM pack_fields WHERE member_id = ?").run(mergeId);

    // Migrate links: reparent from merge→target to keep→target, skip conflicts
    const mergeLinks = db
      .prepare(
        "SELECT id, target_id, label, role, active, created_at, updated_at FROM pack_links WHERE member_id = ?",
      )
      .all(mergeId) as Record<string, unknown>[];

    for (const l of mergeLinks) {
      const conflict = db
        .prepare("SELECT 1 FROM pack_links WHERE member_id = ? AND target_id = ? AND label = ?")
        .get(keepId, l.target_id, l.label);
      if (!conflict) {
        db.prepare("UPDATE pack_links SET member_id = ? WHERE id = ?").run(keepId, l.id);
      } else {
        db.prepare("DELETE FROM pack_links WHERE id = ?").run(l.id);
      }
    }
    // Also reparent links pointing TO the merged member
    db.prepare("UPDATE pack_links SET target_id = ? WHERE target_id = ?").run(keepId, mergeId);

    const firstContact = Math.min(keep.firstContact, merge.firstContact);
    const lastContact = Math.max(keep.lastContact, merge.lastContact);
    const trust = Math.max(keep.trust, merge.trust);

    let bond = keep.bond;
    if (merge.bond) {
      bond = bond ? `${bond}\n\n--- merged from ${merge.name} ---\n${merge.bond}` : merge.bond;
    }

    const now = Date.now();
    db.prepare(
      `UPDATE pack_members
       SET first_contact = ?, last_contact = ?, trust = ?, bond = ?, updated_at = ?
       WHERE id = ?`,
    ).run(firstContact, lastContact, trust, bond, now, keepId);

    db.prepare("UPDATE pack_members SET status = 'lost', updated_at = ? WHERE id = ?").run(
      now,
      mergeId,
    );

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const updated = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(keepId);
  return rowToMember(updated as Record<string, unknown>);
}
