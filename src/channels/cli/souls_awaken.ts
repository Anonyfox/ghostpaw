import { defineCommand } from "citty";
import { getSoul, listDormantSouls } from "../../core/souls/api/read/index.ts";
import { awakenSoulEntry } from "../../harness/public/souls.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function findDormantSoul(
  db: Parameters<typeof getSoul>[0],
  input: string,
): ReturnType<typeof getSoul> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    const soul = getSoul(db, asNumber);
    return soul?.deletedAt != null ? soul : null;
  }

  const dormant = listDormantSouls(db);
  const match = dormant.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (!match) return null;
  return getSoul(db, match.id);
}

export default defineCommand({
  meta: { name: "awaken", description: "Awaken a dormant soul" },
  args: {
    name: {
      type: "positional",
      description: "Dormant soul ID or name to awaken",
      required: true,
    },
    as: {
      type: "string",
      description: "Optional new name (to avoid conflicts with existing souls)",
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
      const soul = findDormantSoul(db, soulArg);
      if (!soul) {
        console.error(style.boldRed("error".padStart(10)), ` Dormant soul "${soulArg}" not found.`);
        process.exitCode = 1;
        return;
      }

      try {
        const newName = (args.as as string | undefined)?.trim() || undefined;
        const awakened = awakenSoulEntry(db, soul.id, newName);
        console.log(style.cyan("awakened".padStart(10)), ` "${awakened.name}"`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
