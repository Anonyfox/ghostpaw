import { createTool, Schema } from "chatoyant";
import { CONTACT_TYPES, listContacts } from "../../core/pack/index.ts";
import type { ContactType } from "../../core/pack/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatContact } from "./format_pack.ts";
import { resolveMember } from "./resolve.ts";

class ContactListParams extends Schema {
  member = Schema.String({
    description: "Name or numeric ID of the member whose contacts to list.",
  });
  type = Schema.Enum(CONTACT_TYPES, {
    optional: true,
    description: "Filter by contact type (e.g. 'email', 'telegram').",
  });
}

export function createContactListTool(db: DatabaseHandle) {
  return createTool({
    name: "contact_list",
    description: "List all contacts for a pack member, optionally filtered by type.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ContactListParams() as any,
    execute: async ({ args }) => {
      const { member: memberRef, type } = args as {
        member: string;
        type?: ContactType;
      };

      const resolved = resolveMember(db, memberRef);
      if (!resolved) {
        return { error: `Member '${memberRef}' not found.` };
      }

      const contacts = listContacts(db, resolved.id, type ? { type } : undefined);
      return {
        member_id: resolved.id,
        member_name: resolved.name,
        contacts: contacts.map((c) => ({ id: c.id, ...formatContact(c) })),
      };
    },
  });
}
