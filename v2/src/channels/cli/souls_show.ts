import { defineCommand } from "citty";
import { getLevelHistory, getTraitLimit, listTraits, resolveSoul } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "show", description: "Show soul details" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name (e.g. 2, 'JS Engineer')",
      required: true,
    },
  },
  async run({ args }) {
    const soulArg = (args._ ?? []).join(" ") || (args.name as string);
    if (!soulArg?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Soul ID or name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const soul = resolveSoul(db, soulArg);
      if (!soul) {
        console.error(style.boldRed("error".padStart(10)), ` Soul "${soulArg}" not found.`);
        process.exitCode = 1;
        return;
      }

      const traitLimit = getTraitLimit(db);
      const traits = listTraits(db, soul.id);
      const active = traits.filter((t) => t.status === "active");
      const levels = getLevelHistory(db, soul.id);

      console.log(style.cyan(`# ${soul.name}`));
      if (soul.description) console.log(style.dim(soul.description));
      console.log();
      console.log(`Level: ${soul.level}`);
      console.log(`Traits: ${active.length}/${traitLimit}`);
      console.log();

      if (soul.essence) {
        console.log(style.dim("── Essence ──"));
        console.log(soul.essence);
        console.log();
      }

      if (active.length > 0) {
        console.log(style.dim("── Active Traits ──"));
        for (const t of active) {
          console.log(`  [#${t.id}] ${t.principle}`);
          console.log(style.dim(`         ${t.provenance}`));
        }
        console.log();
      }

      const reverted = traits.filter((t) => t.status === "reverted");
      if (reverted.length > 0) {
        console.log(style.dim("── Reverted Traits ──"));
        for (const t of reverted) {
          console.log(style.dim(`  [#${t.id}] ${t.principle}`));
        }
        console.log();
      }

      if (levels.length > 0) {
        console.log(style.dim("── Level History ──"));
        for (const l of levels) {
          const date = new Date(l.createdAt).toISOString().slice(0, 10);
          console.log(`  Level ${l.level} (${date})`);
        }
      }
    });
  },
});
