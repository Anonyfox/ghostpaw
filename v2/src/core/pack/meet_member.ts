import type { DatabaseHandle } from "../../lib/index.ts";
import { setField } from "./fields.ts";
import { rowToMember } from "./row_to_member.ts";
import type { MeetInput, PackMember } from "./types.ts";
import { MEMBER_KINDS } from "./types.ts";
import { validateMemberName } from "./validate_member_name.ts";

export function meetMember(db: DatabaseHandle, input: MeetInput): PackMember {
  const name = validateMemberName(input.name);

  if (!MEMBER_KINDS.includes(input.kind)) {
    throw new Error(
      `Invalid member kind "${input.kind}". Must be one of: ${MEMBER_KINDS.join(", ")}.`,
    );
  }

  const now = Date.now();
  const bond = input.bond?.trim() ?? "";
  const isUser = input.isUser ? 1 : 0;

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO pack_members
       (name, nickname, kind, bond, trust, status, is_user, parent_id,
        timezone, locale, location, address, pronouns, birthday,
        first_contact, last_contact, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0.5, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      input.nickname?.trim() || null,
      input.kind,
      bond,
      isUser,
      input.parentId ?? null,
      input.timezone?.trim() || null,
      input.locale?.trim() || null,
      input.location?.trim() || null,
      input.address?.trim() || null,
      input.pronouns?.trim() || null,
      input.birthday?.trim() || null,
      now,
      now,
      now,
      now,
    );

  const memberId = Number(lastInsertRowid);

  if (input.tags && input.tags.length > 0) {
    for (const tag of input.tags) {
      if (tag.trim()) setField(db, memberId, tag);
    }
  }

  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(memberId);
  return rowToMember(row as Record<string, unknown>);
}
