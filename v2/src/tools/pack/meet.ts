import { createTool, Schema } from "chatoyant";
import { getMemberByName, MEMBER_KINDS, meetMember } from "../../core/pack/index.ts";
import type { MemberKind } from "../../core/pack/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemberSummary } from "./format_pack.ts";

class PackMeetParams extends Schema {
  name = Schema.String({
    description: "Name of the being to register. Must be unique among active/dormant members.",
  });
  kind = Schema.Enum(MEMBER_KINDS, {
    optional: true,
    description:
      "What kind of being this is: 'human', 'ghostpaw', 'agent', 'service', or 'other'. " +
      "Default: 'human'.",
  });
  bond = Schema.String({
    optional: true,
    description:
      "Initial bond narrative — a short description of your relationship or how you met.",
  });
}

export function createPackMeetTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_meet",
    description:
      "Register a new being in your pack. Provide a name and optionally a kind and bond " +
      "narrative. Returns the created member. Fails if a member with that name already exists.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackMeetParams() as any,
    execute: async ({ args }) => {
      const { name, kind, bond } = args as {
        name: string;
        kind?: MemberKind;
        bond?: string;
      };

      if (!name || !name.trim()) {
        return { error: "Name must not be empty." };
      }

      const existing = getMemberByName(db, name.trim());
      if (existing) {
        return {
          error:
            `A member named '${existing.name}' already exists (ID ${existing.id}). ` +
            "Use pack_bond to update them.",
        };
      }

      try {
        const member = meetMember(db, {
          name: name.trim(),
          kind: kind ?? "human",
          bond,
        });
        return { member: formatMemberSummary(member, 0) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to meet member: ${detail}` };
      }
    },
  });
}
