import { createTool, Schema } from "chatoyant";
import { listContacts, MEMBER_STATUSES, updateBond } from "../../core/pack/index.ts";
import type { MemberStatus, UpdateBondInput } from "../../core/pack/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemberDetail } from "./format_pack.ts";
import { resolveMember } from "./resolve.ts";

class PackBondParams extends Schema {
  member = Schema.String({
    description: "Name or numeric ID of the member to update.",
  });
  bond = Schema.String({
    optional: true,
    description: "New bond narrative — a description of the relationship.",
  });
  trust = Schema.Number({
    optional: true,
    description: "New trust level from 0 (stranger) to 1 (absolute trust). Example: 0.85",
  });
  status = Schema.Enum(MEMBER_STATUSES, {
    optional: true,
    description: "New status: 'active', 'dormant', or 'lost'.",
  });
  name = Schema.String({
    optional: true,
    description: "Rename the member.",
  });
  is_user = Schema.Boolean({
    optional: true,
    description:
      "Mark this member as the primary human user. Only one active member can be the user.",
  });
}

export function createPackBondTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_bond",
    description:
      "Update a pack member's bond narrative, trust level, status, name, or user flag. " +
      "Pass the member by name or ID and at least one field to change. Returns the updated " +
      "profile with a summary of what changed.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackBondParams() as any,
    execute: async ({ args }) => {
      const {
        member: memberRef,
        bond,
        trust,
        status,
        name,
        is_user: isUser,
      } = args as {
        member: string;
        bond?: string;
        trust?: number;
        status?: MemberStatus;
        name?: string;
        is_user?: boolean;
      };

      if (!memberRef || !memberRef.trim()) {
        return { error: "Member name or ID must not be empty." };
      }

      const resolved = resolveMember(db, memberRef);
      if (!resolved) {
        return {
          error:
            `Member '${memberRef.trim()}' not found. ` +
            "Use pack_sense without arguments to see all members.",
        };
      }

      const hasChanges =
        bond !== undefined ||
        trust !== undefined ||
        status !== undefined ||
        name !== undefined ||
        isUser !== undefined;
      if (!hasChanges) {
        return {
          error: "No changes provided. Pass at least one of: bond, trust, status, name, is_user.",
        };
      }

      const changes: string[] = [];
      const input: UpdateBondInput = {};

      if (bond !== undefined) {
        input.bond = bond;
        changes.push("bond updated");
      }
      if (trust !== undefined) {
        const clamped = Math.max(0, Math.min(1, trust));
        input.trust = clamped;
        changes.push(`trust: ${resolved.trust.toFixed(2)} -> ${clamped.toFixed(2)}`);
      }
      if (status !== undefined) {
        input.status = status;
        changes.push(`status: ${resolved.status} -> ${status}`);
      }
      if (name !== undefined) {
        input.name = name;
        changes.push(`name: ${resolved.name} -> ${name.trim()}`);
      }
      if (isUser !== undefined) {
        input.isUser = isUser;
        changes.push(`is_user: ${resolved.isUser} -> ${isUser}`);
      }

      try {
        const updated = updateBond(db, resolved.id, input);
        const ixRows = db
          .prepare(
            "SELECT * FROM pack_interactions WHERE member_id = ? ORDER BY created_at DESC LIMIT 10",
          )
          .all(resolved.id) as Record<string, unknown>[];

        const { rowToInteraction } = await import("../../core/pack/index.ts");
        const interactions = ixRows.map(rowToInteraction);
        const contacts = listContacts(db, resolved.id);
        const now = Date.now();

        return {
          member: formatMemberDetail(updated, interactions, now, contacts),
          changes,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to update member: ${detail}` };
      }
    },
  });
}
