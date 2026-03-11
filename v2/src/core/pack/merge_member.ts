import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackMember } from "./types.ts";

type MemberTextField =
  | "nickname"
  | "timezone"
  | "locale"
  | "location"
  | "address"
  | "pronouns"
  | "birthday";

type PackFieldRow = {
  key: string;
  value: string | null;
  updated_at: number;
};

type PackLinkRow = {
  id: number;
  member_id: number;
  target_id: number;
  label: string;
  role: string | null;
  active: number;
  created_at: number;
  updated_at: number;
};

interface MergeValueResult {
  value: string | null;
  preservedConflict: string | null;
}

const MEMBER_TEXT_FIELDS: MemberTextField[] = [
  "nickname",
  "timezone",
  "locale",
  "location",
  "address",
  "pronouns",
  "birthday",
];

function mergeTextValue(
  label: string,
  keepValue: string | null,
  mergeValue: string | null,
  keepUpdatedAt: number,
  mergeUpdatedAt: number,
): MergeValueResult {
  if (keepValue === mergeValue) {
    return { value: keepValue, preservedConflict: null };
  }
  if (keepValue === null) {
    return { value: mergeValue, preservedConflict: null };
  }
  if (mergeValue === null) {
    return { value: keepValue, preservedConflict: null };
  }

  if (mergeUpdatedAt > keepUpdatedAt) {
    return {
      value: mergeValue,
      preservedConflict: `${label}: kept "${mergeValue}", replaced "${keepValue}"`,
    };
  }

  return {
    value: keepValue,
    preservedConflict: `${label}: kept "${keepValue}", also had "${mergeValue}"`,
  };
}

function chooseParentId(keep: PackMember, merge: PackMember): number | null {
  const keepParent =
    keep.parentId === keep.id || keep.parentId === merge.id ? null : keep.parentId;
  const mergeParent =
    merge.parentId === keep.id || merge.parentId === merge.id ? null : merge.parentId;

  if (keepParent === null) {
    return mergeParent;
  }
  if (mergeParent === null) {
    return keepParent;
  }
  return merge.updatedAt > keep.updatedAt ? mergeParent : keepParent;
}

function mergeRoles(
  keepRole: string | null,
  mergeRole: string | null,
  keepUpdatedAt: number,
  mergeUpdatedAt: number,
): string | null {
  if (keepRole === mergeRole) return keepRole;
  if (keepRole === null) return mergeRole;
  if (mergeRole === null) return keepRole;
  return mergeUpdatedAt > keepUpdatedAt ? mergeRole : keepRole;
}

function mergeLinksOnConflict(db: DatabaseHandle, survivor: PackLinkRow, duplicate: PackLinkRow): void {
  const mergedRole = mergeRoles(
    survivor.role,
    duplicate.role,
    survivor.updated_at,
    duplicate.updated_at,
  );
  const active = survivor.active === 1 || duplicate.active === 1 ? 1 : 0;
  const createdAt = Math.min(survivor.created_at, duplicate.created_at);
  const updatedAt = Math.max(survivor.updated_at, duplicate.updated_at);

  db.prepare(
    `UPDATE pack_links
     SET role = ?, active = ?, created_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(mergedRole, active, createdAt, updatedAt, survivor.id);
  db.prepare("DELETE FROM pack_links WHERE id = ?").run(duplicate.id);
}

function moveLink(
  db: DatabaseHandle,
  link: PackLinkRow,
  memberId: number,
  targetId: number,
): void {
  if (memberId === targetId) {
    db.prepare("DELETE FROM pack_links WHERE id = ?").run(link.id);
    return;
  }

  const conflict = db
    .prepare(
      `SELECT id, member_id, target_id, label, role, active, created_at, updated_at
       FROM pack_links
       WHERE member_id = ? AND target_id = ? AND label = ? AND id != ?`,
    )
    .get(memberId, targetId, link.label, link.id) as PackLinkRow | undefined;

  if (!conflict) {
    db.prepare("UPDATE pack_links SET member_id = ?, target_id = ? WHERE id = ?").run(
      memberId,
      targetId,
      link.id,
    );
    return;
  }

  mergeLinksOnConflict(db, conflict, link);
}

function buildMergedBond(
  keep: PackMember,
  merge: PackMember,
  preservedConflicts: string[],
): string {
  const sections: string[] = [];
  if (keep.bond) {
    sections.push(keep.bond);
  }

  const mergeLines = [`--- merged from ${merge.name} (#${merge.id}) ---`];
  if (merge.bond) {
    mergeLines.push(merge.bond);
  }
  if (preservedConflicts.length > 0) {
    mergeLines.push(...preservedConflicts.map((line) => `preserved: ${line}`));
  }
  if (mergeLines.length > 1) {
    sections.push(mergeLines.join("\n"));
  }

  return sections.join("\n\n");
}

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

  if (keep.status === "lost") {
    throw new Error(`Pack member ${keepId} is lost — cannot merge into it.`);
  }
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
      .all(mergeId) as PackFieldRow[];
    const preservedConflicts: string[] = [];

    for (const f of mergeFields) {
      const existing = db
        .prepare("SELECT key, value, updated_at FROM pack_fields WHERE member_id = ? AND key = ?")
        .get(keepId, f.key) as PackFieldRow | undefined;
      if (!existing) {
        db.prepare("UPDATE pack_fields SET member_id = ? WHERE member_id = ? AND key = ?").run(
          keepId,
          mergeId,
          f.key,
        );
        continue;
      }

      const mergedField = mergeTextValue(
        `field:${f.key}`,
        existing.value,
        f.value,
        existing.updated_at,
        f.updated_at,
      );
      if (mergedField.preservedConflict) {
        preservedConflicts.push(mergedField.preservedConflict);
      }
      db.prepare("UPDATE pack_fields SET value = ?, updated_at = ? WHERE member_id = ? AND key = ?").run(
        mergedField.value,
        Math.max(existing.updated_at, f.updated_at),
        keepId,
        f.key,
      );
      db.prepare("DELETE FROM pack_fields WHERE member_id = ? AND key = ?").run(mergeId, f.key);
    }

    // Migrate links: reparent from merge→target to keep→target, skip conflicts
    const mergeLinks = db
      .prepare(
        `SELECT id, member_id, target_id, label, role, active, created_at, updated_at
         FROM pack_links WHERE member_id = ?`,
      )
      .all(mergeId) as PackLinkRow[];

    for (const l of mergeLinks) {
      moveLink(db, l, keepId, l.target_id);
    }

    const incomingLinks = db
      .prepare(
        `SELECT id, member_id, target_id, label, role, active, created_at, updated_at
         FROM pack_links WHERE target_id = ?`,
      )
      .all(mergeId) as PackLinkRow[];
    for (const l of incomingLinks) {
      moveLink(db, l, l.member_id, keepId);
    }

    const firstContact = Math.min(keep.firstContact, merge.firstContact);
    const lastContact = Math.max(keep.lastContact, merge.lastContact);
    const trust = Math.max(keep.trust, merge.trust);
    const canonicalValues = new Map<MemberTextField, string | null>();
    for (const field of MEMBER_TEXT_FIELDS) {
      const mergedValue = mergeTextValue(
        field,
        keep[field],
        merge[field],
        keep.updatedAt,
        merge.updatedAt,
      );
      canonicalValues.set(field, mergedValue.value);
      if (mergedValue.preservedConflict) {
        preservedConflicts.push(mergedValue.preservedConflict);
      }
    }
    const parentId = chooseParentId(keep, merge);
    const bond = buildMergedBond(keep, merge, preservedConflicts);

    const now = Date.now();
    db.prepare("UPDATE pack_members SET parent_id = ? WHERE parent_id = ? AND id != ?").run(
      keepId,
      mergeId,
      keepId,
    );
    db.prepare(
      `UPDATE pack_members
       SET nickname = ?, parent_id = ?, timezone = ?, locale = ?, location = ?, address = ?,
           pronouns = ?, birthday = ?, first_contact = ?, last_contact = ?, trust = ?, bond = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      canonicalValues.get("nickname") ?? null,
      parentId,
      canonicalValues.get("timezone") ?? null,
      canonicalValues.get("locale") ?? null,
      canonicalValues.get("location") ?? null,
      canonicalValues.get("address") ?? null,
      canonicalValues.get("pronouns") ?? null,
      canonicalValues.get("birthday") ?? null,
      firstContact,
      lastContact,
      trust,
      bond,
      now,
      keepId,
    );

    db.prepare("UPDATE pack_members SET status = 'lost', parent_id = NULL, updated_at = ? WHERE id = ?").run(
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
