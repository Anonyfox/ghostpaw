import { createTool, Schema } from "chatoyant";
import { CONTACT_TYPES } from "../../core/pack/api/constants.ts";
import type { ContactType } from "../../core/pack/api/types.ts";
import { addContact } from "../../core/pack/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMember } from "./resolve.ts";

class ContactAddParams extends Schema {
  member = Schema.String({
    description: "Name or numeric ID of the member to add the contact to.",
  });
  type = Schema.Enum(CONTACT_TYPES, {
    description: "Contact type: email, phone, telegram, github, etc.",
  });
  value = Schema.String({
    description: "The contact value — an email address, phone number, handle, URL, etc.",
  });
  label = Schema.String({
    optional: true,
    description:
      "Optional label to distinguish multiples of the same type (e.g. 'work', 'personal').",
  });
}

export function createContactAddTool(db: DatabaseHandle) {
  return createTool({
    name: "contact_add",
    description:
      "Add a contact method to a pack member. Each type+value pair is globally unique — " +
      "if another member already owns this contact, a conflict is returned as a merge signal.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ContactAddParams() as any,
    execute: async ({ args }) => {
      const {
        member: memberRef,
        type,
        value,
        label,
      } = args as {
        member: string;
        type: ContactType;
        value: string;
        label?: string;
      };

      const resolved = resolveMember(db, memberRef);
      if (!resolved) {
        return { error: `Member '${memberRef}' not found.` };
      }

      try {
        const result = addContact(db, {
          memberId: resolved.id,
          type,
          value,
          label,
        });

        if (result.conflict) {
          return {
            conflict: true,
            message:
              `Contact ${type}:${value} already belongs to member #${result.conflict.existingMemberId}. ` +
              "This may indicate a duplicate — consider using pack_merge.",
            existing_member_id: result.conflict.existingMemberId,
          };
        }

        return {
          added: {
            id: result.contact.id,
            type: result.contact.type,
            value: result.contact.value,
            label: result.contact.label,
          },
          member_id: resolved.id,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
