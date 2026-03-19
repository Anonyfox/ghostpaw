import { defineCommand } from "citty";
import { setConfigValue } from "../../harness/public/settings/config.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "set-limit", description: "Set daily cost limit (0 = unlimited)" },
  args: {
    amount: {
      type: "positional",
      description: "Daily USD limit (0 for unlimited)",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.amount as string);
    const amount = Number(raw);
    if (Number.isNaN(amount) || amount < 0) {
      console.error(style.boldRed("error".padStart(10)), " Amount must be a non-negative number.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      setConfigValue(db, "max_cost_per_day", String(amount), "cli");
      const label = amount > 0 ? `$${amount.toFixed(2)}` : "unlimited";
      console.log(style.cyan("set".padStart(10)), ` daily limit: ${label}`);
    });
  },
});
