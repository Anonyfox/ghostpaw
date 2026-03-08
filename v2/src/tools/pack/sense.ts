import { createTool, Schema } from "chatoyant";
import {
  countMembers,
  listMembers,
  packDigest,
  resolveNames,
  senseMember,
} from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemberDetail, relativeTime } from "./format_pack.ts";
import { resolveMember } from "./resolve.ts";
import { trustLabel } from "./trust_label.ts";

class PackSenseParams extends Schema {
  member = Schema.String({
    optional: true,
    description:
      "Name or numeric ID of a specific member to inspect. " +
      "Omit to get an overview of all active and dormant pack members.",
  });
  field = Schema.String({
    optional: true,
    description:
      "Filter overview by tag or field key (e.g. 'client', 'vip'). " +
      "Only members with this tag/field are returned. Ignored when inspecting a specific member.",
  });
  group_id = Schema.Number({
    optional: true,
    description:
      "Filter overview to members linked to this group member ID. " +
      "Ignored when inspecting a specific member.",
  });
  limit = Schema.Number({
    optional: true,
    description:
      "Max members to return in overview (default: 50, max: 200). " +
      "Ignored when inspecting a specific member.",
  });
  patrol = Schema.Boolean({
    optional: true,
    description:
      "Set to true to get a patrol digest of drifting bonds and upcoming landmarks. " +
      "Exclusive with member — patrol takes priority.",
  });
  search = Schema.String({
    optional: true,
    description:
      "Keyword to search across member names, nicknames, bond narratives, and custom fields. " +
      "Use to find members matching a need, including dormant ties.",
  });
}

export function createPackSenseTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_sense",
    description:
      "Query the pack — your social world. Without arguments returns an overview of all " +
      "active and dormant members with trust levels and last contact (default 50, max 200). " +
      "Pass a member name or ID to get their full profile with up to 20 recent interactions. " +
      "Filter the overview by tag/field, group, or keyword search. " +
      "Use patrol=true to get a digest of drifting bonds and upcoming landmarks.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackSenseParams() as any,
    execute: async ({ args }) => {
      const {
        member: memberRef,
        field,
        group_id: groupId,
        limit: rawLimit,
        patrol: isPatrol,
        search,
      } = args as {
        member?: string;
        field?: string;
        group_id?: number;
        limit?: number;
        patrol?: boolean;
        search?: string;
      };

      if (isPatrol) {
        const digest = packDigest(db);
        return {
          drift: digest.drift.map((d) => ({
            name: d.name,
            trust: d.trust,
            tier: d.tier,
            days_silent: d.daysSilent,
          })),
          landmarks: digest.landmarks.map((l) => ({
            name: l.name,
            type: l.type,
            date: l.date,
            days_away: l.daysAway,
            ...(l.yearsAgo !== undefined ? { years_ago: l.yearsAgo } : {}),
            ...(l.summary ? { summary: l.summary } : {}),
          })),
          stats: {
            active: digest.stats.activeMembers,
            dormant: digest.stats.dormantMembers,
            recent_interactions_30d: digest.stats.recentInteractions,
            average_trust: digest.stats.averageTrust,
          },
        };
      }

      if (!memberRef || !memberRef.trim()) {
        const hasFilters = !!(field || groupId || search);
        const cap = Math.min(200, Math.max(1, rawLimit ?? 50));
        const summaries = listMembers(db, {
          status: ["active", "dormant"],
          field,
          groupId,
          search,
          limit: cap,
        });
        const counts = countMembers(db);
        const now = Date.now();

        if (summaries.length === 0) {
          return {
            members: [],
            counts,
            note: hasFilters
              ? "No members match the filter."
              : "No pack members yet. Use pack_meet to add someone.",
          };
        }

        return {
          members: summaries.map((s) => ({
            id: s.id,
            name: s.name,
            nickname: s.nickname,
            kind: s.kind,
            trust: Math.round(s.trust * 100) / 100,
            trust_level: trustLabel(s.trust),
            status: s.status,
            last_contact: relativeTime(s.lastContact, now),
            interactions: s.interactionCount,
          })),
          counts,
          ...(summaries.length >= cap ? { truncated: true, showing: cap } : {}),
        };
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

      const targetIds = detail.links.map((l) => l.targetId);
      const nameMap = resolveNames(db, targetIds);

      return formatMemberDetail({
        member: detail.member,
        interactions: detail.interactions,
        contacts: detail.contacts,
        fields: detail.fields,
        links: detail.links,
        resolveTargetName: (id) => nameMap.get(id) ?? `#${id}`,
      });
    },
  });
}
