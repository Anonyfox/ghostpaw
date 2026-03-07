import { defineCommand } from "citty";
import type { MemberKind } from "../../core/pack/index.ts";
import { getMemberByName, meetMember } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "meet", description: "Record a new being in the pack" },
  args: {
    name: {
      type: "positional",
      description: "Name for the new pack member",
      required: true,
    },
    kind: {
      type: "string",
      description: "Kind: human, ghostpaw, agent, service, other (default: human)",
    },
    bond: {
      type: "string",
      description: "Initial bond narrative",
    },
    "is-user": {
      type: "boolean",
      description: "Mark this member as the primary human user",
    },
  },
  async run({ args }) {
    const name = (args._ ?? [])[0] || (args.name as string);
    if (!name?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const existing = getMemberByName(db, name.trim());
      if (existing) {
        console.error(
          style.boldRed("error".padStart(10)),
          ` A member named "${existing.name}" already exists (id #${existing.id}).`,
        );
        process.exitCode = 1;
        return;
      }

      try {
        const member = meetMember(db, {
          name: name.trim(),
          kind: (args.kind as MemberKind) ?? "human",
          bond: args.bond as string | undefined,
          isUser: (args["is-user"] as boolean | undefined) ?? false,
        });

        console.log(
          style.cyan("met".padStart(10)),
          ` #${member.id} "${member.name}" (${member.kind})`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
