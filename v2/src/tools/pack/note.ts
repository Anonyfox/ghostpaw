import { createTool, Schema } from "chatoyant";
import { INTERACTION_KINDS } from "../../core/pack/api/constants.ts";
import { countInteractions } from "../../core/pack/api/read/index.ts";
import type { InteractionKind } from "../../core/pack/api/types.ts";
import { noteInteraction } from "../../core/pack/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatInteraction } from "./format_pack.ts";
import { resolveMember } from "./resolve.ts";

class PackNoteParams extends Schema {
  member = Schema.String({
    description: "Name or numeric ID of the member this interaction is with.",
  });
  summary = Schema.String({
    description:
      "What happened and why it mattered. Write a clear, self-contained sentence or two.",
  });
  kind = Schema.Enum(INTERACTION_KINDS, {
    optional: true,
    description:
      "Type of interaction: 'conversation', 'correction', 'conflict', 'gift', " +
      "'milestone', 'observation', 'transaction', or 'activity'. Default: 'conversation'.",
  });
  significance = Schema.Number({
    optional: true,
    description:
      "How significant was this interaction, from 0 (trivial) to 1 (life-changing). " +
      "Default: 0.5.",
  });
  occurred_at = Schema.String({
    optional: true,
    description:
      "Date when this event actually happened, if different from today (YYYY-MM-DD). " +
      "Use for historical milestones, past transactions, or events with a known date.",
  });
}

export function createPackNoteTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_note",
    description:
      "Record a meaningful interaction with a pack member. Provide who, what happened, and " +
      "optionally the kind and significance. This updates the member's last contact time.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackNoteParams() as any,
    execute: async ({ args }) => {
      const {
        member: memberRef,
        summary,
        kind,
        significance,
        occurred_at: occurredAtStr,
      } = args as {
        member: string;
        summary: string;
        kind?: InteractionKind;
        significance?: number;
        occurred_at?: string;
      };

      if (!memberRef || !memberRef.trim()) {
        return { error: "Member name or ID must not be empty." };
      }

      if (!summary || !summary.trim()) {
        return { error: "Summary must not be empty. Describe what happened and why it mattered." };
      }

      const resolved = resolveMember(db, memberRef);
      if (!resolved) {
        return {
          error:
            `Member '${memberRef.trim()}' not found. ` +
            "Use pack_sense without arguments to see all members.",
        };
      }

      let occurredAt: number | undefined;
      if (occurredAtStr) {
        const parsed = Date.parse(occurredAtStr);
        if (Number.isNaN(parsed)) {
          return { error: `Invalid date "${occurredAtStr}". Use YYYY-MM-DD format.` };
        }
        occurredAt = parsed;
      }

      try {
        const ix = noteInteraction(db, {
          memberId: resolved.id,
          kind: kind ?? "conversation",
          summary: summary.trim(),
          significance: significance !== undefined ? Math.max(0, Math.min(1, significance)) : 0.5,
          occurredAt,
        });

        const ixCount = countInteractions(db, resolved.id);

        return {
          interaction: formatInteraction(ix),
          member_interactions: ixCount,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to record interaction: ${detail}` };
      }
    },
  });
}
