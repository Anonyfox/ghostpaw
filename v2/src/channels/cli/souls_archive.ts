import { defineCommand } from "citty";
import { deleteSoul, isMandatorySoulId, resolveSoul } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "archive", description: "Archive (soft-delete) a custom soul" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name to archive",
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

      if (isMandatorySoulId(soul.id)) {
        console.error(
          style.boldRed("error".padStart(10)),
          ` "${soul.name}" is a mandatory soul and cannot be archived.`,
        );
        process.exitCode = 1;
        return;
      }

      try {
        deleteSoul(db, soul.id);
        console.log(style.cyan("archived".padStart(10)), ` "${soul.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
