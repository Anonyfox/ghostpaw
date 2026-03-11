import { defineCommand } from "citty";
import { recallMemories } from "../../core/memory/api/read/index.ts";
import type { MemoryCategory } from "../../core/memory/api/types.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "search", description: "Search memories by semantic similarity" },
  args: {
    query: {
      type: "positional",
      description: "Natural language search query",
      required: true,
    },
    category: {
      type: "string",
      description: "Filter by category: preference, fact, procedure, capability, custom",
    },
    limit: {
      type: "string",
      description: "Maximum results (default: 20)",
    },
  },
  async run({ args }) {
    const query = (args._ ?? []).join(" ") || (args.query as string);
    if (!query?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Search query is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 20;
      const results = recallMemories(db, query.trim(), {
        k: limit,
        category: args.category as MemoryCategory | undefined,
      });

      if (results.length === 0) {
        console.log(style.dim("No matching memories found."));
        return;
      }

      console.log(style.dim(`${results.length} results for "${query.trim()}":`));
      console.log();

      for (const m of results) {
        const id = `#${m.id}`.padStart(6);
        const score = `${Math.round(m.similarity * 100)}%`.padStart(4);
        const claim = m.claim.length > 60 ? `${m.claim.slice(0, 59)}…` : m.claim;
        const conf = m.confidence.toFixed(2);
        console.log(`${style.dim(id)} ${style.cyan(score)} ${claim}`);
        console.log(
          `${" ".repeat(12)}${style.dim(`[${m.category}] confidence: ${conf} evidence: ${m.evidenceCount}`)}`,
        );
      }
    });
  },
});
