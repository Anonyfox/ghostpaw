import { defineCommand } from "citty";
import { getTraitLimit, listDormantSouls, listSouls } from "../../core/souls/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "list", description: "List all souls" },
  args: {
    dormant: {
      type: "boolean",
      description: "Show dormant souls instead of active ones",
      default: false,
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const souls = args.dormant ? listDormantSouls(db) : listSouls(db);
      const traitLimit = getTraitLimit(db);
      const label = args.dormant ? " (dormant)" : "";

      if (souls.length === 0) {
        console.log(style.dim(`No souls found${label}.`));
        return;
      }

      const header = `${"ID".padStart(4)} ${"Name".padEnd(20)} ${"Lvl".padStart(4)} ${"Traits".padStart(8)} Description`;
      console.log(style.dim(header + label));
      console.log(style.dim("─".repeat(84)));

      for (const s of souls) {
        const id = String(s.id).padStart(4);
        const name = s.name.padEnd(20);
        const level = String(s.level).padStart(4);
        const traits = `${s.activeTraitCount}/${traitLimit}`.padStart(8);
        const desc = s.description ? s.description.slice(0, 40) : "";
        console.log(`${style.dim(id)} ${style.cyan(name)} ${level} ${traits} ${style.dim(desc)}`);
      }
    });
  },
});
