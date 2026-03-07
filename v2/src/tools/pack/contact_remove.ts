import { createTool, Schema } from "chatoyant";
import { removeContact } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ContactRemoveParams extends Schema {
  contact_id = Schema.Number({
    description: "The numeric ID of the contact to remove.",
  });
}

export function createContactRemoveTool(db: DatabaseHandle) {
  return createTool({
    name: "contact_remove",
    description: "Remove a contact from a pack member by its contact ID.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ContactRemoveParams() as any,
    execute: async ({ args }) => {
      const { contact_id: contactId } = args as { contact_id: number };

      try {
        removeContact(db, contactId);
        return { removed: true, contact_id: contactId };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
