import { defineCommand } from "citty";
import type { MemberStatus } from "../../core/pack/index.ts";
import { updateBond } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { resolveMember } from "./resolve_member.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "bond", description: "Update a pack member's bond, trust, status, or metadata" },
  args: {
    member: {
      type: "positional",
      description: "Member ID (number) or name (string)",
      required: true,
    },
    bond: {
      type: "string",
      description: "New bond narrative text",
    },
    trust: {
      type: "string",
      description: "New trust value (0.0 to 1.0)",
    },
    status: {
      type: "string",
      description: "New status: active, dormant, lost",
    },
    name: {
      type: "string",
      description: "Rename the member",
    },
    metadata: {
      type: "string",
      description: "JSON metadata to merge",
    },
  },
  async run({ args }) {
    const ref = (args._ ?? [])[0] || (args.member as string);
    if (!ref?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Member ID or name is required.");
      process.exitCode = 1;
      return;
    }

    const hasBond = args.bond !== undefined;
    const hasTrust = args.trust !== undefined;
    const hasStatus = args.status !== undefined;
    const hasName = args.name !== undefined;
    const hasMetadata = args.metadata !== undefined;

    if (!hasBond && !hasTrust && !hasStatus && !hasName && !hasMetadata) {
      console.error(
        style.boldRed("error".padStart(10)),
        " At least one of --bond, --trust, --status, --name, or --metadata is required.",
      );
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const before = resolveMember(db, ref);
      if (!before) {
        console.error(style.boldRed("error".padStart(10)), ` Member "${ref}" not found.`);
        process.exitCode = 1;
        return;
      }

      try {
        const input: Record<string, unknown> = {};
        if (hasBond) input.bond = args.bond as string;
        if (hasTrust) input.trust = Number.parseFloat(args.trust as string);
        if (hasStatus) input.status = args.status as MemberStatus;
        if (hasName) input.name = args.name as string;
        if (hasMetadata) input.metadata = args.metadata as string;

        const after = updateBond(db, before.id, input);

        const changes: string[] = [];
        if (hasBond) changes.push("bond");
        if (hasTrust) changes.push(`trust ${before.trust.toFixed(2)} -> ${after.trust.toFixed(2)}`);
        if (hasStatus) changes.push(`status ${before.status} -> ${after.status}`);
        if (hasName) changes.push(`name "${before.name}" -> "${after.name}"`);
        if (hasMetadata) changes.push("metadata");

        console.log(
          style.cyan("updated".padStart(10)),
          ` #${after.id} "${after.name}" (${changes.join(", ")})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
