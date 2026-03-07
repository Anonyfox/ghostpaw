import { defineCommand } from "citty";
import { isMandatorySoulId, resolveSoul, retireSoul } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "retire", description: "Retire a custom soul (preserves full history)" },
  args: {
    name: {
      type: "positional",
      description: "Soul ID or name to retire",
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
          ` "${soul.name}" is a core soul and cannot be retired.`,
        );
        process.exitCode = 1;
        return;
      }

      try {
        retireSoul(db, soul.id);
        console.log(style.cyan("retired".padStart(10)), ` "${soul.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
