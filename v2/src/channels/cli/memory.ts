import { defineCommand } from "citty";
import { countMemories, staleMemories } from "../../core/memory/index.ts";
import { defaultChatFactory } from "../../harness/chat_factory.ts";
import { resolveModel } from "../../harness/model.ts";
import { executeCommand } from "../../harness/oneshots/execute_command.ts";
import { style } from "../../lib/terminal/index.ts";
import memoryList from "./memory_list.ts";
import memorySearch from "./memory_search.ts";
import memoryShow from "./memory_show.ts";
import { withRunDb } from "./with_run_db.ts";

function showOverview(db: import("../../lib/index.ts").DatabaseHandle): void {
  const counts = countMemories(db);
  const staleCount = staleMemories(db, 1000).length;
  console.log(style.dim(`${counts.active} active / ${counts.total} total (${staleCount} stale)`));
}

export default defineCommand({
  meta: {
    name: "memory",
    description:
      'Browse and manage memories. Usage: memory [subcommand] or memory "instruction" or memory <id> "instruction"',
  },
  args: {
    model: {
      type: "string",
      alias: "m",
      description: "Model override for commands",
    },
  },
  subCommands: {
    list: memoryList,
    search: memorySearch,
    show: memoryShow,
  },
  async run({ args }) {
    const positionals = (args._ ?? []) as string[];

    if (positionals.length === 0) {
      await withRunDb((db) => showOverview(db));
      return;
    }

    let memoryId: number | undefined;
    let textParts: string[];
    const first = positionals[0];

    if (/^\d+$/.test(first) && positionals.length > 1) {
      memoryId = Number(first);
      textParts = positionals.slice(1);
    } else {
      textParts = positionals;
    }

    const text = textParts.join(" ");
    if (!text.trim()) {
      await withRunDb((db) => showOverview(db));
      return;
    }

    await withRunDb(async (db) => {
      const model = resolveModel(db, args.model as string | undefined);
      console.log(style.dim("processing..."));

      const result = await executeCommand(db, model, defaultChatFactory, {
        text,
        channel: "cli",
        memoryId,
      });

      if (result.acted) {
        console.log(style.cyan("done".padStart(10)), ` ${result.response}`);
      } else {
        console.log(style.yellow("info".padStart(10)), ` ${result.response}`);
      }
      console.log(style.dim(`  $${result.cost.toFixed(4)} (session #${result.sessionId})`));
    });
  },
});
