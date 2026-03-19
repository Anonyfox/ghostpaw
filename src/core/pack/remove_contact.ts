import type { DatabaseHandle } from "../../lib/index.ts";

export function removeContact(db: DatabaseHandle, contactId: number): void {
  const existing = db.prepare("SELECT id FROM pack_contacts WHERE id = ?").get(contactId);
  if (!existing) {
    throw new Error(`Contact with id ${contactId} not found.`);
  }
  db.prepare("DELETE FROM pack_contacts WHERE id = ?").run(contactId);
}
