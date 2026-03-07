import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { ContactType, PackMember } from "./types.ts";
import { CONTACT_TYPES } from "./types.ts";

export function lookupContact(
  db: DatabaseHandle,
  type: ContactType,
  value: string,
): PackMember | null {
  if (!CONTACT_TYPES.includes(type)) {
    throw new Error(`Invalid contact type "${type}". Must be one of: ${CONTACT_TYPES.join(", ")}.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Contact value must not be empty.");
  }

  const row = db
    .prepare(
      `SELECT m.* FROM pack_members m
       JOIN pack_contacts c ON c.member_id = m.id
       WHERE c.type = ? AND c.value = ?`,
    )
    .get(type, trimmed) as Record<string, unknown> | undefined;

  return row ? rowToMember(row) : null;
}
