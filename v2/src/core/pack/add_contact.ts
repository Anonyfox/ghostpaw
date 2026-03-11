import type { DatabaseHandle } from "../../lib/index.ts";
import { normalizeContactValue } from "./normalize_contact_value.ts";
import { rowToContact } from "./row_to_contact.ts";
import type { AddContactInput, PackContact } from "./types.ts";
import { CONTACT_TYPES } from "./types.ts";

export interface AddContactResult {
  contact: PackContact;
  conflict: { existingMemberId: number } | null;
}

export function addContact(db: DatabaseHandle, input: AddContactInput): AddContactResult {
  if (!CONTACT_TYPES.includes(input.type)) {
    throw new Error(
      `Invalid contact type "${input.type}". Must be one of: ${CONTACT_TYPES.join(", ")}.`,
    );
  }

  const value = normalizeContactValue(input.type, input.value);
  if (!value) {
    throw new Error("Contact value must not be empty.");
  }

  const member = db.prepare("SELECT id FROM pack_members WHERE id = ?").get(input.memberId);
  if (!member) {
    throw new Error(`Pack member with id ${input.memberId} not found.`);
  }

  const existing = db
    .prepare("SELECT * FROM pack_contacts WHERE type = ? AND value = ?")
    .get(input.type, value) as Record<string, unknown> | undefined;

  if (existing) {
    const existingContact = rowToContact(existing);
    if (existingContact.memberId === input.memberId) {
      return { contact: existingContact, conflict: null };
    }
    return { contact: existingContact, conflict: { existingMemberId: existingContact.memberId } };
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO pack_contacts (member_id, type, value, label, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.memberId, input.type, value, input.label ?? null, now);

  const row = db.prepare("SELECT * FROM pack_contacts WHERE id = ?").get(lastInsertRowid);
  return { contact: rowToContact(row as Record<string, unknown>), conflict: null };
}
