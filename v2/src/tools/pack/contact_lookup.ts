import { createTool, Schema } from "chatoyant";
import { CONTACT_TYPES } from "../../core/pack/api/constants.ts";
import { lookupContact } from "../../core/pack/api/read/index.ts";
import type { ContactType } from "../../core/pack/api/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ContactLookupParams extends Schema {
  type = Schema.Enum(CONTACT_TYPES, {
    description: "Contact type to search for (e.g. 'email', 'telegram').",
  });
  value = Schema.String({
    description: "The contact value to look up (e.g. an email address, a Telegram ID).",
  });
}

export function createContactLookupTool(db: DatabaseHandle) {
  return createTool({
    name: "contact_lookup",
    description:
      "Reverse-lookup: find which pack member owns a given contact. " +
      "Returns the member if found, null otherwise. Useful for cross-channel identity resolution.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ContactLookupParams() as any,
    execute: async ({ args }) => {
      const { type, value } = args as { type: ContactType; value: string };

      try {
        const member = lookupContact(db, type, value);
        if (!member) {
          return { found: false, message: `No member found with ${type}:${value}.` };
        }
        return {
          found: true,
          member: {
            id: member.id,
            name: member.name,
            kind: member.kind,
            trust: member.trust,
            status: member.status,
          },
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
