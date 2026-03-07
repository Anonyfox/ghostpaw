import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToContact } from "./row_to_contact.ts";
import { rowToInteraction } from "./row_to_interaction.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackContact, PackInteraction, PackMember } from "./types.ts";

export interface MemberDetail {
  member: PackMember;
  interactions: PackInteraction[];
  contacts: PackContact[];
}

export function senseMember(db: DatabaseHandle, id: number): MemberDetail | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id);
  if (!row) return null;

  const member = rowToMember(row as Record<string, unknown>);

  const interactionRows = db
    .prepare("SELECT * FROM pack_interactions WHERE member_id = ? ORDER BY created_at DESC")
    .all(id) as Record<string, unknown>[];

  const contactRows = db
    .prepare("SELECT * FROM pack_contacts WHERE member_id = ? ORDER BY type, value")
    .all(id) as Record<string, unknown>[];

  return {
    member,
    interactions: interactionRows.map(rowToInteraction),
    contacts: contactRows.map(rowToContact),
  };
}
