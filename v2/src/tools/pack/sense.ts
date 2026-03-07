import { createTool, Schema } from "chatoyant";
import { countMembers, senseMember, sensePack } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemberDetail, formatMemberSummary } from "./format_pack.ts";
import { resolveMember } from "./resolve.ts";

class PackSenseParams extends Schema {
  member = Schema.String({
    optional: true,
    description:
      "Name or numeric ID of a specific member to inspect. " +
      "Omit to get an overview of all active and dormant pack members.",
  });
}

export function createPackSenseTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_sense",
    description:
      "Query the pack — your social world. Without arguments returns an overview of all " +
      "active and dormant members with trust levels and last contact. Pass a member name " +
      "or ID to get their full profile, contacts, and recent interactions.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackSenseParams() as any,
    execute: async ({ args }) => {
      const { member: memberRef } = args as { member?: string };

      if (!memberRef || !memberRef.trim()) {
        const summaries = sensePack(db);
        const counts = countMembers(db);
        const now = Date.now();

        const members = summaries.map((s) =>
          formatMemberSummary(
            {
              id: s.id,
              name: s.name,
              kind: s.kind,
              bond: "",
              trust: s.trust,
              status: s.status,
              isUser: false,
              firstContact: 0,
              lastContact: s.lastContact,
              createdAt: 0,
              updatedAt: 0,
            },
            s.interactionCount,
            now,
          ),
        );

        if (members.length === 0) {
          return {
            members: [],
            counts,
            note: "No pack members yet. Use pack_meet to add someone.",
          };
        }

        return { members, counts };
      }

      const resolved = resolveMember(db, memberRef);
      if (!resolved) {
        return {
          error:
            `Member '${memberRef.trim()}' not found. ` +
            "Use pack_sense without arguments to see all members.",
        };
      }

      const detail = senseMember(db, resolved.id);
      if (!detail) {
        return { error: `Member '${memberRef.trim()}' not found.` };
      }

      const now = Date.now();
      return formatMemberDetail(detail.member, detail.interactions, now, detail.contacts);
    },
  });
}
