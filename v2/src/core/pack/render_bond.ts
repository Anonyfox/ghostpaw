import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToContact } from "./row_to_contact.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackContact } from "./types.ts";

export function renderBond(db: DatabaseHandle, memberId: number): string | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(memberId);
  if (!row) return null;

  const member = rowToMember(row as Record<string, unknown>);
  if (member.bond.length === 0) return null;

  const contactRows = db
    .prepare("SELECT * FROM pack_contacts WHERE member_id = ? ORDER BY type, value")
    .all(memberId) as Record<string, unknown>[];
  const contacts: PackContact[] = contactRows.map(rowToContact);

  const lines: string[] = [
    `## ${member.name} (${member.kind})`,
    "",
    member.bond,
    "",
    `Trust: ${member.trust.toFixed(2)} | Status: ${member.status}`,
  ];

  if (contacts.length > 0) {
    lines.push("");
    lines.push(
      `Contacts: ${contacts.map((c) => (c.label ? `${c.type}:${c.value} (${c.label})` : `${c.type}:${c.value}`)).join(", ")}`,
    );
  }

  return lines.join("\n");
}
