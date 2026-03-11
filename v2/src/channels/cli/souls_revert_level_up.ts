import { defineCommand } from "citty";
import { resolveSoul } from "../../core/souls/api/read/index.ts";
import { revertSoulLevel } from "../../harness/public/souls.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: {
    name: "revert-level-up",
    description: "Emergency: revert the last level-up (direct, no mentor)",
  },
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

      try {
        const reverted = revertSoulLevel(db, soul.id);
        console.log(
          style.cyan("reverted".padStart(10)),
          ` "${reverted.name}" back to level ${reverted.level}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
