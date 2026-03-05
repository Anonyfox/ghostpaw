import { defineCommand } from "citty";
import type { InteractionKind } from "../../core/pack/index.ts";
import { listInteractions, noteInteraction } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { resolveMember } from "./resolve_member.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "note", description: "Record a meaningful interaction with a pack member" },
  args: {
    member: {
      type: "positional",
      description: "Member ID (number) or name (string)",
      required: true,
    },
    summary: {
      type: "positional",
      description: "What happened and why it mattered",
      required: true,
    },
    kind: {
      type: "string",
      description:
        "Interaction kind: conversation, correction, conflict, gift, milestone, observation (default: conversation)",
    },
    significance: {
      type: "string",
      description: "How much this changed the bond, 0.0 to 1.0 (default: 0.5)",
    },
  },
  async run({ args }) {
    const positionals = args._ ?? [];
    const ref = positionals[0] || (args.member as string);
    if (!ref?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Member ID or name is required.");
      process.exitCode = 1;
      return;
    }

    const summary = positionals.slice(1).join(" ") || (args.summary as string);
    if (!summary?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Summary text is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const member = resolveMember(db, ref);
      if (!member) {
        console.error(style.boldRed("error".padStart(10)), ` Member "${ref}" not found.`);
        process.exitCode = 1;
        return;
      }

      try {
        const significance = args.significance
          ? Number.parseFloat(args.significance as string)
          : undefined;

        const interaction = noteInteraction(db, {
          memberId: member.id,
          kind: (args.kind as InteractionKind) ?? "conversation",
          summary: summary.trim(),
          significance,
        });

        const total = listInteractions(db, member.id, { limit: 1000 }).length;
        console.log(
          style.cyan("noted".padStart(10)),
          ` #${interaction.id} [${interaction.kind}] for "${member.name}" (${total} total interactions)`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
