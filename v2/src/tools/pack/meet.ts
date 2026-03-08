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
      "What kind of being this is: 'human', 'group', 'ghostpaw', 'agent', 'service', or 'other'. " +
      "Default: 'human'. Use 'group' for companies, teams, families, communities.",
  });
  bond = Schema.String({
    optional: true,
    description:
      "Initial bond narrative — a short description of your relationship or how you met.",
  });
  nickname = Schema.String({
    optional: true,
    description: "Informal short name or alias.",
  });
  parent_id = Schema.Number({
    optional: true,
    description: "ID of a parent group member (e.g. parent company, parent team).",
  });
  tags = Schema.String({
    optional: true,
    description:
      "Comma-separated tags to set on the new member. " +
      "Common tags: client, prospect, lead, partner, vendor, family, friend, colleague, vip.",
  });
  timezone = Schema.String({ optional: true, description: "IANA timezone, e.g. 'Europe/Berlin'." });
  locale = Schema.String({ optional: true, description: "Locale code, e.g. 'de-DE'." });
  location = Schema.String({ optional: true, description: "City or region." });
  address = Schema.String({ optional: true, description: "Full address." });
  pronouns = Schema.String({ optional: true, description: "Pronouns, e.g. 'she/her'." });
  birthday = Schema.String({ optional: true, description: "Birthday in ISO format YYYY-MM-DD." });
}

export function createPackMeetTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_meet",
    description:
      "Register a new being in your pack. Provide a name and optionally a kind, bond " +
      "narrative, tags, and profile fields. Returns the created member. " +
      "Fails if a member with that name already exists.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackMeetParams() as any,
    execute: async ({ args }) => {
      const {
        name,
        kind,
        bond,
        nickname,
        parent_id: parentId,
        tags: tagsStr,
        timezone,
        locale,
        location,
        address,
        pronouns,
        birthday,
      } = args as {
        name: string;
        kind?: MemberKind;
        bond?: string;
        nickname?: string;
        parent_id?: number;
        tags?: string;
        timezone?: string;
        locale?: string;
        location?: string;
        address?: string;
        pronouns?: string;
        birthday?: string;
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

      const tags = tagsStr
        ? tagsStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      try {
        const member = meetMember(db, {
          name: name.trim(),
          kind: kind ?? "human",
          bond,
          nickname,
          parentId,
          tags,
          timezone,
          locale,
          location,
          address,
          pronouns,
          birthday,
        });
        return { member: formatMemberSummary(member, 0) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to meet member: ${detail}` };
      }
    },
  });
}
