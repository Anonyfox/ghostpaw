import { createTool, Schema } from "chatoyant";
import { listLinkedMembers, listLinks, resolveNames } from "../../core/pack/api/read/index.ts";
import { addLink, deactivateLink, removeLink } from "../../core/pack/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMember } from "./resolve.ts";

class PackLinkParams extends Schema {
  action = Schema.Enum(["add", "remove", "deactivate", "list"] as const, {
    description:
      "What to do: 'add' a link, 'remove' a link permanently, " +
      "'deactivate' a link (mark as former), or 'list' links for a member.",
  });
  member = Schema.String({
    description: "Name or ID of the source member.",
  });
  target = Schema.String({
    optional: true,
    description: "Name or ID of the target member. Required for add/remove/deactivate.",
  });
  label = Schema.String({
    optional: true,
    description:
      "Relationship label, e.g. 'works-at', 'manages', 'parent-of', 'member-of', " +
      "'married-to', 'subsidiary-of', 'client-of', 'mentors', 'reports-to'. " +
      "Required for add/remove/deactivate.",
  });
  role = Schema.String({
    optional: true,
    description: "Optional role qualifier, e.g. 'CTO', 'team-lead'. Only used with 'add'.",
  });
}

export function createPackLinkTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_link",
    description:
      "Manage relationships between pack members. Create, remove, deactivate, or list " +
      "directional links with labels like 'works-at', 'manages', 'parent-of', 'member-of'. " +
      "Use 'deactivate' to mark a link as former (e.g. someone who left a company) " +
      "instead of 'remove' which deletes it entirely.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackLinkParams() as any,
    execute: async ({ args }) => {
      const {
        action,
        member: memberRef,
        target: targetRef,
        label,
        role,
      } = args as {
        action: "add" | "remove" | "deactivate" | "list";
        member: string;
        target?: string;
        label?: string;
        role?: string;
      };

      const source = resolveMember(db, memberRef);
      if (!source) {
        return { error: `Member '${memberRef}' not found.` };
      }

      if (action === "list") {
        const outgoing = listLinks(db, source.id);
        const incoming = listLinkedMembers(db, source.id);
        const allIds = [...outgoing.map((l) => l.targetId), ...incoming.map((l) => l.memberId)];
        const nameMap = resolveNames(db, allIds);
        return {
          outgoing: outgoing.map((l) => ({
            target: nameMap.get(l.targetId) ?? `#${l.targetId}`,
            label: l.label,
            role: l.role,
            active: l.active,
          })),
          incoming: incoming.map((l) => ({
            source: nameMap.get(l.memberId) ?? `#${l.memberId}`,
            label: l.label,
            role: l.role,
            active: l.active,
          })),
        };
      }

      if (!targetRef || !targetRef.trim()) {
        return { error: `Target member is required for '${action}'.` };
      }
      if (!label || !label.trim()) {
        return { error: `Label is required for '${action}' (e.g. 'works-at', 'manages').` };
      }

      const target = resolveMember(db, targetRef);
      if (!target) {
        return { error: `Target member '${targetRef}' not found.` };
      }

      try {
        if (action === "add") {
          const link = addLink(db, source.id, target.id, label, role);
          return {
            link: {
              source: source.name,
              target: target.name,
              label: link.label,
              role: link.role,
              active: link.active,
            },
          };
        }
        if (action === "deactivate") {
          deactivateLink(db, source.id, target.id, label);
          return {
            deactivated: true,
            source: source.name,
            target: target.name,
            label: label.trim().toLowerCase(),
          };
        }
        removeLink(db, source.id, target.id, label);
        return { removed: true, source: source.name, target: target.name, label };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Link operation failed: ${detail}` };
      }
    },
  });
}
