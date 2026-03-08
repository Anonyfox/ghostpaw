import { createTool, Schema } from "chatoyant";
import { mergeMember } from "../../core/pack/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMember } from "./resolve.ts";

class PackMergeParams extends Schema {
  keep = Schema.String({
    description: "Name or ID of the member to keep.",
  });
  merge = Schema.String({
    description: "Name or ID of the member to merge into the kept member (will be marked 'lost').",
  });
}

export function createPackMergeTool(db: DatabaseHandle) {
  return createTool({
    name: "pack_merge",
    description:
      "Merge two pack members that represent the same being. The 'keep' member survives " +
      "with combined interactions, contacts, fields, links, bond narratives, and the higher trust. " +
      "The 'merge' member is marked 'lost'. No information is destroyed.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PackMergeParams() as any,
    execute: async ({ args }) => {
      const { keep: keepRef, merge: mergeRef } = args as { keep: string; merge: string };

      const keepMember = resolveMember(db, keepRef);
      if (!keepMember) {
        return { error: `Keep member '${keepRef}' not found.` };
      }

      const mergeMemberResolved = resolveMember(db, mergeRef);
      if (!mergeMemberResolved) {
        return { error: `Merge member '${mergeRef}' not found.` };
      }

      try {
        const result = mergeMember(db, keepMember.id, mergeMemberResolved.id);
        return {
          merged: true,
          kept: { id: result.id, name: result.name, trust: result.trust },
          lost: { id: mergeMemberResolved.id, name: mergeMemberResolved.name },
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
