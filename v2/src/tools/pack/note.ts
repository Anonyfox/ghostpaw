import { createTool, Schema } from "chatoyant";
import { INTERACTION_KINDS, noteInteraction } from "../../core/pack/index.ts";
import type { InteractionKind } from "../../core/pack/types.ts";
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
      "'milestone', or 'observation'. Default: 'conversation'.",
  });
  significance = Schema.Number({
    optional: true,
    description:
      "How significant was this interaction, from 0 (trivial) to 1 (life-changing). " +
      "Default: 0.5.",
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
      } = args as {
        member: string;
        summary: string;
        kind?: InteractionKind;
        significance?: number;
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

      try {
        const ix = noteInteraction(db, {
          memberId: resolved.id,
          kind: kind ?? "conversation",
          summary: summary.trim(),
          significance: significance !== undefined ? Math.max(0, Math.min(1, significance)) : 0.5,
        });

        const ixCount = (
          db
            .prepare("SELECT COUNT(*) AS c FROM pack_interactions WHERE member_id = ?")
            .get(resolved.id) as { c: number }
        ).c;

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
