import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToContact } from "./internal/rows/row_to_contact.ts";
import { rowToField } from "./internal/rows/row_to_field.ts";
import { rowToInteraction } from "./internal/rows/row_to_interaction.ts";
import { rowToLink } from "./internal/rows/row_to_link.ts";
import { rowToMember } from "./internal/rows/row_to_member.ts";
import type { MemberDetail } from "./types.ts";

const DEFAULT_INTERACTION_LIMIT = 20;

export function senseMember(
  db: DatabaseHandle,
  id: number,
  interactionLimit: number = DEFAULT_INTERACTION_LIMIT,
): MemberDetail | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id);
  if (!row) return null;

  const member = rowToMember(row as Record<string, unknown>);

  const interactionRows = db
    .prepare("SELECT * FROM pack_interactions WHERE member_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(id, interactionLimit) as Record<string, unknown>[];

  const contactRows = db
    .prepare("SELECT * FROM pack_contacts WHERE member_id = ? ORDER BY type, value")
    .all(id) as Record<string, unknown>[];

  const fieldRows = db
    .prepare("SELECT * FROM pack_fields WHERE member_id = ? ORDER BY key")
    .all(id) as Record<string, unknown>[];

  const linkRows = db
    .prepare("SELECT * FROM pack_links WHERE member_id = ? ORDER BY label, target_id")
    .all(id) as Record<string, unknown>[];

  return {
    member,
    interactions: interactionRows.map(rowToInteraction),
    contacts: contactRows.map(rowToContact),
    fields: fieldRows.map(rowToField),
    links: linkRows.map(rowToLink),
  };
}
